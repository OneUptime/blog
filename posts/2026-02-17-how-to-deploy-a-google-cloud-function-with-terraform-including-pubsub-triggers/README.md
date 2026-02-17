# How to Deploy a Google Cloud Function with Terraform Including Pub/Sub Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud Functions, Pub/Sub, Serverless, Event-Driven Architecture

Description: Learn how to deploy Google Cloud Functions with Terraform including Pub/Sub triggers, proper IAM configuration, and environment-specific settings for event-driven architectures.

---

Cloud Functions paired with Pub/Sub is one of the most common patterns on GCP for event-driven processing. A message lands in a Pub/Sub topic, and a Cloud Function picks it up and processes it. Deploying this with Terraform means you can version control the entire setup - the function, the topic, the subscription, the IAM permissions - and replicate it across environments.

This guide walks through deploying Cloud Functions (both Gen 1 and Gen 2) with Pub/Sub triggers using Terraform.

## Prerequisites

Enable the required APIs:

```hcl
# apis.tf - Required APIs for Cloud Functions and Pub/Sub
resource "google_project_service" "cloudfunctions" {
  project = var.project_id
  service = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  project = var.project_id
  service = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "pubsub" {
  project = var.project_id
  service = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run" {
  project = var.project_id
  service = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "eventarc" {
  project = var.project_id
  service = "eventarc.googleapis.com"
  disable_on_destroy = false
}
```

## Creating the Pub/Sub Topic

Start with the Pub/Sub topic that will trigger the function:

```hcl
# pubsub.tf - Pub/Sub topic and dead-letter topic

# Main topic that triggers the function
resource "google_pubsub_topic" "events" {
  name    = "application-events"
  project = var.project_id

  message_retention_duration = "86400s"  # Retain messages for 24 hours

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Dead-letter topic for failed messages
resource "google_pubsub_topic" "events_dead_letter" {
  name    = "application-events-dead-letter"
  project = var.project_id

  labels = {
    environment = var.environment
    purpose     = "dead-letter"
  }
}
```

## Preparing the Function Source Code

Terraform needs the function source code packaged as a zip file and uploaded to GCS. Here is the setup:

```hcl
# function_source.tf - Package and upload function source code

# Create a bucket for function source code
resource "google_storage_bucket" "function_source" {
  name     = "${var.project_id}-function-source"
  location = var.region
  project  = var.project_id

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# Archive the function source code
data "archive_file" "function_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src/event-processor"
  output_path = "${path.module}/tmp/event-processor.zip"
}

# Upload the source to GCS
resource "google_storage_bucket_object" "function_source" {
  name   = "event-processor-${data.archive_file.function_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function_zip.output_path
}
```

The MD5 hash in the object name ensures Terraform detects when the source code changes and triggers a redeployment.

## Deploying a Gen 2 Cloud Function with Pub/Sub Trigger

Gen 2 Cloud Functions (built on Cloud Run) are the recommended choice for new functions:

```hcl
# function_gen2.tf - Gen 2 Cloud Function with Pub/Sub trigger

# Service account for the function
resource "google_service_account" "function_sa" {
  account_id   = "event-processor"
  display_name = "Event Processor Function SA"
  project      = var.project_id
}

# Grant the function access to resources it needs
resource "google_project_iam_member" "function_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
    "roles/secretmanager.secretAccessor",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

# The Cloud Function (Gen 2)
resource "google_cloudfunctions2_function" "event_processor" {
  name     = "event-processor"
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "python312"
    entry_point = "process_event"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count    = 10
    min_instance_count    = 0
    available_memory      = "256M"
    timeout_seconds       = 120
    service_account_email = google_service_account.function_sa.email

    environment_variables = {
      ENV         = var.environment
      DB_HOST     = var.database_host
      LOG_LEVEL   = "info"
    }

    secret_environment_variables {
      key        = "DB_PASSWORD"
      project_id = var.project_id
      secret     = "db-password"
      version    = "latest"
    }
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.events.id
    retry_policy   = "RETRY_POLICY_RETRY"

    service_account_email = google_service_account.function_sa.email
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.run,
    google_project_service.eventarc,
  ]
}
```

The function source code at `src/event-processor/main.py`:

```python
# main.py - Cloud Function entry point for Pub/Sub events
import base64
import json
import functions_framework
from google.cloud import storage

@functions_framework.cloud_event
def process_event(cloud_event):
    """Process a Pub/Sub message triggered by a cloud event."""
    # Decode the Pub/Sub message data
    message_data = base64.b64decode(cloud_event.data["message"]["data"])
    payload = json.loads(message_data)

    # Get message attributes if any
    attributes = cloud_event.data["message"].get("attributes", {})

    print(f"Processing event: {payload.get('event_type', 'unknown')}")
    print(f"Attributes: {attributes}")

    # Your processing logic here
    handle_event(payload)

    print("Event processed successfully")

def handle_event(payload):
    """Handle the event based on its type."""
    event_type = payload.get("event_type")

    if event_type == "user_signup":
        process_signup(payload)
    elif event_type == "order_placed":
        process_order(payload)
    else:
        print(f"Unknown event type: {event_type}")
```

