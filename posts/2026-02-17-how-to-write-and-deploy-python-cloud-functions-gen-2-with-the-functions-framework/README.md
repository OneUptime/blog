# How to Write and Deploy Python Cloud Functions Gen 2 with the Functions Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Python, Functions Framework, Serverless

Description: Learn how to write, test locally, and deploy Python Cloud Functions Gen 2 using the Functions Framework for HTTP triggers, Pub/Sub events, and Cloud Storage events.

---

Cloud Functions Gen 2 is built on Cloud Run under the hood, which gives you longer timeouts, larger instances, concurrency, and traffic splitting. The Functions Framework is the open-source library that makes your function deployable - it handles the HTTP server, request parsing, and event deserialization so you can focus on your business logic.

This post walks through writing Cloud Functions in Python with the Functions Framework, testing locally, and deploying to GCP.

## Setting Up the Functions Framework

Install the framework:

```bash
# Install the Functions Framework and any dependencies
pip install functions-framework google-cloud-storage google-cloud-pubsub
```

The Functions Framework lets you run your function locally the same way it runs in production. This is a big improvement over Gen 1 where local testing required workarounds.

## Writing an HTTP Function

The simplest function type handles HTTP requests:

```python
# main.py - HTTP-triggered Cloud Function
import functions_framework
from flask import jsonify

@functions_framework.http
def hello(request):
    """HTTP Cloud Function that returns a greeting.

    Args:
        request: The Flask request object
    Returns:
        JSON response with a greeting message
    """
    # Get the name from query params or request body
    name = request.args.get('name')

    if not name:
        request_json = request.get_json(silent=True)
        if request_json and 'name' in request_json:
            name = request_json['name']

    if not name:
        name = 'World'

    return jsonify({
        'message': f'Hello, {name}!',
        'function': 'hello',
        'version': '2.0',
    })
```

Test it locally:

```bash
# Run the function locally on port 8080
functions-framework --target=hello --debug

# In another terminal, test it
curl http://localhost:8080?name=Developer
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"name": "Developer"}'
```

## Writing a More Complex HTTP Function

Here is a function that processes data and stores results in Cloud Storage:

```python
# main.py - Data processing HTTP function
import functions_framework
from flask import jsonify, request
from google.cloud import storage
import json
import hashlib
from datetime import datetime, timezone

@functions_framework.http
def process_data(request):
    """Process incoming data and store results in Cloud Storage.

    Expects a JSON body with a 'records' array. Processes each record,
    generates a summary, and stores both raw and processed data.
    """
    # Validate the request
    if request.method != 'POST':
        return jsonify({'error': 'Only POST requests are accepted'}), 405

    data = request.get_json(silent=True)
    if not data or 'records' not in data:
        return jsonify({'error': 'Request must include a records array'}), 400

    records = data['records']

    # Process the records
    processed = []
    for record in records:
        processed_record = {
            'id': record.get('id', ''),
            'value': record.get('value', 0),
            'processed_at': datetime.now(timezone.utc).isoformat(),
            'checksum': hashlib.md5(json.dumps(record).encode()).hexdigest(),
        }
        processed.append(processed_record)

    # Generate summary
    values = [r.get('value', 0) for r in records]
    summary = {
        'total_records': len(records),
        'sum': sum(values),
        'average': sum(values) / len(values) if values else 0,
        'min': min(values) if values else 0,
        'max': max(values) if values else 0,
    }

    # Store results in Cloud Storage
    client = storage.Client()
    bucket = client.bucket('my-results-bucket')
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')

    # Store processed records
    blob = bucket.blob(f'processed/{timestamp}/records.json')
    blob.upload_from_string(
        json.dumps(processed, indent=2),
        content_type='application/json'
    )

    # Store summary
    summary_blob = bucket.blob(f'processed/{timestamp}/summary.json')
    summary_blob.upload_from_string(
        json.dumps(summary, indent=2),
        content_type='application/json'
    )

    return jsonify({
        'status': 'processed',
        'summary': summary,
        'output_path': f'gs://my-results-bucket/processed/{timestamp}/',
    }), 200
```

