import asyncio
import logging
import os
import sys

# Add workspace path
sys.path.append("/Users/sambithota/Documents/social-media-agent-platform")

from agents.coordinator import OrchestratorAgent

# Configure standard console logging output
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("test_live_gcp")

async def test_run():
    # Read environment configurations
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("VERTEX_AI_LOCATION", "global")
    datastore_id = os.environ.get("TEST_DATASTORE_ID")

    logger.info("Reading live GCP test environment variables...")
    logger.info(f"GOOGLE_CLOUD_PROJECT: {project_id}")
    logger.info(f"VERTEX_AI_LOCATION: {location}")
    logger.info(f"TEST_DATASTORE_ID: {datastore_id}")

    if not project_id or not datastore_id:
        logger.error(
            "ERROR: Missing required environment variables.\n"
            "Please configure the following before running:\n"
            "export GOOGLE_CLOUD_PROJECT=\"your-gcp-project-id\"\n"
            "export TEST_DATASTORE_ID=\"your-datastore-id\"\n"
            "export VERTEX_AI_LOCATION=\"global\" (optional)\n"
        )
        sys.exit(1)

    # Initialize OrchestratorAgent
    orchestrator = OrchestratorAgent(
        name="gcp_live_orchestrator",
        model="gemini-2.5-flash"
    )

    campaign_id = "test-live-gcp-rag-campaign"
    prompt = "Create a launch campaign for our new state-of-the-art winter commute jacket, highlighting its high ROI and weatherproofing technology."
    
    workflow_options = {
        "runResearch": True,        # Enable research to verify the structured research output
        "runCopywriter": True,
        "runVisuals": False,
        "runAuditor": False
    }

    brand_kit = {
        "brand_name": "Acme Sports",
        "data_store_id": datastore_id,
        "location": location
    }

    logger.info("Starting live campaign pipeline run...")
    try:
        result = await orchestrator.run_campaign_pipeline(
            campaign_id=campaign_id,
            prompt=prompt,
            workflow_options=workflow_options,
            brand_kit=brand_kit
        )
        
        # Verify omnichannel variants schema structure
        assert result.get("status") == "PENDING_REVIEW", f"Expected PENDING_REVIEW status, got {result.get('status')}"
        
        variants = result.get("variants", {})
        required_keys = [
            "blog",
            "linkedin_post",
            "facebook_post",
            "pinterest_prompt",
            "instagram_carousal",
            "shorts_reels_script"
        ]
        
        missing_keys = [k for k in required_keys if k not in variants]
        if missing_keys:
            raise ValueError(f"Verification FAILED: Missing required variants keys: {missing_keys}")
            
        # Verify structured blog keys
        blog = variants.get("blog", {})
        required_blog_keys = ["title", "introduction", "sections", "competitors", "conclusion"]
        missing_blog_keys = [k for k in required_blog_keys if k not in blog]
        if missing_blog_keys:
            raise ValueError(f"Verification FAILED: Missing required blog keys: {missing_blog_keys}")
            
        logger.info("Live GCP integration pipeline completed successfully!")
        logger.info(f"Response Object Keys: {list(result.keys())}")
        logger.info(f"Variants Keys: {list(variants.keys())}")
        logger.info(f"Structured Blog Keys: {list(blog.keys())}")
        logger.info("Omni-channel structured text bundle verification passed!")
        
    except Exception as e:
        logger.error(f"Live GCP integration pipeline failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_run())
