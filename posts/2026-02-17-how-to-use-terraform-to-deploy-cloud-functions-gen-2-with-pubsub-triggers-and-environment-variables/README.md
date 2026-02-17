# How to Use Terraform to Deploy Cloud Functions Gen 2 with Pub/Sub Triggers and Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud Functions, Pub/Sub, Serverless, Google Cloud Platform

Description: Deploy Google Cloud Functions 2nd generation with Pub/Sub event triggers and environment variables using Terraform, including source code packaging and IAM configuration.

---

Cloud Functions 2nd generation is built on Cloud Run and Eventarc, which gives you better performance, longer timeouts, and more configuration options compared to the 1st generation. Deploying them with Terraform means your serverless infrastructure is version-controlled and reproducible.

In this post, I will show you how to deploy a Cloud Function Gen 2 that triggers on Pub/Sub messages, with proper environment variable management and all the IAM plumbing that GCP requires.

## What Changed in Gen 2

If you have used Cloud Functions 1st gen before, Gen 2 is a significant shift. Under the hood, each function is a Cloud Run service triggered by Eventarc. This means the Terraform resources are different too. Instead of `google_cloudfunctions_function`, you use `google_cloudfunctions2_function`. The trigger configuration uses Eventarc instead of the older event trigger model.

## Project Structure

Here is what the Terraform configuration looks like alongside the function code:

```
cloud-functions/
  terraform/
    main.tf
    variables.tf
    outputs.tf
  functions/
    process-events/
      main.py
      requirements.txt
```

## The Function Code

First, here is a simple Python function that processes Pub/Sub messages:

```python
# functions/process-events/main.py
# Cloud Function that processes Pub/Sub messages
# Gen 2 uses CloudEvents format instead of the old event format

import functions_framework
import base64
import json
import os

@functions_framework.cloud_event
def process_event(cloud_event):
    """Process a Pub/Sub message delivered as a CloudEvent."""

    # Extract the Pub/Sub message data from the CloudEvent
    pubsub_message = base64.b64decode(
        cloud_event.data["message"]["data"]
    ).decode("utf-8")

    message = json.loads(pubsub_message)

    # Access environment variables set via Terraform
    environment = os.environ.get("APP_ENVIRONMENT", "unknown")
    api_endpoint = os.environ.get("API_ENDPOINT", "")

    print(f"[{environment}] Processing message: {message}")

    # Your processing logic here
    return "OK"
```

## Packaging the Source Code

Terraform needs the function source code as a zip file in a GCS bucket. Here is how to set that up:

```hcl
# main.tf - Source code packaging
# Zip the function code and upload it to a staging bucket

# Bucket to store function source code archives
resource "google_storage_bucket" "functions_source" {
  project                     = var.project_id
  name                        = "${var.project_id}-functions-source"
  location                    = var.region
  uniform_bucket_level_access = true

  # Auto-delete old source archives after 30 days
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# Create a zip archive of the function source code
data "archive_file" "process_events" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/process-events"
  output_path = "${path.module}/../functions/process-events.zip"
}

# Upload the zip to the staging bucket
resource "google_storage_bucket_object" "process_events_source" {
  name   = "process-events-${data.archive_file.process_events.output_md5}.zip"
  bucket = google_storage_bucket.functions_source.name
  source = data.archive_file.process_events.output_path
}
```

Including the MD5 hash in the object name is a trick that forces Terraform to upload a new version whenever the code changes. Without it, Terraform might not detect source code modifications.

## Creating the Pub/Sub Topic

Set up the topic that will trigger the function:

```hcl
# pubsub.tf - Pub/Sub topic for triggering the function

resource "google_pubsub_topic" "events" {
  project = var.project_id
  name    = "${var.environment}-events"

  # Message retention in case the function is temporarily unavailable
  message_retention_duration = "86400s"
}
```

## Service Account for the Function

Every Cloud Function should run with its own service account that has only the permissions it needs:

```hcl
# iam.tf - Service account and permissions for the function

# Dedicated service account for this function
resource "google_service_account" "function_sa" {
  project      = var.project_id
  account_id   = "process-events-fn"
  display_name = "Process Events Cloud Function"
}

# Grant the function permission to write logs
resource "google_project_iam_member" "function_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

# If the function needs to read from Cloud Storage
resource "google_project_iam_member" "function_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}
```

