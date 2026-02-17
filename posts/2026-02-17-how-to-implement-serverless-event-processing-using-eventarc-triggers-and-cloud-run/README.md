# How to Implement Serverless Event Processing Using Eventarc Triggers and Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Eventarc, Cloud Run, Event Processing, Serverless, Event-Driven Architecture

Description: A hands-on guide to building serverless event processing systems using Eventarc triggers and Cloud Run on Google Cloud Platform.

---

Event-driven architecture is one of those patterns that sounds great in theory but can be fiddly to implement. You need something to produce events, something to route them, and something to process them. On GCP, Eventarc fills the routing role - it listens for events from over 130 Google Cloud sources and delivers them to your Cloud Run services as HTTP requests. No polling, no custom infrastructure, no message bus to manage.

This post walks through building event processing workflows with Eventarc and Cloud Run, covering common event sources, trigger configuration, and best practices for reliable event handling.

## What Is Eventarc

Eventarc is an event routing service that connects event producers to event consumers on GCP. It can route events from:

- **Cloud Audit Logs**: Any API call made to a GCP service (resource creation, deletion, modification)
- **Cloud Storage**: Object creation, deletion, metadata updates
- **Pub/Sub**: Messages published to a topic
- **Firebase**: Firestore document changes, Authentication events
- **Direct events**: Events published directly from first-party sources

The consumer is always a Cloud Run service (or a Cloud Function, Workflow, or GKE service). Events are delivered as CloudEvents - a standardized HTTP format for event data.

## Step 1: Deploy an Event Processing Service on Cloud Run

First, build a Cloud Run service that can receive and process events:

```python
# main.py - Cloud Run service for processing events
import os
import json
import logging
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route("/", methods=["POST"])
def handle_event():
    """Handle incoming CloudEvents from Eventarc.

    CloudEvents are delivered as HTTP POST requests with
    specific headers and a JSON body.
    """
    # Extract CloudEvent headers
    event_type = request.headers.get("ce-type", "unknown")
    event_source = request.headers.get("ce-source", "unknown")
    event_id = request.headers.get("ce-id", "unknown")
    event_time = request.headers.get("ce-time", "unknown")

    logger.info(f"Received event: type={event_type}, id={event_id}")

    # Parse the event data
    event_data = request.get_json(silent=True) or {}

    # Route to the appropriate handler based on event type
    handlers = {
        "google.cloud.storage.object.v1.finalized": handle_storage_event,
        "google.cloud.audit.log.v1.written": handle_audit_log_event,
        "google.cloud.pubsub.topic.v1.messagePublished": handle_pubsub_event,
        "google.cloud.firestore.document.v1.written": handle_firestore_event,
    }

    handler = handlers.get(event_type, handle_unknown_event)

    try:
        result = handler(event_data, event_id)
        return jsonify({"status": "processed", "result": result}), 200
    except Exception as e:
        logger.error(f"Error processing event {event_id}: {e}")
        # Return 500 to trigger Eventarc retry
        return jsonify({"status": "error", "message": str(e)}), 500


def handle_storage_event(data, event_id):
    """Process Cloud Storage events (file uploaded, deleted, etc.)."""
    bucket = data.get("bucket", "")
    name = data.get("name", "")
    content_type = data.get("contentType", "")
    size = data.get("size", 0)

    logger.info(f"Storage event: {name} in {bucket} ({content_type}, {size} bytes)")

    # Example: process uploaded images
    if content_type and content_type.startswith("image/"):
        logger.info(f"Processing image: {name}")
        # Trigger image processing pipeline
        return {"action": "image_processed", "file": name}

    # Example: process CSV uploads
    if name.endswith(".csv"):
        logger.info(f"Processing CSV: {name}")
        # Trigger data import pipeline
        return {"action": "csv_imported", "file": name}

    return {"action": "ignored", "file": name}


def handle_audit_log_event(data, event_id):
    """Process Cloud Audit Log events (resource changes)."""
    proto_payload = data.get("protoPayload", {})
    method_name = proto_payload.get("methodName", "")
    resource_name = proto_payload.get("resourceName", "")
    principal = proto_payload.get("authenticationInfo", {}).get("principalEmail", "")

    logger.info(f"Audit log: {method_name} on {resource_name} by {principal}")

    # Example: alert on IAM policy changes
    if "SetIamPolicy" in method_name:
        logger.warning(f"IAM policy change detected: {resource_name} by {principal}")
        # Send notification
        return {"action": "iam_alert", "resource": resource_name}

    # Example: track instance creation
    if "compute.instances.insert" in method_name:
        logger.info(f"New instance created: {resource_name}")
        return {"action": "instance_tracked", "resource": resource_name}

    return {"action": "logged", "method": method_name}


def handle_pubsub_event(data, event_id):
    """Process Pub/Sub messages."""
    import base64

    message = data.get("message", {})
    message_data = message.get("data", "")

    # Decode the base64-encoded message
    if message_data:
        decoded = base64.b64decode(message_data).decode("utf-8")
        logger.info(f"Pub/Sub message: {decoded[:200]}")
        return {"action": "message_processed", "data": decoded[:100]}

    return {"action": "empty_message"}


def handle_firestore_event(data, event_id):
    """Process Firestore document change events."""
    old_value = data.get("oldValue", {})
    new_value = data.get("value", {})

    logger.info(f"Firestore change detected")

    # Example: trigger notification on new order
    if new_value and not old_value:
        logger.info("New document created")
        return {"action": "document_created"}

    return {"action": "document_updated"}


def handle_unknown_event(data, event_id):
    """Handle events with unknown types."""
    logger.warning(f"Unknown event type for event {event_id}")
    return {"action": "unknown", "data_keys": list(data.keys())}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
```