## Writing a Pub/Sub-Triggered Function

Cloud Functions Gen 2 uses CloudEvents for event triggers:

```python
# main.py - Pub/Sub-triggered Cloud Function
import functions_framework
from cloudevents.http import CloudEvent
import base64
import json
from google.cloud import storage

@functions_framework.cloud_event
def process_pubsub(cloud_event: CloudEvent):
    """Process a Pub/Sub message.

    This function is triggered by a Pub/Sub message and processes
    the data contained in the message.

    Args:
        cloud_event: CloudEvent containing the Pub/Sub message
    """
    # Decode the Pub/Sub message data
    pubsub_data = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
    message = json.loads(pubsub_data)

    # Get message attributes if any
    attributes = cloud_event.data["message"].get("attributes", {})

    print(f"Received message: {message}")
    print(f"Attributes: {attributes}")

    # Process the message based on its type
    message_type = attributes.get('type', 'unknown')

    if message_type == 'user_signup':
        handle_user_signup(message)
    elif message_type == 'order_placed':
        handle_order_placed(message)
    else:
        print(f"Unknown message type: {message_type}")

def handle_user_signup(data):
    """Handle a new user signup event."""
    email = data.get('email', 'unknown')
    print(f"Processing new user signup: {email}")
    # Send welcome email, create profile, etc.

def handle_order_placed(data):
    """Handle a new order event."""
    order_id = data.get('order_id', 'unknown')
    print(f"Processing order: {order_id}")
    # Update inventory, send confirmation, etc.
```

## Writing a Cloud Storage-Triggered Function

React to file uploads in Cloud Storage:

```python
# main.py - Cloud Storage-triggered function for image processing
import functions_framework
from cloudevents.http import CloudEvent
from google.cloud import storage

@functions_framework.cloud_event
def process_upload(cloud_event: CloudEvent):
    """Process a file uploaded to Cloud Storage.

    Triggered when a new file is created in the monitored bucket.
    Reads file metadata and performs processing based on file type.

    Args:
        cloud_event: CloudEvent containing the storage event data
    """
    data = cloud_event.data

    # Extract file information from the event
    bucket_name = data["bucket"]
    file_name = data["name"]
    content_type = data.get("contentType", "")
    file_size = int(data.get("size", 0))
    event_type = cloud_event["type"]  # google.cloud.storage.object.v1.finalized

    print(f"Event: {event_type}")
    print(f"File: gs://{bucket_name}/{file_name}")
    print(f"Content type: {content_type}")
    print(f"Size: {file_size} bytes")

    # Skip processing for non-data files
    if file_name.startswith('processed/'):
        print("Skipping already processed file")
        return

    # Process based on content type
    if content_type == 'text/csv':
        process_csv(bucket_name, file_name)
    elif content_type == 'application/json':
        process_json(bucket_name, file_name)
    else:
        print(f"Unsupported content type: {content_type}")

def process_csv(bucket_name, file_name):
    """Process a CSV file from Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(file_name)

    # Download and process the CSV
    content = blob.download_as_text()
    lines = content.strip().split('\n')

    print(f"CSV has {len(lines)} lines (including header)")

    # Store the processed result
    result_blob = bucket.blob(f'processed/{file_name}.result')
    result_blob.upload_from_string(
        f"Processed {len(lines) - 1} records from {file_name}",
        content_type='text/plain'
    )

def process_json(bucket_name, file_name):
    """Process a JSON file from Cloud Storage."""
    import json

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(file_name)

    content = blob.download_as_text()
    data = json.loads(content)

    if isinstance(data, list):
        print(f"JSON array with {len(data)} items")
    elif isinstance(data, dict):
        print(f"JSON object with {len(data)} keys")
```

## Local Testing with Events

Test event-triggered functions locally:

```bash
# Test a Pub/Sub function locally
functions-framework --target=process_pubsub --signature-type=cloudevent --debug
```