## The Eventarc Service Account

Gen 2 functions use Eventarc for triggers, which needs its own permissions. This is the part that catches many people off guard:

```hcl
# eventarc-iam.tf - Permissions required for Eventarc to deliver events

# The Pub/Sub service agent needs permission to create tokens
# for authenticating event delivery to the function
resource "google_project_iam_member" "pubsub_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Grant Eventarc permission to invoke the function
resource "google_cloud_run_v2_service_iam_member" "eventarc_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloudfunctions2_function.process_events.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.function_sa.email}"
}

data "google_project" "current" {
  project_id = var.project_id
}
```

## Deploying the Cloud Function Gen 2

Now the main resource - the Cloud Function itself with Pub/Sub trigger and environment variables:

```hcl
# function.tf - Cloud Functions Gen 2 deployment with Pub/Sub trigger

resource "google_cloudfunctions2_function" "process_events" {
  project  = var.project_id
  name     = "${var.environment}-process-events"
  location = var.region

  # Build configuration - where to find the source code
  build_config {
    runtime     = "python312"
    entry_point = "process_event"

    source {
      storage_source {
        bucket = google_storage_bucket.functions_source.name
        object = google_storage_bucket_object.process_events_source.name
      }
    }
  }

  # Service configuration - runtime settings
  service_config {
    # Resource allocation
    available_memory   = "256Mi"
    available_cpu      = "1"
    timeout_seconds    = 60
    max_instance_count = 10
    min_instance_count = 0

    # Run as our dedicated service account
    service_account_email = google_service_account.function_sa.email

    # Environment variables - no secrets here, use Secret Manager for those
    environment_variables = {
      APP_ENVIRONMENT = var.environment
      API_ENDPOINT    = var.api_endpoint
      LOG_LEVEL       = var.log_level
    }
  }

  # Eventarc trigger for Pub/Sub messages
  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.events.id

    # Retry on failure
    retry_policy = "RETRY_POLICY_RETRY"
  }
}
```

## Using Secret Manager for Sensitive Values

Environment variables are visible in the GCP Console and in Terraform state. For sensitive values like API keys, use Secret Manager:

```hcl
# secrets.tf - Sensitive configuration stored in Secret Manager

resource "google_secret_manager_secret" "api_key" {
  project   = var.project_id
  secret_id = "${var.environment}-process-events-api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "api_key" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = var.api_key
}

# Grant the function access to read the secret
resource "google_secret_manager_secret_iam_member" "function_access" {
  secret_id = google_secret_manager_secret.api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.function_sa.email}"
}
```

Then reference the secret in the function configuration:

```hcl
service_config {
  # ... other config ...

  secret_environment_variables {
    key        = "API_KEY"
    project_id = var.project_id
    secret     = google_secret_manager_secret.api_key.secret_id
    version    = "latest"
  }
}
```

## Variables and Outputs

```hcl
# variables.tf
variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "environment" {
  type = string
}

variable "api_endpoint" {
  type    = string
  default = ""
}

variable "log_level" {
  type    = string
  default = "INFO"
}

variable "api_key" {
  type      = string
  sensitive = true
  default   = ""
}

# outputs.tf
output "function_uri" {
  value = google_cloudfunctions2_function.process_events.url
}

output "topic_name" {
  value = google_pubsub_topic.events.name
}
```

## Testing the Deployment

After applying, test by publishing a message to the topic:

```bash
# Publish a test message
gcloud pubsub topics publish dev-events \
  --project=my-project \
  --message='{"action": "test", "data": "hello"}'

# Check the function logs
gcloud functions logs read dev-process-events \
  --project=my-project \
  --gen2 \
  --region=us-central1
```

## Summary

Deploying Cloud Functions Gen 2 with Terraform involves more resources than Gen 1 because of the Eventarc and Cloud Run underpinning, but the result is more powerful and configurable. The key pieces are proper source code packaging with hash-based naming, Eventarc IAM setup for event delivery, and using Secret Manager instead of environment variables for sensitive data. Once you have the pattern down, it is straightforward to replicate for additional functions.
