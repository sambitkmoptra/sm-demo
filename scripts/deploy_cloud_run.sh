#!/usr/bin/env bash

# Bash script to build and deploy the Social Media Agent Engine to Google Cloud Run.
set -eo pipefail

# Read arguments or fallback to default configuration
PROJECT_ID=${1:-"moptra-ai-demo"}
REGION=${2:-"us-central1"}
SERVICE_NAME="social-media-agent-engine"
AGENT_API_KEY=${3:-"acme-secret-agent-key-2026112"}

echo "--------------------------------------------------------"
echo "Deploying Social Media Agent Engine to Google Cloud Run"
echo "Project ID : ${PROJECT_ID}"
echo "Region     : ${REGION}"
echo "Service    : ${SERVICE_NAME}"
echo "API Key    : ${AGENT_API_KEY}"
echo "--------------------------------------------------------"

# Build source code into container image using Cloud Build and deploy to Cloud Run.
# We set --allow-unauthenticated because the FastAPI application itself enforces 
# API key header authorization via the X-API-KEY security check.
gcloud run deploy "${SERVICE_NAME}" \
    --source . \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --allow-unauthenticated \
    --set-env-vars GOOGLE_CLOUD_PROJECT="${PROJECT_ID}",VERTEX_AI_LOCATION=global,AGENT_API_KEY="${AGENT_API_KEY}"

echo ""
echo "Deployment completed successfully!"
