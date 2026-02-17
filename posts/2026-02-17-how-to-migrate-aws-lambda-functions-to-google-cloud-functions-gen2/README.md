# How to Migrate AWS Lambda Functions to Google Cloud Functions Gen2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, AWS Lambda, Migration, Serverless

Description: Migrate your AWS Lambda functions to Google Cloud Functions Gen2 with practical code examples covering triggers, environment variables, and dependencies.

---

Moving serverless functions from AWS Lambda to Google Cloud Functions Gen2 is more of a rewrite than a migration. The APIs are different, the trigger mechanisms are different, and the deployment model is different. But the good news is that the core logic - the business code that does the actual work - usually needs minimal changes.

In this post, I will walk through the practical steps of migrating Lambda functions to Cloud Functions Gen2, covering common trigger types, dependency management, and the gotchas that trip people up.

## Key Differences Between Lambda and Cloud Functions Gen2

Understanding the differences upfront saves a lot of time:

| Feature | AWS Lambda | Cloud Functions Gen2 |
|---------|-----------|---------------------|
| Runtime | Managed by Lambda | Built on Cloud Run |
| Max timeout | 15 minutes | 60 minutes (HTTP), 9 minutes (event) |
| Max memory | 10 GB | 32 GB |
| Concurrency | 1 per instance (unless provisioned) | Multiple per instance |
| Triggers | API Gateway, SQS, S3, etc. | HTTP, Pub/Sub, Eventarc |
| Packaging | Zip or container | Source code or container |
| Cold start | Variable | Typically lower for Gen2 |

## Migrating an HTTP-Triggered Function

Let us start with the simplest case - an HTTP function.

Here is a typical Lambda HTTP function:

```python
# Original AWS Lambda function
import json

def lambda_handler(event, context):
    """Handle API Gateway event."""
    body = json.loads(event.get('body', '{}'))
    name = body.get('name', 'World')

    # Business logic
    greeting = f"Hello, {name}!"

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps({'message': greeting})
    }
```

Here is the same function rewritten for Cloud Functions Gen2:

```python
# Migrated to Google Cloud Functions Gen2
import functions_framework
import json

@functions_framework.http
def hello_http(request):
    """Handle HTTP request."""
    # Parse the request body
    body = request.get_json(silent=True) or {}
    name = body.get('name', 'World')

    # Business logic - unchanged from Lambda
    greeting = f"Hello, {name}!"

    # Return response directly - no statusCode wrapper needed
    return json.dumps({'message': greeting}), 200, {
        'Content-Type': 'application/json'
    }
```

The main differences are:
- The decorator `@functions_framework.http` replaces the handler convention
- The `request` parameter is a Flask Request object, not the Lambda event dict
- You return the response directly instead of wrapping it in a statusCode/body structure

## Migrating an SQS-Triggered Function to Pub/Sub

Lambda functions triggered by SQS map to Cloud Functions triggered by Pub/Sub.

Original Lambda with SQS trigger:

```python
# AWS Lambda with SQS trigger
import json
import logging

logger = logging.getLogger()

def lambda_handler(event, context):
    """Process SQS messages."""
    for record in event['Records']:
        body = json.loads(record['body'])
        message_id = record['messageId']

        logger.info(f"Processing message {message_id}")

        # Business logic
        process_order(body)

    return {'statusCode': 200}

def process_order(order_data):
    """Process an order - business logic."""
    order_id = order_data['order_id']
    # ... processing logic
    print(f"Processed order {order_id}")
```

Migrated to Cloud Functions Gen2 with Pub/Sub:

```python
# Migrated to Cloud Functions Gen2 with Pub/Sub trigger
import functions_framework
import base64
import json
import logging

logger = logging.getLogger(__name__)

@functions_framework.cloud_event
def process_pubsub(cloud_event):
    """Process Pub/Sub message - triggered by CloudEvents."""
    # Decode the Pub/Sub message data
    message_data = base64.b64decode(
        cloud_event.data["message"]["data"]
    ).decode('utf-8')

    body = json.loads(message_data)
    message_id = cloud_event.data["message"]["message_id"]

    logger.info(f"Processing message {message_id}")

    # Business logic - unchanged
    process_order(body)

def process_order(order_data):
    """Process an order - business logic unchanged from Lambda."""
    order_id = order_data['order_id']
    # ... processing logic
    print(f"Processed order {order_id}")
```

## Migrating an S3-Triggered Function to GCS

Lambda functions triggered by S3 events become Cloud Functions triggered by GCS events through Eventarc.

Original Lambda:

