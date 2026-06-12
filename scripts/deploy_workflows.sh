#!/usr/bin/env bash

# Bash script to deploy Google Workflows configuration to GCP.
set -eo pipefail

PROJECT_ID=${1:-"my-gcp-project-id"}
LOCATION=${2:-"us-central1"}
WORKFLOW_NAME="campaign-orchestrator-flow"
SERVICE_ACCOUNT="workflows-executor@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Deploying Workflow: ${WORKFLOW_NAME} to project ${PROJECT_ID}..."

gcloud workflows deploy "${WORKFLOW_NAME}" \
    --source=workflows/campaign_workflow.yaml \
    --location="${LOCATION}" \
    --project="${PROJECT_ID}" \
    --service-account="${SERVICE_ACCOUNT}"

echo "Deployment complete."
