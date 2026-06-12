import os
import sys
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, Security, Depends, status
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from typing import Dict, Any

# Configure standard console logging immediately at startup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agent_service")

logger.info(f"Python interpreter path: {sys.executable}")
logger.info(f"Python version: {sys.version}")
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Environment variables: {list(os.environ.keys())}")

# Wrap imports in a try-except block to capture and print any startup/import errors immediately
try:
    logger.info("Importing OrchestratorAgent...")
    from agents.coordinator import OrchestratorAgent
    logger.info("OrchestratorAgent imported successfully.")
except Exception as e:
    logger.critical(f"FATAL STARTUP ERROR: Failed to import OrchestratorAgent or dependencies: {e}", exc_info=True)
    raise e

app = FastAPI(title="Enterprise Social Media Agent Platform Engine")

# Configure API Key security header verification
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# Load the API key from environment, defaulting to the user's requested key
API_KEY = os.environ.get("AGENT_API_KEY", "acme-secret-agent-key-2026112")
logger.info(f"Server configured with X-API-KEY verification (active key length: {len(API_KEY)})")

async def verify_api_key(header_api_key: str = Security(api_key_header)):
    """
    Validates the custom X-API-KEY header value.
    Raises a 403 Forbidden HTTP exception if invalid or missing.
    """
    if header_api_key == API_KEY:
        return header_api_key
    logger.warning("Unauthenticated connection attempt blocked: invalid or missing API Key.")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: Invalid or missing API Key in X-API-KEY header."
    )

# Structured request body schema matching campaign parameters
class CampaignRequest(BaseModel):
    campaign_id: str
    prompt: str
    workflow_options: Dict[str, Any]
    brand_kit: Dict[str, Any]

@app.get("/healthz", status_code=status.HTTP_200_OK)
def health_check():
    """
    Public unauthenticated endpoint used by GCP Cloud Run load balancers
    and container restart policies to verify runtime health.
    """
    return {"status": "healthy", "service": "social-media-agent-platform"}

@app.post("/run", status_code=status.HTTP_200_OK, dependencies=[Depends(verify_api_key)])
async def run_pipeline(req: CampaignRequest):
    """
    Runs the multi-agent campaign pipeline end-to-end.
    Protected by verify_api_key dependency.
    """
    logger.info(f"Received authenticated request to trigger campaign: {req.campaign_id}")
    try:
        orchestrator = OrchestratorAgent()
        result = await orchestrator.run_campaign_pipeline(
            campaign_id=req.campaign_id,
            prompt=req.prompt,
            workflow_options=req.workflow_options,
            brand_kit=req.brand_kit
        )
        return result
    except Exception as e:
        logger.error(f"Pipeline execution error for campaign {req.campaign_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution failed: {str(e)}"
        )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    logger.info(f"Starting Uvicorn server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
