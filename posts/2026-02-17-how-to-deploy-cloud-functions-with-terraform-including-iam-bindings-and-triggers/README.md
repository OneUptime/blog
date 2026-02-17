# How to Deploy Cloud Functions with Terraform Including IAM Bindings and Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Terraform, IAM, Infrastructure as Code

Description: A comprehensive guide to deploying Google Cloud Functions Gen 2 with Terraform, including proper IAM bindings, event triggers, and service account configuration.

---

Managing Cloud Functions through the gcloud CLI works fine for a few functions, but once you have dozens of them across multiple environments, you need infrastructure as code. Terraform gives you reproducible deployments, version-controlled configuration, and the ability to manage all the surrounding resources - IAM bindings, triggers, service accounts, and networking - in one place.

Let me walk through a complete Terraform setup for Cloud Functions Gen 2, covering the common patterns you will need in production.

## Project Setup

First, set up the Terraform provider and enable the required APIs:

```hcl
# main.tf - Provider configuration and API enablement
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "my-project-terraform-state"
    prefix = "cloud-functions"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "eventarc.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com"
  ])

  service            = each.value
  disable_on_destroy = false
}
```

Variables file:

```hcl
# variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}
```

## Packaging Function Source Code

Cloud Functions need their source code in a Cloud Storage bucket. Here is how to package and upload it:

```hcl
# storage.tf - Source code bucket and upload

# Bucket for function source code
resource "google_storage_bucket" "function_source" {
  name     = "${var.project_id}-function-source"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }
}

# Package the function source code into a zip
data "archive_file" "api_function_source" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/api"
  output_path = "${path.module}/.build/api-function.zip"
}

# Upload the zip to Cloud Storage
resource "google_storage_bucket_object" "api_function_source" {
  name   = "api-function-${data.archive_file.api_function_source.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.api_function_source.output_path
}
```

The MD5 hash in the object name ensures that a new object is created whenever the source code changes, triggering a redeployment.

## Creating a Dedicated Service Account

Never use the default service account. Create dedicated service accounts with minimal permissions:

```hcl
# iam.tf - Service accounts and IAM bindings

# Service account for the API function
resource "google_service_account" "api_function_sa" {
  account_id   = "api-function-sa"
  display_name = "API Cloud Function Service Account"
  description  = "Service account for the API Cloud Function"
}

# Grant the service account permission to access Firestore
resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api_function_sa.email}"
}

# Grant permission to write logs
resource "google_project_iam_member" "api_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.api_function_sa.email}"
}

# Grant permission to access specific secrets
resource "google_secret_manager_secret_iam_member" "api_db_password" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_function_sa.email}"
}
```

## Deploying an HTTP-Triggered Function

```hcl
# functions.tf - HTTP-triggered Cloud Function Gen 2

resource "google_cloudfunctions2_function" "api" {
  name        = "api-${var.environment}"
  location    = var.region
  description = "Main API endpoint for the application"

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.api_function_source.name
      }
    }

    environment_variables = {
      NODE_ENV = "production"
    }
  }

  service_config {
    available_memory   = "512Mi"
    available_cpu      = "1"
    timeout_seconds    = 60
    min_instance_count = var.environment == "prod" ? 2 : 0
    max_instance_count = var.environment == "prod" ? 100 : 10

    max_instance_request_concurrency = 80

    environment_variables = {
      APP_ENV       = var.environment
      LOG_LEVEL     = var.environment == "prod" ? "warn" : "debug"
      CORS_ORIGINS  = var.allowed_origins
    }

    # Mount secrets from Secret Manager
    secret_environment_variables {
      key        = "DB_PASSWORD"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_password.secret_id
      version    = "latest"
    }

    service_account_email = google_service_account.api_function_sa.email

    # VPC connector for private resource access
    vpc_connector                 = google_vpc_access_connector.connector.id
    vpc_connector_egress_settings = "PRIVATE_RANGES_ONLY"
  }

  depends_on = [
    google_project_service.required_apis
  ]
}

# Make the function publicly accessible (for public APIs)
resource "google_cloud_run_service_iam_member" "api_public" {
  location = var.region
  service  = google_cloudfunctions2_function.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Output the function URL
output "api_url" {
  value = google_cloudfunctions2_function.api.service_config[0].uri
}
```

## Deploying a Pub/Sub-Triggered Function

