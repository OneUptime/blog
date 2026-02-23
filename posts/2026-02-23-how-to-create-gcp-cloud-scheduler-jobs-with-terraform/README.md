# How to Create GCP Cloud Scheduler Jobs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Scheduler, Cron Jobs, Serverless, Infrastructure as Code

Description: Learn how to create GCP Cloud Scheduler jobs with Terraform, including HTTP targets, Pub/Sub targets, App Engine targets, retry configuration, and timezone handling.

---

Cloud Scheduler is Google Cloud's managed cron job service. It lets you schedule recurring tasks that trigger HTTP endpoints, Pub/Sub topics, or App Engine routes on a defined schedule. Think of it as a reliable, managed alternative to running cron on a VM - except you do not have to worry about the VM going down and missing a scheduled run.

In this post, we will create various Cloud Scheduler jobs with Terraform, covering all three target types, retry configuration, authentication, and practical patterns you will use in production.

## Provider Setup

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}
```

## HTTP Target Job

The most common pattern is triggering an HTTP endpoint on a schedule:

```hcl
# Service account for the scheduler to authenticate with
resource "google_service_account" "scheduler" {
  account_id   = "cloud-scheduler-sa"
  display_name = "Cloud Scheduler Service Account"
}

# Simple HTTP job - calls an endpoint every hour
resource "google_cloud_scheduler_job" "hourly_report" {
  name        = "hourly-report-job"
  description = "Triggers the report generation endpoint every hour"
  schedule    = "0 * * * *"  # Every hour at minute 0
  time_zone   = "America/New_York"
  region      = var.region

  # Retry configuration
  retry_config {
    retry_count          = 3
    max_retry_duration   = "300s"
    min_backoff_duration = "5s"
    max_backoff_duration = "60s"
    max_doublings        = 3
  }

  http_target {
    http_method = "POST"
    uri         = "https://your-service-abc123-uc.a.run.app/api/reports/generate"
    body        = base64encode(jsonencode({
      report_type = "hourly_summary"
      format      = "json"
    }))
    headers = {
      "Content-Type" = "application/json"
    }

    # OIDC authentication for Cloud Run services
    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = "https://your-service-abc123-uc.a.run.app"
    }
  }
}
```

The `schedule` field uses standard cron syntax: minute, hour, day-of-month, month, day-of-week. The `time_zone` is crucial - cron jobs run at the specified time in the given timezone, including handling daylight saving time transitions.

## Pub/Sub Target Job

Triggering a Pub/Sub topic is useful when you want to fan out work or decouple the scheduler from the handler:

```hcl
# Pub/Sub topic for scheduled tasks
resource "google_pubsub_topic" "scheduled_tasks" {
  name = "scheduled-tasks"
}

