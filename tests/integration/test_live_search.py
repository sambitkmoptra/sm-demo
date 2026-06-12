import asyncio
import logging
import os
import sys

# Add workspace path
sys.path.append("/Users/sambithota/Documents/social-media-agent-platform")

from agents.agent import ResearchAgent
from google.adk.runners import InMemoryRunner
from google.genai import types

# Configure verbose console logging to capture the detailed ADK steps
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("test_live_search")

async def run_live_search():
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    logger.info("Initializing live Google Search Grounding test via Google ADK...")
    logger.info(f"Active GCP Project: {project_id}")

    if not project_id and not os.environ.get("GEMINI_API_KEY"):
        logger.warning(
            "WARNING: Neither GOOGLE_CLOUD_PROJECT nor GEMINI_API_KEY is configured in your shell environment.\n"
            "If the execution fails with authentication errors, please run:\n"
            "export GOOGLE_CLOUD_PROJECT=\"your-project-id\"\n"
            "gcloud auth application-default login\n"
        )

    # Instantiate the real ResearchAgent (uses google_search tool under the hood)
    research_agent = ResearchAgent(
        name="live_research_agent",
        model="gemini-2.5-flash"
    )

    runner = InMemoryRunner(agent=research_agent)
    
    # Prompt requiring real-time web context (e.g. current year events or active stock trends)
    prompt = "What are the top three trends in athleisure and activewear fashion this week?"
    
    user_msg = types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt)]
    )

    logger.info(f"Sending prompt to ResearchAgent: '{prompt}'")
    logger.info("Awaiting live Gemini model execution with Google Search tool...")
    
    final_output = ""
    try:
        async for event in runner.run_async(
            user_id="live_test_user",
            session_id="live_test_session_search",
            new_message=user_msg
        ):
            # Print turn events as they occur
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        final_output += part.text
                        # Print stream to console
                        sys.stdout.write(part.text)
                        sys.stdout.flush()
        
        print("\n\n==================================================")
        logger.info("Live Search Grounding execution completed successfully!")
        logger.info("==================================================")
        
    except Exception as e:
        logger.error(f"Live Search Grounding execution failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_live_search())
