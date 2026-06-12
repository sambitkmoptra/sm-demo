import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional
from google.adk import Agent
from google.adk.runners import InMemoryRunner
from google.genai import types

from agents.firestore import FirestoreStateMirror
from agents.agent import ResearchAgent, CopywriterAgent, get_model_name
from agents.rag_search import VertexRAGManager

logger = logging.getLogger(__name__)

class OrchestratorAgent(Agent):
    """
    Orchestrator Agent defined via the Google Agent Development Kit (ADK).
    Handles dynamic routing and sequencing of multi-agent campaign pipelines.
    """
    def __init__(
        self, 
        name: str = "orchestrator_agent", 
        model: str = "gemini-2.5-flash", 
        instruction: Optional[str] = None
    ):
        default_instruction = (
            "You are the campaign orchestrator. Guide marketing requests through the proper steps "
            "depending on the toggled capabilities in the workflow options."
        )
        super().__init__(
            name=name,
            model=get_model_name(model),
            instruction=instruction or default_instruction
        )
        # Use private attribute prefix to bypass Pydantic model validations
        self._state_mirror = FirestoreStateMirror()
        self._research_agent = ResearchAgent()
        self._copywriter_agent = CopywriterAgent()
        self._project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "default-project")

    async def _run_runner_with_retry(
        self,
        runner: InMemoryRunner,
        user_id: str,
        session_id: str,
        user_msg: types.Content,
        max_retries: int = 3,
        initial_delay: float = 5.0
    ) -> str:
        """
        Runs an ADK InMemoryRunner with retries and exponential backoff.
        Gracefully handles 429 Rate Limits / Resource Exhausted errors from Gemini/Vertex.
        """
        delay = initial_delay
        for attempt in range(1, max_retries + 1):
            logger.info(
                f"[AGENT RUNNER DEBUG] Starting attempt {attempt}/{max_retries} "
                f"for agent '{runner.agent.name}' (Session: '{session_id}')..."
            )
            try:
                output = ""
                async for event in runner.run_async(
                    user_id=user_id,
                    session_id=session_id,
                    new_message=user_msg
                ):
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                output += part.text
                
                logger.info(
                    f"[AGENT RUNNER DEBUG] Attempt {attempt} for '{runner.agent.name}' "
                    f"completed successfully. Output size: {len(output)} chars."
                )
                return output
                
            except Exception as e:
                err_msg = str(e).lower()
                is_rate_limit = (
                    "429" in err_msg or 
                    "resource_exhausted" in err_msg or 
                    "rate_limit" in err_msg or 
                    "quota" in err_msg or 
                    "limit exceeded" in err_msg
                )
                
                logger.warning(
                    f"[AGENT RUNNER WARNING] Attempt {attempt}/{max_retries} failed for "
                    f"'{runner.agent.name}'. Exception type: {type(e).__name__}, Message: '{e}'"
                )
                
                if is_rate_limit and attempt < max_retries:
                    logger.warning(
                        f"[AGENT RUNNER RATE_LIMIT] Detected 429 Resource Exhausted. "
                        f"Retrying in {delay} seconds (exponential backoff)..."
                    )
                    await asyncio.sleep(delay)
                    delay *= 2.0
                else:
                    logger.error(
                        f"[AGENT RUNNER FATAL] runner failed permanently for '{runner.agent.name}' "
                        f"on attempt {attempt} or hit non-rate-limit error.",
                        exc_info=True
                    )
                    raise e
        
        raise RuntimeError(f"Runner '{runner.agent.name}' failed after {max_retries} attempts.")

    async def run_campaign_pipeline(
        self, 
        campaign_id: str, 
        prompt: str, 
        workflow_options: Dict[str, Any], 
        brand_kit: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes the campaign workflow steps conditionally based on options config.
        Syncs state checkpoints to Firestore and outputs execution traces.
        """
        logger.info(f"Campaign pipeline run started for ID: {campaign_id}")
        
        # Initialize campaign document in Firestore
        self._state_mirror.initialize_campaign_session(campaign_id, workflow_options)

        # 1. Research Step
        research_output = ""
        parsed_research = {}
        if workflow_options.get("runResearch", True):
            status_msg = "Researching Web Trends via Google Search..."
            logger.info(f"[{campaign_id}] {status_msg}")
            self._state_mirror.update_step_status(
                campaign_id, 
                "RESEARCHING", 
                {"logs": [{"step": "RESEARCHING", "message": status_msg}]}
            )
            
            try:
                # Specify app_name="agents" and auto_create_session=True to map dynamically
                research_runner = InMemoryRunner(agent=self._research_agent, app_name="agents")
                research_runner.auto_create_session = True
                
                user_msg = types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=f"Find web trends, competitor context, and market data for: {prompt}")]
                )
                
                # Execute with retry wrapper and debug logs
                research_output = await self._run_runner_with_retry(
                    runner=research_runner,
                    user_id="campaign_user",
                    session_id=f"session_research_{campaign_id}",
                    user_msg=user_msg
                )
                
                # Parse structured JSON output from Research agent
                try:
                    clean_json = research_output.strip()
                    if clean_json.startswith("```json"):
                        clean_json = clean_json[7:]
                    if clean_json.endswith("```"):
                        clean_json = clean_json[:-3]
                    clean_json = clean_json.strip()
                    
                    parsed_research = json.loads(clean_json)
                except Exception as parse_err:
                    logger.warning(f"JSON parsing failed for Research response: {parse_err}. Falling back to text wrapper.")
                    parsed_research = {
                        "trends": ["Could not parse trends"],
                        "competitors": ["Could not parse competitors"],
                        "market_data": ["Could not parse market data"],
                        "summary": research_output
                    }
                
                self._state_mirror.update_step_status(
                    campaign_id,
                    "RESEARCHING",
                    {
                        "research_summary": parsed_research.get("summary", ""),
                        "research_data": parsed_research,
                        "logs": [{"step": "RESEARCHING", "message": "Research summary successfully compiled."}]
                    }
                )
            except Exception as e:
                logger.error(f"Research agent invocation failed for campaign {campaign_id}: {e}", exc_info=True)
                self._state_mirror.update_step_status(
                    campaign_id,
                    "FAILED",
                    {"logs": [{"step": "FAILED", "message": f"Research step failed: {str(e)}"}]}
                )
                raise e
        else:
            status_msg = "Skipping research step..."
            logger.info(f"[{campaign_id}] {status_msg}")
            self._state_mirror.update_step_status(
                campaign_id, 
                "RESEARCHING", 
                {"logs": [{"step": "RESEARCHING", "message": status_msg}]}
            )

        # 2. Copywriting Step
        parsed_output = {}
        
        # Check toggles sequentially (runCopywriter overrides, runCopy acts as alternative)
        run_copy = workflow_options.get("runCopywriter", True)
        if "runCopy" in workflow_options:
            run_copy = workflow_options["runCopy"]
        
        if run_copy:
            status_msg = "Generating grounded omnichannel copywriting bundle..."
            logger.info(f"[{campaign_id}] {status_msg}")
            self._state_mirror.update_step_status(
                campaign_id, 
                "COPYWRITING", 
                {"logs": [{"step": "COPYWRITING", "message": status_msg}]}
            )
            
            # Setup copywriting instructions (without tools to prevent extra rate-limiting loops)
            copywriter_tools = []
            copywriter_instruction = (
                "You are an enterprise brand copywriter. Ingest the provided brand kit guidelines "
                "extracted from the brand manual, and the research context. "
                "Compose and format all 6 campaign assets simultaneously into the required OmnichannelCampaignBundle schema:\n"
                "1. A highly structured long-form technical blog post (containing sections, and competitor analysis of top 5 to 10 competitors if found).\n"
                "2. A professional authority-building LinkedIn post (narrative and visual prompt).\n"
                "3. An engaging community Facebook post (narrative and visual prompt).\n"
                "4. A visual-first Pinterest prompt.\n"
                "5. A sequential Instagram carousel (array of slides with text and visual prompts).\n"
                "6. A timed multi-frame script for Shorts/Reels (timestamp, voiceover, and visual description).\n"
                "Strictly output a valid JSON object matching the target schema."
            )
            
            rag_context = ""
            # Extract RAG data store parameters
            data_store_id = brand_kit.get("data_store_id")
            if data_store_id:
                rag_status_msg = "Querying Enterprise Brand Manual via Vertex AI Search..."
                logger.info(f"[{campaign_id}] {rag_status_msg}")
                self._state_mirror.update_step_status(
                    campaign_id,
                    "COPYWRITING",
                    {"logs": [{"step": "COPYWRITING", "message": rag_status_msg}]}
                )
                
                try:
                    project_id = self._project_id
                    location = brand_kit.get("location", "global")
                    
                    # Manually query data store via SDK to bypass model tool-call loops (saves model API quota)
                    rag_context = VertexRAGManager.manual_search(
                        project_id=project_id,
                        data_store_id=data_store_id,
                        search_query=prompt,
                        location=location
                    )
                    
                except Exception as rag_err:
                    logger.error(f"Failed to query manual RAG search for campaign {campaign_id}: {rag_err}", exc_info=True)
                    self._state_mirror.update_step_status(
                        campaign_id,
                        "FAILED",
                        {"logs": [{"step": "FAILED_RAG_LOOKUP", "message": f"Failed to connect Vertex RAG: {str(rag_err)}"}]}
                    )
                    raise rag_err
            
            try:
                copywriter_prompt = (
                    f"Brand Kit Guidelines:\n"
                    f"- Name: {brand_kit.get('brand_name', 'Default Brand')}\n"
                    f"- Details: {brand_kit}\n\n"
                    f"{rag_context}\n\n"
                    f"Research Summary Context:\n"
                    f"{parsed_research.get('summary', '') or 'No research summary context provided.'}\n"
                    f"Detailed Structured Research:\n"
                    f"{parsed_research or 'No detailed structured research provided.'}\n\n"
                    f"Campaign Brief Prompt:\n"
                    f"{prompt}"
                )
                
                logger.info(
                    f"[{campaign_id}] Copywriter prompt assembled. Length: {len(copywriter_prompt)} characters. "
                    f"RAG context active: {bool(rag_context)}"
                )
                
                # Instantiate CopywriterAgent with dynamic instructions
                dynamic_copywriter = CopywriterAgent(
                    tools=copywriter_tools,
                    instruction=copywriter_instruction
                )
                
                # Specify app_name="agents" and auto_create_session=True to map dynamically
                copywriter_runner = InMemoryRunner(agent=dynamic_copywriter, app_name="agents")
                copywriter_runner.auto_create_session = True
                
                user_msg = types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=copywriter_prompt)]
                )
                
                # Execute with retry wrapper and debug logs
                copywriter_output_raw = await self._run_runner_with_retry(
                    runner=copywriter_runner,
                    user_id="campaign_user",
                    session_id=f"session_copy_{campaign_id}",
                    user_msg=user_msg
                )
                
                # Parse structured JSON output
                try:
                    clean_json = copywriter_output_raw.strip()
                    if clean_json.startswith("```json"):
                        clean_json = clean_json[7:]
                    if clean_json.endswith("```"):
                        clean_json = clean_json[:-3]
                    clean_json = clean_json.strip()
                    
                    parsed_output = json.loads(clean_json)
                except Exception as parse_err:
                    logger.warning(f"JSON parsing failed for Copywriter response: {parse_err}. Falling back to text wrapper.")
                    parsed_output = {
                        "blog": {
                            "title": "Campaign Launch",
                            "introduction": "Intro overview",
                            "sections": [{"heading": "Main Section", "content": copywriter_output_raw, "takeaways": ["Takeaway"]}],
                            "competitors": [{"name": "Competitor", "details": "competitor details"}],
                            "conclusion": "Conclusion body"
                        },
                        "linkedin_post": {"narrative": copywriter_output_raw, "visual_prompt": "Fallback visual prompt"},
                        "facebook_post": {"narrative": copywriter_output_raw, "visual_prompt": "Fallback visual prompt"},
                        "pinterest_prompt": "Fallback pinterest prompt",
                        "instagram_carousal": [{"slide_text": copywriter_output_raw, "visual_prompt": "Fallback visual prompt"}],
                        "shorts_reels_script": [{"timestamp": "0:00", "voiceover": copywriter_output_raw, "visual_description": "Fallback visual description"}]
                    }
                
                # Commit the omnichannel variants dictionary directly to Firestore and set to PENDING_REVIEW
                self._state_mirror.update_step_status(
                    campaign_id, 
                    "PENDING_REVIEW", 
                    {
                        "variants": parsed_output,
                        "logs": [{"step": "COPYWRITING", "message": "Omni-channel text bundle successfully generated."}]
                    }
                )
            except Exception as e:
                logger.error(f"Copywriter agent invocation failed for campaign {campaign_id}: {e}", exc_info=True)
                self._state_mirror.update_step_status(
                    campaign_id,
                    "FAILED",
                    {"logs": [{"step": "FAILED", "message": f"Copywriting step failed: {str(e)}"}]}
                )
                raise e
        else:
            status_msg = "Skipping copywriting step..."
            logger.info(f"[{campaign_id}] {status_msg}")
            self._state_mirror.update_step_status(
                campaign_id, 
                "PENDING_REVIEW", 
                {"logs": [{"step": "COPYWRITING", "message": status_msg}]}
            )

        # Finalize campaign status to PENDING_REVIEW
        logger.info(f"[{campaign_id}] Pipeline staged for review.")
        
        return {
            "campaign_id": campaign_id,
            "status": "PENDING_REVIEW",
            "variants": parsed_output
        }
