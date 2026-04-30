# How to Create GCP Cloud Scheduler Jobs with OpenTofu - Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud Scheduler, Cron Jobs, Serverless, Infrastructure as Code

Description: Learn how to create GCP Cloud Scheduler jobs to invoke Cloud Functions, Pub/Sub topics, and HTTP endpoints on a schedule using OpenTofu.

## Introduction

GCP Cloud Scheduler is a fully managed cron job service that triggers actions on a schedule. You can target Cloud Functions, Pub/Sub topics, App Engine, or any HTTP endpoint. OpenTofu manages scheduler jobs and their service accounts as code.

## Creating a Pub/Sub Target Job

```hcl
resource "google_cloud_scheduler_job" "pubsub_job" {
  name        = "${var.app_name}-pubsub-scheduler"
  project     = var.project_id
  region      = var.region
  description = "Trigger data pipeline via Pub/Sub every hour"
  schedule    = "0 * * * *"  # cron: every hour at minute 0
  time_zone   = "America/New_York"

  # Retry configuration
  retry_config {
    retry_count          = 3
    max_retry_duration   = "0s"
    min_backoff_duration = "5s"
    max_backoff_duration = "3600s"
    max_doublings        = 5
  }

  pubsub_target {
    topic_name = google_pubsub_topic.pipeline_trigger.id

    # Message payload (base64-encoded)
    data = base64encode(jsonencode({
      trigger = "scheduled"
      source  = "cloud-scheduler"
    }))

    attributes = {
      environment = var.environment
    }
  }
}

resource "google_pubsub_topic" "pipeline_trigger" {
  name    = "${var.app_name}-pipeline-trigger"
  project = var.project_id
}
```

## HTTP Target Job

```hcl
resource "google_service_account" "scheduler" {
  account_id   = "${var.app_name}-scheduler-sa"
  display_name = "Cloud Scheduler Service Account"
  project      = var.project_id
}

resource "google_cloud_scheduler_job" "http_job" {
  name        = "${var.app_name}-http-scheduler"
  project     = var.project_id
  region      = var.region
  description = "Call report generation endpoint every weekday at 9 AM"
  schedule    = "0 9 * * 1-5"  # weekdays at 9 AM
  time_zone   = "UTC"

  http_target {
    uri         = "https://api.example.com/generate-report"
    http_method = "POST"

    body = base64encode(jsonencode({
      report_type = "daily_summary"
    }))

    headers = {
      "Content-Type" = "application/json"
    }

    # Use OIDC token for authenticated endpoints (Cloud Run, Cloud Functions)
    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = "https://api.example.com"
    }
  }
}
```

## Cloud Function Target

```hcl
resource "google_cloudfunctions2_function_iam_member" "cleanup_invoker" {
  project        = google_cloudfunctions2_function.cleanup.project
  location       = google_cloudfunctions2_function.cleanup.location
  cloud_function = google_cloudfunctions2_function.cleanup.name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_run_service_iam_member" "cleanup_run_invoker" {
  project  = google_cloudfunctions2_function.cleanup.project
  location = google_cloudfunctions2_function.cleanup.location
  service  = google_cloudfunctions2_function.cleanup.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_scheduler_job" "function_job" {
  name      = "${var.app_name}-function-scheduler"
  project   = var.project_id
  region    = var.region
  schedule  = "0 2 * * *"  # daily at 2 AM
  time_zone = "UTC"

  http_target {
    uri         = google_cloudfunctions2_function.cleanup.url
    http_method = "POST"

    body = base64encode(jsonencode({ action = "cleanup" }))

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}
```

## App Engine Target

```hcl
resource "google_cloud_scheduler_job" "appengine_job" {
  name     = "${var.app_name}-appengine-job"
  project  = var.project_id
  region   = var.region
  schedule = "*/15 * * * *"  # every 15 minutes

  app_engine_http_target {
    http_method  = "GET"
    relative_uri = "/tasks/process"
    app_engine_routing {
      service = "worker"
    }
  }
}
```

## Variables and Outputs

```hcl
variable "project_id"  { type = string }
variable "region" {
  type    = string
  default = "us-central1"
}
variable "app_name"    { type = string }
variable "environment" { type = string }

output "scheduler_job_name" {
  value = google_cloud_scheduler_job.http_job.name
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

GCP Cloud Scheduler enables reliable cron-based triggers for Pub/Sub, HTTP endpoints, and App Engine services. OpenTofu manages scheduler jobs with retry policies and OIDC authentication, making scheduled workloads reproducible and consistently configured across environments.