## Deploying a Gen 1 Cloud Function (Legacy)

If you need Gen 1 for compatibility:

```hcl
# function_gen1.tf - Gen 1 Cloud Function with Pub/Sub trigger
resource "google_cloudfunctions_function" "event_processor" {
  name        = "event-processor"
  description = "Processes events from Pub/Sub"
  runtime     = "python312"
  region      = var.region
  project     = var.project_id

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.function_source.name
  source_archive_object = google_storage_bucket_object.function_source.name
  entry_point           = "process_event"
  timeout               = 120
  max_instances         = 10

  # Pub/Sub trigger configuration
  event_trigger {
    event_type = "google.pubsub.topic.publish"
    resource   = google_pubsub_topic.events.id

    failure_policy {
      retry = true
    }
  }

  service_account_email = google_service_account.function_sa.email

  environment_variables = {
    ENV       = var.environment
    LOG_LEVEL = "info"
  }
}
```

## Setting Up Dead-Letter Handling

Configure a dead-letter policy to catch messages that fail repeatedly:

```hcl
# dead_letter.tf - Dead-letter subscription and handling function

# Grant Pub/Sub permission to publish to the dead-letter topic
resource "google_pubsub_topic_iam_member" "dead_letter_publisher" {
  topic   = google_pubsub_topic.events_dead_letter.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${var.project_number}@gcp-sa-pubsub.iam.gserviceaccount.com"
  project = var.project_id
}

# Subscription with dead-letter policy
resource "google_pubsub_subscription" "events_sub" {
  name    = "event-processor-sub"
  topic   = google_pubsub_topic.events.name
  project = var.project_id

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.events_dead_letter.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  ack_deadline_seconds = 120
}

# Function to process dead-letter messages (alerting, logging, manual retry)
resource "google_cloudfunctions2_function" "dead_letter_handler" {
  name     = "dead-letter-handler"
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "python312"
    entry_point = "handle_dead_letter"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.dead_letter_source.name
      }
    }
  }

  service_config {
    max_instance_count    = 5
    available_memory      = "256M"
    timeout_seconds       = 60
    service_account_email = google_service_account.function_sa.email
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.events_dead_letter.id
    retry_policy   = "RETRY_POLICY_DO_NOT_RETRY"
  }
}
```

## Multiple Functions Sharing a Topic

You can have multiple functions triggered by the same topic for different processing needs:

```hcl
# Each function gets its own subscription to the same topic
locals {
  processors = {
    analytics = {
      entry_point = "process_analytics"
      memory      = "256M"
      timeout     = 60
    }
    notifications = {
      entry_point = "send_notification"
      memory      = "128M"
      timeout     = 30
    }
    audit = {
      entry_point = "write_audit_log"
      memory      = "128M"
      timeout     = 30
    }
  }
}

resource "google_cloudfunctions2_function" "processors" {
  for_each = local.processors

  name     = "${each.key}-processor"
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "python312"
    entry_point = each.value.entry_point

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count    = 10
    available_memory      = each.value.memory
    timeout_seconds       = each.value.timeout
    service_account_email = google_service_account.function_sa.email
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.events.id
    retry_policy   = "RETRY_POLICY_RETRY"
  }
}
```

## Outputs

```hcl
# outputs.tf
output "function_url" {
  description = "The URL of the deployed Cloud Function"
  value       = google_cloudfunctions2_function.event_processor.url
}

output "topic_name" {
  description = "The Pub/Sub topic name"
  value       = google_pubsub_topic.events.name
}

output "topic_id" {
  description = "The Pub/Sub topic ID for publishing"
  value       = google_pubsub_topic.events.id
}
```

## Testing the Setup

After deploying, test by publishing a message:

```bash
# Publish a test message to the topic
gcloud pubsub topics publish application-events \
  --message='{"event_type":"user_signup","user_id":"test-123"}' \
  --attribute="source=test" \
  --project=my-gcp-project

# Check the function logs
gcloud functions logs read event-processor \
  --gen2 \
  --region=us-central1 \
  --project=my-gcp-project \
  --limit=20
```

## Best Practices

1. **Use Gen 2 Cloud Functions** for new deployments. They support longer timeouts, more concurrency options, and are built on Cloud Run.
2. **Always set up dead-letter topics.** Messages that fail repeatedly should not be lost silently.
3. **Use a dedicated service account** with minimal permissions for each function.
4. **Include the source hash in the GCS object name** so Terraform detects code changes.
5. **Set appropriate timeouts and memory limits** based on your function's actual requirements.
6. **Use Secret Manager** for sensitive configuration instead of environment variables.
7. **Set max_instance_count** to prevent runaway scaling and unexpected costs.

## Wrapping Up

Deploying Cloud Functions with Pub/Sub triggers through Terraform gives you a fully codified event-driven architecture. Everything from the topic to the function to the dead-letter handling is version controlled and reproducible. This setup scales naturally - add more functions triggered by the same topic, add more topics for different event types, and let Terraform manage the complexity.
