import logging
import os
from typing import Any, Dict, Optional
from google.cloud import firestore

logger = logging.getLogger(__name__)

class FirestoreStateMirror:
    """
    Manages campaign state updates, incremental text adjustments, 
    and structured results synced in real-time to Google Cloud Firestore.
    """
    def __init__(self, project_id: Optional[str] = None, database_id: str = "(default)"):
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.database_id = database_id
        # When project_id is provided, use it; otherwise, Firestore SDK autodetects the project.
        try:
            self.db = firestore.Client(project=self.project_id, database=self.database_id)
            logger.info(f"Firestore client initialized successfully for project '{self.db.project}' and database '{self.db._database}'.")
        except Exception as e:
            logger.error(f"Error initializing Firestore client: {e}. Falling back to mock modes.")
            self.db = None

    def initialize_campaign_session(self, campaign_id: str, workflow_options: Dict[str, Any]) -> None:
        """
        Creates a new campaign document under the 'campaigns' collection.
        Sets initial status to QUEUED and logs workflow choices.
        """
        initial_payload = {
            "campaign_id": campaign_id,
            "status": "QUEUED",
            "progress": 0,
            "workflow_options": workflow_options,
            "logs": [
                {
                    "step": "INITIALIZATION",
                    "status": "QUEUED",
                    "message": "Campaign state initialized."
                }
            ],
            "text_outputs": {},
            "media_outputs": {},
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        if self.db:
            try:
                doc_ref = self.db.collection("campaigns").document(campaign_id)
                doc_ref.set(initial_payload)
                logger.info(f"Initialized Firestore document for campaign: {campaign_id}")
            except Exception as e:
                logger.error(f"Firestore operation failed for {campaign_id}: {e}")
        else:
            logger.info(f"[MOCK FIRESTORE] initialize_campaign_session: {campaign_id} with workflow_options: {workflow_options}")

    def update_step_status(self, campaign_id: str, status_string: str, tracking_data: Optional[Dict[str, Any]] = None) -> None:
        """
        Pushes incremental text adjustments, structured results, and logs back to the campaign document.
        """
        logger.info(f"Step Sync - Campaign {campaign_id} -> {status_string}")
        
        # Build update update payload
        update_data: Dict[str, Any] = {
            "status": status_string
        }
        
        # Extract progress percentage based on status string
        progress_map = {
            "QUEUED": 0,
            "RESEARCHING": 15,
            "COPYWRITING": 35,
            "PENDING_REVIEW": 100,
            "VISUAL_PRODUCTION": 65,
            "SAFETY_AUDIT": 85,
            "COMPLETED": 100,
            "FAILED": 100
        }
        
        if status_string in progress_map:
            update_data["progress"] = progress_map[status_string]
            
        # Append step log structure
        log_entry = {
            "step": status_string,
            "message": f"Pipeline entered state: {status_string}."
        }
        
        if self.db:
            try:
                doc_ref = self.db.collection("campaigns").document(campaign_id)
                
                # Check for dynamic keys in tracking_data to merge increments
                if tracking_data:
                    for key, val in tracking_data.items():
                        # Support tracking_data keys like text_outputs, media_outputs
                        if key in ["text_outputs", "media_outputs", "variants"]:
                            for inner_key, inner_val in val.items():
                                update_data[f"{key}.{inner_key}"] = inner_val
                        else:
                            update_data[key] = val
                
                # Push status updates and append to the log list
                update_data["logs"] = firestore.ArrayUnion([log_entry])
                doc_ref.update(update_data)
                logger.info(f"Updated Firestore state for {campaign_id} to {status_string}")
            except Exception as e:
                logger.error(f"Firestore update failed for {campaign_id}: {e}")
        else:
            logger.info(f"[MOCK FIRESTORE] update_step_status {campaign_id} -> {status_string}. Tracking data: {tracking_data}")