# Scheduler job that publishes to Pub/Sub
resource "google_cloud_scheduler_job" "daily_cleanup" {
  name        = "daily-cleanup-job"
  description = "Publishes a cleanup task message daily at 2 AM"
  schedule    = "0 2 * * *"  # Every day at 2:00 AM
  time_zone   = "UTC"
  region      = var.region

  retry_config {
    retry_count = 5
  }

  pubsub_target {
    topic_name = google_pubsub_topic.scheduled_tasks.id

    # Message data must be base64 encoded
    data = base64encode(jsonencode({
      task_type   = "cleanup"
      target      = "expired_sessions"
      max_age_days = 30
    }))

    # Attributes are key-value metadata on the message
    attributes = {
      source    = "cloud-scheduler"
      priority  = "low"
    }
  }
}
```

With Pub/Sub targets, Cloud Scheduler does not need an OIDC token - it uses its built-in Pub/Sub publisher permissions. The subscriber (a Cloud Function, Cloud Run service, or other consumer) processes the message when it arrives.

## App Engine Target Job

If your application runs on App Engine, you can target it directly:

```hcl
# App Engine HTTP target
resource "google_cloud_scheduler_job" "app_engine_cron" {
  name        = "app-engine-cron-job"
  description = "Calls the App Engine cron handler every 15 minutes"
  schedule    = "*/15 * * * *"  # Every 15 minutes
  time_zone   = "UTC"
  region      = var.region

  app_engine_http_target {
    http_method  = "POST"
    relative_uri = "/cron/process-queue"
    body         = base64encode(jsonencode({
      batch_size = 100
    }))
    headers = {
      "Content-Type" = "application/json"
    }

    # Target a specific App Engine service and version
    app_engine_routing {
      service = "worker"
      version = "v1"
    }
  }
}
```

App Engine targets automatically include authentication headers, so your App Engine handler can verify the request came from Cloud Scheduler by checking the `X-CloudScheduler` header.

## Common Cron Schedules

Here are practical examples of schedule expressions:

```hcl
# Every 5 minutes
resource "google_cloud_scheduler_job" "every_5_min" {
  name     = "every-5-minutes"
  schedule = "*/5 * * * *"
  region   = var.region
  time_zone = "UTC"

  http_target {
    http_method = "GET"
    uri         = "https://your-service.run.app/health-check"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}

# Every weekday at 9 AM Eastern
resource "google_cloud_scheduler_job" "weekday_morning" {
  name      = "weekday-morning-report"
  schedule  = "0 9 * * 1-5"  # Mon-Fri at 9 AM
  region    = var.region
  time_zone = "America/New_York"

  http_target {
    http_method = "POST"
    uri         = "https://your-service.run.app/reports/daily"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}

# First day of every month at midnight
resource "google_cloud_scheduler_job" "monthly" {
  name      = "monthly-billing-job"
  schedule  = "0 0 1 * *"
  region    = var.region
  time_zone = "UTC"

  http_target {
    http_method = "POST"
    uri         = "https://your-service.run.app/billing/monthly-close"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}

# Every Sunday at 3 AM for weekly maintenance
resource "google_cloud_scheduler_job" "weekly" {
  name      = "weekly-maintenance"
  schedule  = "0 3 * * 0"  # Sunday at 3 AM
  region    = var.region
  time_zone = "UTC"

  pubsub_target {
    topic_name = google_pubsub_topic.scheduled_tasks.id
    data       = base64encode(jsonencode({
      task_type = "weekly_maintenance"
    }))
  }
}
```

## Multiple Jobs with for_each

When you have many scheduled jobs, define them as a variable:

```hcl
variable "scheduled_jobs" {
  type = map(object({
    description = string
    schedule    = string
    time_zone   = string
    uri         = string
    http_method = string
    body        = optional(string, null)
  }))
  default = {
    "daily-cleanup" = {
      description = "Clean up expired data"
      schedule    = "0 2 * * *"
      time_zone   = "UTC"
      uri         = "https://api.example.com/cron/cleanup"
      http_method = "POST"
      body        = "{\"max_age_days\": 30}"
    }
    "hourly-sync" = {
      description = "Sync data from external sources"
      schedule    = "0 * * * *"
      time_zone   = "UTC"
      uri         = "https://api.example.com/cron/sync"
      http_method = "POST"
      body        = null
    }
    "weekly-report" = {
      description = "Generate weekly analytics report"
      schedule    = "0 8 * * 1"
      time_zone   = "America/New_York"
      uri         = "https://api.example.com/cron/weekly-report"
      http_method = "POST"
      body        = null
    }
  }
}

resource "google_cloud_scheduler_job" "jobs" {
  for_each    = var.scheduled_jobs
  name        = each.key
  description = each.value.description
  schedule    = each.value.schedule
  time_zone   = each.value.time_zone
  region      = var.region

  retry_config {
    retry_count          = 3
    min_backoff_duration = "5s"
    max_backoff_duration = "60s"
  }

  http_target {
    http_method = each.value.http_method
    uri         = each.value.uri
    body        = each.value.body != null ? base64encode(each.value.body) : null
    headers     = each.value.body != null ? { "Content-Type" = "application/json" } : {}

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}
```

## IAM Configuration

The scheduler service account needs permission to invoke the targets:

```hcl
# For Cloud Run targets - grant invoker role
resource "google_cloud_run_service_iam_member" "scheduler_invoker" {
  service  = "your-service-name"
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

# For Cloud Functions targets - grant invoker role
resource "google_cloudfunctions2_function_iam_member" "scheduler_invoker" {
  cloud_function = "your-function-name"
  location       = var.region
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.scheduler.email}"
}

# For Pub/Sub targets - grant publisher role
resource "google_pubsub_topic_iam_member" "scheduler_publisher" {
  topic  = google_pubsub_topic.scheduled_tasks.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.scheduler.email}"
}
```

## Pausing Jobs

Cloud Scheduler jobs can be paused to temporarily stop execution:

```hcl
# Create a job in paused state
resource "google_cloud_scheduler_job" "paused_job" {
  name      = "paused-job"
  schedule  = "0 * * * *"
  region    = var.region
  time_zone = "UTC"
  paused    = true  # Job will not run until resumed

  http_target {
    http_method = "GET"
    uri         = "https://your-service.run.app/process"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}
```

## Outputs

```hcl
output "scheduler_sa_email" {
  description = "Email of the Cloud Scheduler service account"
  value       = google_service_account.scheduler.email
}

output "job_names" {
  description = "Names of all scheduled jobs"
  value       = { for k, v in google_cloud_scheduler_job.jobs : k => v.id }
}
```

## Best Practices

**Always specify a timezone.** If you do not set `time_zone`, it defaults to UTC. Be explicit about the timezone, especially for jobs that need to run at specific business hours.

**Use OIDC tokens for HTTP targets.** Never use API keys or hardcoded tokens in the scheduler configuration. OIDC tokens are automatically rotated and scoped to the service account.

**Set appropriate retry configurations.** Not all jobs should be retried the same way. A billing job might need many retries with long backoff. A cache-warming job might not need retries at all.

**Use Pub/Sub for fan-out patterns.** If a scheduled event needs to trigger multiple actions, publish to a Pub/Sub topic and have multiple subscribers handle different aspects.

**Monitor job execution.** Cloud Scheduler logs job attempts in Cloud Logging. Set up alerts for failed executions, especially for critical jobs like billing or data pipelines.

**Keep the body payload small.** Cloud Scheduler has a 1MB limit for HTTP request bodies. For large payloads, have the scheduler trigger a job that reads the actual data from Cloud Storage or a database.

## Conclusion

Cloud Scheduler with Terraform gives you reliable, managed cron jobs without the operational overhead of maintaining a scheduler infrastructure. The three target types (HTTP, Pub/Sub, App Engine) cover most scheduling needs, and the retry configuration ensures jobs eventually complete even when transient failures occur. By defining your scheduled jobs as Terraform code, you get version control, code review, and reproducibility for your scheduled workloads.

For processing the work that Cloud Scheduler triggers, see our guide on [creating Cloud Tasks queues with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-tasks-queues-with-terraform/view).