Deploy the service:

```bash
# Build and deploy the event processor
gcloud run deploy event-processor \
  --source=. \
  --region=us-central1 \
  --no-allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --project=my-project
```

## Step 2: Create Eventarc Triggers

Now create triggers that route events to your Cloud Run service.

**Trigger for Cloud Storage events:**

```bash
# Trigger when files are uploaded to a specific bucket
gcloud eventarc triggers create storage-upload-trigger \
  --location=us-central1 \
  --destination-run-service=event-processor \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.storage.object.v1.finalized" \
  --event-filters="bucket=my-project-uploads" \
  --service-account=EVENT_SA@my-project.iam.gserviceaccount.com \
  --project=my-project
```

**Trigger for Audit Log events:**

```bash
# Trigger on IAM policy changes
gcloud eventarc triggers create iam-change-trigger \
  --location=us-central1 \
  --destination-run-service=event-processor \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=iam.googleapis.com" \
  --event-filters="methodName=SetIamPolicy" \
  --service-account=EVENT_SA@my-project.iam.gserviceaccount.com \
  --project=my-project
```

**Trigger for Pub/Sub messages:**

```bash
# Create a Pub/Sub topic
gcloud pubsub topics create order-events --project=my-project

# Trigger on messages to the order-events topic
gcloud eventarc triggers create order-event-trigger \
  --location=us-central1 \
  --destination-run-service=event-processor \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.pubsub.topic.v1.messagePublished" \
  --transport-topic=projects/my-project/topics/order-events \
  --service-account=EVENT_SA@my-project.iam.gserviceaccount.com \
  --project=my-project
```

## Step 3: Set Up the Service Account

Eventarc needs a service account with the right permissions:

```bash
# Create a service account for Eventarc
gcloud iam service-accounts create eventarc-sa \
  --display-name="Eventarc Event Processor" \
  --project=my-project

# Grant permissions to invoke Cloud Run
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:eventarc-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Grant permissions to receive events
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:eventarc-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/eventarc.eventReceiver"
```

## Step 4: Test the Triggers

Test each trigger by generating the corresponding event:

```bash
# Test the storage trigger by uploading a file
echo "test data" > test.csv
gsutil cp test.csv gs://my-project-uploads/test.csv

# Test the Pub/Sub trigger by publishing a message
gcloud pubsub topics publish order-events \
  --message='{"orderId": "123", "status": "confirmed"}' \
  --project=my-project

# Check the Cloud Run logs to verify processing
gcloud run services logs read event-processor \
  --region=us-central1 \
  --limit=20 \
  --project=my-project
```

## Step 5: Handle Retries and Idempotency

Eventarc retries failed event deliveries, so your event handler must be idempotent - processing the same event twice should not cause problems.

```python
from google.cloud import firestore

db = firestore.Client()

def ensure_idempotent(event_id, handler_func, *args):
    """Ensure an event is only processed once using Firestore."""
    doc_ref = db.collection("processed_events").document(event_id)

    # Check if this event was already processed
    doc = doc_ref.get()
    if doc.exists:
        logger.info(f"Event {event_id} already processed, skipping")
        return doc.to_dict().get("result")

    # Process the event
    result = handler_func(*args)

    # Record that we processed it
    doc_ref.set({
        "processed_at": firestore.SERVER_TIMESTAMP,
        "result": result,
    })

    return result
```

## Summary

Eventarc and Cloud Run give you a clean, serverless event processing architecture. Eventarc handles the plumbing of routing events from dozens of GCP sources to your Cloud Run services, while your services focus purely on the business logic. Start with one or two event sources, make sure your handlers are idempotent, and build from there. The event-driven pattern scales naturally - adding a new event source is just creating another trigger.