Send a test CloudEvent:

```bash
# Send a test Pub/Sub CloudEvent
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "google.cloud.pubsub.topic.v1.messagePublished",
    "source": "//pubsub.googleapis.com/projects/my-project/topics/my-topic",
    "id": "test-123",
    "time": "2026-02-17T10:00:00Z",
    "data": {
      "message": {
        "data": "'$(echo -n '{"email":"user@example.com"}' | base64)'",
        "attributes": {
          "type": "user_signup"
        }
      }
    }
  }'
```

## Deploying Cloud Functions Gen 2

### Deploy an HTTP Function

```bash
# Deploy an HTTP-triggered Gen 2 Cloud Function
gcloud functions deploy process-data \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_data \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512Mi \
  --timeout=120s \
  --min-instances=0 \
  --max-instances=10 \
  --project=my-project
```

### Deploy a Pub/Sub Function

```bash
# Deploy a Pub/Sub-triggered Gen 2 Cloud Function
gcloud functions deploy process-pubsub \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_pubsub \
  --trigger-topic=my-topic \
  --memory=256Mi \
  --timeout=60s \
  --project=my-project
```

### Deploy a Cloud Storage Function

```bash
# Deploy a Cloud Storage-triggered Gen 2 Cloud Function
gcloud functions deploy process-upload \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_upload \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-upload-bucket" \
  --memory=512Mi \
  --timeout=300s \
  --project=my-project
```

## Environment Variables and Secrets

Configure your function with environment variables and secrets:

```bash
# Deploy with environment variables and secrets
gcloud functions deploy my-function \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=hello \
  --trigger-http \
  --set-env-vars="APP_ENV=production,LOG_LEVEL=info" \
  --set-secrets="API_KEY=my-api-key:latest,DB_PASSWORD=db-pass:latest" \
  --project=my-project
```

Access them in your function:

```python
# Access environment variables and secrets in your function
import os

@functions_framework.http
def hello(request):
    app_env = os.environ.get('APP_ENV', 'development')
    api_key = os.environ.get('API_KEY', '')  # Secret is injected as env var
    log_level = os.environ.get('LOG_LEVEL', 'info')

    return jsonify({'environment': app_env})
```

## Requirements File

Create a `requirements.txt` for your function's dependencies:

```
# requirements.txt - Dependencies for the Cloud Function
functions-framework==3.*
google-cloud-storage==2.*
google-cloud-pubsub==2.*
```

GCP automatically installs these when deploying. You do not need to include `functions-framework` explicitly (GCP adds it), but including it ensures version consistency between local and deployed environments.

## Monitoring and Logging

Use structured logging for better Cloud Logging integration:

```python
# Structured logging for Cloud Functions
import json
import functions_framework

def log_structured(severity, message, **kwargs):
    """Write a structured log entry for Cloud Logging."""
    entry = {
        'severity': severity,
        'message': message,
    }
    entry.update(kwargs)
    print(json.dumps(entry))

@functions_framework.http
def monitored_function(request):
    """Function with structured logging."""
    log_structured('INFO', 'Function invoked', method=request.method, path=request.path)

    try:
        result = do_work()
        log_structured('INFO', 'Processing complete', result_count=len(result))
        return jsonify(result)
    except Exception as e:
        log_structured('ERROR', 'Processing failed', error=str(e))
        return jsonify({'error': 'Internal error'}), 500
```

## Summary

Cloud Functions Gen 2 with the Functions Framework gives you a clean development experience for serverless Python functions. Use `@functions_framework.http` for HTTP triggers and `@functions_framework.cloud_event` for event triggers (Pub/Sub, Cloud Storage, etc.). Test locally with the `functions-framework` command before deploying. Deploy with `gcloud functions deploy --gen2` and take advantage of Gen 2 features like concurrency, longer timeouts, and traffic splitting. The Functions Framework keeps your code portable - the same function code runs locally, in Cloud Functions, and in any container runtime.