```hcl
# pubsub-function.tf - Pub/Sub triggered Cloud Function

# Create the Pub/Sub topic
resource "google_pubsub_topic" "user_events" {
  name = "user-events-${var.environment}"
}

# Dead letter topic
resource "google_pubsub_topic" "user_events_dlq" {
  name = "user-events-dlq-${var.environment}"
}

# Service account for the event processor
resource "google_service_account" "event_processor_sa" {
  account_id   = "event-processor-sa"
  display_name = "Event Processor Service Account"
}

# Grant Eventarc permissions
resource "google_project_iam_member" "event_processor_eventarc" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.event_processor_sa.email}"
}

# Package source
data "archive_file" "event_processor_source" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/event-processor"
  output_path = "${path.module}/.build/event-processor.zip"
}

resource "google_storage_bucket_object" "event_processor_source" {
  name   = "event-processor-${data.archive_file.event_processor_source.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.event_processor_source.output_path
}

# Deploy the event processing function
resource "google_cloudfunctions2_function" "event_processor" {
  name        = "event-processor-${var.environment}"
  location    = var.region
  description = "Processes user events from Pub/Sub"

  build_config {
    runtime     = "nodejs20"
    entry_point = "processEvent"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.event_processor_source.name
      }
    }
  }

  service_config {
    available_memory   = "256Mi"
    timeout_seconds    = 120
    min_instance_count = 0
    max_instance_count = 50

    environment_variables = {
      APP_ENV = var.environment
    }

    service_account_email = google_service_account.event_processor_sa.email
  }

  # Pub/Sub trigger via Eventarc
  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.user_events.id

    retry_policy = "RETRY_POLICY_RETRY"

    service_account_email = google_service_account.event_processor_sa.email
  }

  depends_on = [
    google_project_service.required_apis
  ]
}
```

## Deploying a Cloud Storage-Triggered Function

```hcl
# storage-function.tf - Cloud Storage triggered function

# Grant the Cloud Storage service account permission to publish Eventarc events
data "google_storage_project_service_account" "default" {}

resource "google_project_iam_member" "storage_eventarc" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${data.google_storage_project_service_account.default.email_address}"
}

# The image resizer function
resource "google_cloudfunctions2_function" "image_resizer" {
  name        = "image-resizer-${var.environment}"
  location    = var.region
  description = "Resizes images uploaded to Cloud Storage"

  build_config {
    runtime     = "nodejs20"
    entry_point = "resizeImage"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.image_resizer_source.name
      }
    }
  }

  service_config {
    available_memory   = "1Gi"
    available_cpu      = "1"
    timeout_seconds    = 120
    max_instance_count = 20

    environment_variables = {
      RESIZED_BUCKET = google_storage_bucket.resized_images.name
    }

    service_account_email = google_service_account.image_resizer_sa.email
  }

  # Cloud Storage trigger via Eventarc
  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.storage.object.v1.finalized"

    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.original_images.name
    }

    service_account_email = google_service_account.image_resizer_sa.email
  }

  depends_on = [
    google_project_service.required_apis,
    google_project_iam_member.storage_eventarc
  ]
}
```

## Managing Multiple Functions with Modules

For projects with many functions, use Terraform modules:

```hcl
# modules/cloud-function/main.tf
variable "name" {}
variable "source_dir" {}
variable "entry_point" {}
variable "runtime" { default = "nodejs20" }
variable "memory" { default = "256Mi" }
variable "env_vars" { default = {} }
variable "trigger_topic" { default = null }

# ... module implementation

# Usage in main.tf
module "api_function" {
  source      = "./modules/cloud-function"
  name        = "api"
  source_dir  = "../functions/api"
  entry_point = "handler"
  memory      = "512Mi"
  env_vars    = { APP_ENV = var.environment }
}

module "event_processor" {
  source        = "./modules/cloud-function"
  name          = "event-processor"
  source_dir    = "../functions/event-processor"
  entry_point   = "processEvent"
  trigger_topic = google_pubsub_topic.user_events.id
}
```

## Applying the Configuration

```bash
# Initialize Terraform
terraform init

# Preview the changes
terraform plan -var="project_id=my-project" -var="environment=prod"

# Apply the changes
terraform apply -var="project_id=my-project" -var="environment=prod"
```

## Monitoring

After deploying with Terraform, set up monitoring using OneUptime to track function health, error rates, and performance metrics. Terraform handles the infrastructure, but you still need observability to know whether your functions are running correctly after deployment. Combining infrastructure as code with proper monitoring gives you a production-ready setup that is both reproducible and observable.

Terraform with Cloud Functions takes more setup than gcloud commands, but the payoff is huge. You get reproducible deployments, proper state management, and the ability to review infrastructure changes in pull requests before they go live.