```python
# AWS Lambda triggered by S3 object creation
import boto3
import json

s3 = boto3.client('s3')

def lambda_handler(event, context):
    """Process new S3 objects."""
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        size = record['s3']['object']['size']

        print(f"New object: s3://{bucket}/{key} ({size} bytes)")

        # Download and process the file
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read()
        process_file(key, content)

def process_file(filename, content):
    """Process file content."""
    # Business logic here
    pass
```

Migrated version:

```python
# Migrated to Cloud Functions Gen2 with GCS trigger
import functions_framework
from google.cloud import storage

storage_client = storage.Client()

@functions_framework.cloud_event
def process_gcs_object(cloud_event):
    """Process new GCS objects - triggered by Eventarc."""
    data = cloud_event.data

    bucket_name = data["bucket"]
    file_name = data["name"]
    size = data.get("size", 0)

    print(f"New object: gs://{bucket_name}/{file_name} ({size} bytes)")

    # Download and process the file
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    content = blob.download_as_bytes()
    process_file(file_name, content)

def process_file(filename, content):
    """Process file content - unchanged from Lambda."""
    # Business logic here
    pass
```

## Handling Environment Variables and Secrets

Lambda uses environment variables directly. Cloud Functions does too, but for secrets it is better to use Secret Manager:

```python
# Lambda approach - secrets in environment variables
import os

DB_PASSWORD = os.environ['DB_PASSWORD']  # Not great for secrets
```

```python
# Cloud Functions approach - use Secret Manager for sensitive values
import os
from google.cloud import secretmanager

def get_secret(secret_id):
    """Retrieve a secret from Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    project = os.environ.get('GCP_PROJECT')
    name = f"projects/{project}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# Or mount secrets as environment variables in the deployment config
# gcloud functions deploy my-function \
#   --set-secrets 'DB_PASSWORD=db-password:latest'
```

## Deploying Cloud Functions Gen2

Deploy your migrated function:

```bash
# Deploy an HTTP function
gcloud functions deploy hello-http \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point hello_http \
  --memory 256MB \
  --timeout 60s \
  --region us-central1 \
  --project my-gcp-project

# Deploy a Pub/Sub triggered function
gcloud functions deploy process-orders \
  --gen2 \
  --runtime python311 \
  --trigger-topic order-events \
  --entry-point process_pubsub \
  --memory 512MB \
  --timeout 300s \
  --region us-central1

# Deploy a GCS triggered function using Eventarc
gcloud functions deploy process-uploads \
  --gen2 \
  --runtime python311 \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-upload-bucket" \
  --entry-point process_gcs_object \
  --memory 512MB \
  --region us-central1
```

## Managing Dependencies

Lambda uses a requirements layer or bundles dependencies in the zip. Cloud Functions reads a standard requirements.txt:

```
# requirements.txt
functions-framework==3.*
google-cloud-storage==2.*
google-cloud-secretmanager==2.*
google-cloud-pubsub==2.*
requests==2.*
```

## Terraform Deployment

For infrastructure-as-code deployment:

```hcl
# cloud-function.tf
# Deploy Cloud Functions Gen2 with Terraform

resource "google_cloudfunctions2_function" "process_orders" {
  name        = "process-orders"
  location    = var.region
  project     = var.project_id
  description = "Process order events from Pub/Sub"

  build_config {
    runtime     = "python311"
    entry_point = "process_pubsub"

    source {
      storage_source {
        bucket = google_storage_bucket.source_code.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count = 100
    min_instance_count = 1  # Keep warm to reduce cold starts
    available_memory   = "512Mi"
    timeout_seconds    = 300

    environment_variables = {
      GCP_PROJECT = var.project_id
    }

    # Mount secrets from Secret Manager
    secret_environment_variables {
      key        = "DB_PASSWORD"
      project_id = var.project_id
      secret     = "db-password"
      version    = "latest"
    }

    service_account_email = google_service_account.function_sa.email
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.order_events.id
    retry_policy   = "RETRY_POLICY_RETRY"
  }
}
```

## Migration Checklist

Before cutting over, verify these items:

1. All trigger types have been mapped and tested
2. Environment variables and secrets are configured
3. IAM permissions match what the function needs
4. Error handling works correctly with GCP error types
5. Logging outputs to Cloud Logging in the expected format
6. Cold start times are acceptable
7. Concurrency settings are appropriate for your workload
8. Monitoring and alerting are configured

## Wrapping Up

Migrating Lambda functions to Cloud Functions Gen2 is mostly about translating the integration layer - triggers, request/response formats, and cloud SDK calls. The business logic inside your functions typically moves over with minimal changes. Take it one function at a time, start with the simplest ones to build confidence, and make sure you have thorough tests before cutting over production traffic.
