#!/usr/bin/env bash

# Bash script to start the gcloud local emulators for firestore and pubsub.
set -eo pipefail

FIRESTORE_PORT=8080
PUBSUB_PORT=8085

echo "Starting Firestore emulator on port ${FIRESTORE_PORT}..."
gcloud beta emulators firestore start --host-port="localhost:${FIRESTORE_PORT}" &

echo "Starting Pub/Sub emulator on port ${PUBSUB_PORT}..."
gcloud beta emulators pubsub start --host-port="localhost:${PUBSUB_PORT}" &

echo "Emulators started in background. Press Ctrl+C to terminate."
wait
