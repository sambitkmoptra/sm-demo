import logging
import os
from typing import List, Optional
from google.adk import Agent
from google.adk.tools import google_search
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

def get_model_name(default_model: str) -> str:
    """
    Dynamically resolves model names. If GOOGLE_CLOUD_PROJECT is configured,
    formulates a full Vertex AI model resource path to trigger Vertex AI execution.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if project_id:
        location = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
        # Vertex AI models are regional; default "global" to "us-central1"
        if location == "global":
            location = "us-central1"
        resource_path = f"projects/{project_id}/locations/{location}/publishers/google/models/{default_model}"
        logger.info(f"Dynamically mapped model '{default_model}' to Vertex AI path: {resource_path}")
        return resource_path
    return default_model

# Structured Research Output schema
class ResearchOutput(BaseModel):
    trends: List[str] = Field(description="List of key web trends discovered")
    competitors: List[str] = Field(description="List of top competitors and competitor context found")
    market_data: List[str] = Field(description="Bullet points of key market facts, stats, and data points")
    summary: str = Field(description="A brief bulleted markdown summary of the overall research findings")

# Structured Blog Content schemas
class BlogSection(BaseModel):
    heading: str = Field(description="The section heading")
    content: str = Field(description="Detailed section body content in Markdown format")
    takeaways: List[str] = Field(description="Key takeaways or bullet points for this section")

class CompetitorDetail(BaseModel):
    name: str = Field(description="Competitor brand name")
    details: str = Field(description="Details on their products, market position, or correlation to our campaign")

class StructuredBlog(BaseModel):
    title: str = Field(description="The title of the blog post")
    introduction: str = Field(description="The introductory hook or overview paragraph")
    sections: List[BlogSection] = Field(description="List of structured content sections")
    competitors: List[CompetitorDetail] = Field(description="Detailed analysis of the top 5 to 10 competitors found")
    conclusion: str = Field(description="Concluding thoughts or call to action")

# Omni-Channel text post variant sub-models
class LinkedInPost(BaseModel):
    narrative: str = Field(description="An authority-building professional narrative")
    visual_prompt: str = Field(description="Descriptive visual styling prompt according to the narrative")

class FacebookPost(BaseModel):
    narrative: str = Field(description="An engaging, community-driven social update")
    visual_prompt: str = Field(description="Descriptive visual styling prompt according to the narrative")

class InstagramSlide(BaseModel):
    slide_text: str = Field(description="Text block mapping out a sequential visual slide")
    visual_prompt: str = Field(description="Descriptive visual styling prompt for this slide")

class ShortsReelsScriptFrame(BaseModel):
    timestamp: str = Field(description="Timestamp or timing marker (e.g., 0:00-0:05)")
    voiceover: str = Field(description="Voiceover script text")
    visual_description: str = Field(description="Visual description for portrait rendering")

# Pydantic schema representing the omnichannel text bundle output with structured blog
class OmnichannelCampaignBundle(BaseModel):
    blog: StructuredBlog = Field(description="A highly structured long-form technical blog post with multiple sections and competitor analysis.")
    linkedin_post: LinkedInPost = Field(description="An authority-building professional narrative and its visual prompt")
    facebook_post: FacebookPost = Field(description="An engaging community-driven social update and its visual prompt")
    pinterest_prompt: str = Field(description="Descriptive visual styling prompt optimized for graphic creation layers")
    instagram_carousal: List[InstagramSlide] = Field(description="An array of text slides mapping out sequential visual content and each of their visual styling prompts")
    shorts_reels_script: List[ShortsReelsScriptFrame] = Field(description="A timed multi-frame voiceover script tailored for portrait video rendering")

class ResearchAgent(Agent):
    """
    Research agent equipped with native Google Search Grounding 
    to discover real-time market trends, competitors, and facts.
    """
    def __init__(self, name: str = "research_agent", model: str = "gemini-2.5-flash"):
        instruction = (
            "You are a research analyst. Given a campaign prompt, find current live web trends, "
            "competitor context, and market data via Google Search. "
            "You must strictly output a valid JSON object matching the target schema:\n"
            "{\n"
            "  \"trends\": [\"string\"],\n"
            "  \"competitors\": [\"string\"],\n"
            "  \"market_data\": [\"string\"],\n"
            "  \"summary\": \"concise bulleted markdown summary of the findings\"\n"
            "}\n"
            "Provide ONLY the JSON object."
        )
        super().__init__(
            name=name,
            model=get_model_name(model),
            instruction=instruction,
            tools=[google_search]
        )

class CopywriterAgent(Agent):
    """
    Copywriter agent generating long-form blogs and social captions 
    based on brand guidelines and search-grounded research context.
    """
    def __init__(
        self, 
        name: str = "copywriter_agent", 
        model: str = "gemini-2.5-pro",
        tools: Optional[List] = None,
        instruction: Optional[str] = None
    ):
        default_instruction = (
            "You are an enterprise brand copywriter. Ingest the provided brand kit guidelines "
            "(tone, voice, forbidden rules, target demographic) extracted from the brand manual, and the research context. "
            "Compose and format all 6 campaign assets simultaneously into the required OmnichannelCampaignBundle schema:\n"
            "1. A highly structured long-form technical blog post (containing sections, and competitor analysis of top 5 to 10 competitors if found).\n"
            "2. A professional authority-building LinkedIn post (narrative and visual prompt).\n"
            "3. An engaging community Facebook post (narrative and visual prompt).\n"
            "4. A visual-first Pinterest prompt.\n"
            "5. A sequential Instagram carousel (array of slides with text and visual prompts).\n"
            "6. A timed multi-frame script for Shorts/Reels (timestamp, voiceover, and visual description).\n"
            "Strictly output a valid JSON object matching the target schema."
        )
        
        super().__init__(
            name=name,
            model=get_model_name(model),
            instruction=instruction or default_instruction,
            tools=tools or [],
            output_schema=OmnichannelCampaignBundle
        )
