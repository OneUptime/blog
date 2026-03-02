# How to Create GCP Cloud Tasks Queues with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Tasks, Task Queue, Serverless, Infrastructure as Code

Description: Learn how to create and configure GCP Cloud Tasks queues with Terraform, including rate limiting, retry policies, HTTP targets, and IAM permissions for task dispatching.

---

Cloud Tasks is Google Cloud's fully managed task queue service. It lets you decouple work from your request-response cycle by adding tasks to a queue that gets processed asynchronously. Need to send an email after a user signs up? Add a task. Need to resize images after upload? Add a task. Need to process a webhook payload without blocking the response? Tasks are your answer.

In this guide, we will set up Cloud Tasks queues with Terraform, covering rate limiting, retry configuration, HTTP targets, and the IAM setup needed to dispatch tasks securely.

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

## Basic Cloud Tasks Queue

The simplest queue configuration:

```hcl
# Basic Cloud Tasks queue with default settings
resource "google_cloud_tasks_queue" "basic" {
  name     = "basic-queue"
  location = var.region
}
```

That creates a queue with Google's defaults, which are reasonable for getting started. But for production, you will want to tune the rate limits and retry behavior.

## Queue with Rate Limiting

Rate limiting controls how fast tasks are dispatched from the queue:

```hcl
# Queue with rate limiting
resource "google_cloud_tasks_queue" "rate_limited" {
  name     = "rate-limited-queue"
  location = var.region

  rate_limits {
    # Maximum number of tasks dispatched per second
    max_dispatches_per_second = 100

    # Maximum number of tasks that can run concurrently
    max_concurrent_dispatches = 20

    # Maximum burst size - allows temporary spikes above the rate
    max_burst_size = 50
  }
}
```

The relationship between these settings matters. `max_dispatches_per_second` is the sustained rate. `max_burst_size` lets the queue temporarily exceed the sustained rate to handle spikes. `max_concurrent_dispatches` limits how many tasks can be running at the same time, which protects your backend from being overwhelmed.

## Queue with Retry Configuration

When tasks fail, Cloud Tasks can retry them with configurable backoff:

```hcl
# Queue with retry configuration
resource "google_cloud_tasks_queue" "with_retries" {
  name     = "retry-queue"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 50
    max_concurrent_dispatches = 10
  }

  retry_config {
    # Maximum number of retry attempts (-1 for unlimited)
    max_attempts = 5

    # Time limits
    max_retry_duration = "3600s"  # Stop retrying after 1 hour

    # Exponential backoff configuration
    min_backoff = "1s"     # First retry after 1 second
    max_backoff = "300s"   # Cap backoff at 5 minutes
    max_doublings = 4      # Double the backoff 4 times then stay at max
  }
}
```

With `max_doublings = 4` and `min_backoff = 1s`, the retry intervals would be: 1s, 2s, 4s, 8s, 16s, then stay at 16s (since max_doublings was reached) until max_backoff caps it. But since max_backoff is 300s, and we only doubled 4 times reaching 16s, the backoff stays at 16s for remaining retries.

If you want the full exponential curve, set `max_doublings` higher. For example, with `max_doublings = 8` and `min_backoff = 1s`: 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s.

## Email Processing Queue

A practical example for email sending:

```hcl
# Queue for email processing
resource "google_cloud_tasks_queue" "email" {
  name     = "email-queue"
  location = var.region

  rate_limits {
    # Most email APIs have rate limits - stay well under them
    max_dispatches_per_second = 10
    max_concurrent_dispatches = 5
  }

  retry_config {
    max_attempts       = 10
    max_retry_duration = "86400s"  # Keep trying for 24 hours
    min_backoff        = "10s"     # Wait at least 10s between retries
    max_backoff        = "3600s"   # Cap at 1 hour between retries
    max_doublings      = 6
  }

  # Stackdriver logging for monitoring
  stackdriver_logging_config {
    sampling_ratio = 1.0  # Log all tasks (reduce for high-volume queues)
  }
}
```

## Webhook Processing Queue

For processing incoming webhooks asynchronously:

```hcl
# Queue for webhook processing
resource "google_cloud_tasks_queue" "webhooks" {
  name     = "webhook-queue"
  location = var.region

  rate_limits {
    # Process webhooks at a steady rate
    max_dispatches_per_second = 200
    max_concurrent_dispatches = 50
    max_burst_size            = 100
  }

  retry_config {
    max_attempts  = 3
    min_backoff   = "5s"
    max_backoff   = "60s"
    max_doublings = 3
  }

  stackdriver_logging_config {
    sampling_ratio = 0.1  # Sample 10% for cost efficiency
  }
}
```

## Multiple Queues with Different Priorities

A common pattern is to have separate queues for different priority levels:

```hcl
# Priority queue definitions
variable "task_queues" {
  type = map(object({
    max_dispatches_per_second = number
    max_concurrent_dispatches = number
    max_attempts              = number
    min_backoff               = string
    max_backoff               = string
  }))
  default = {
    "high-priority" = {
      max_dispatches_per_second = 500
      max_concurrent_dispatches = 100
      max_attempts              = 5
      min_backoff               = "1s"
      max_backoff               = "60s"
    }
    "default" = {
      max_dispatches_per_second = 100
      max_concurrent_dispatches = 20
      max_attempts              = 10
      min_backoff               = "5s"
      max_backoff               = "300s"
    }
    "low-priority" = {
      max_dispatches_per_second = 10
      max_concurrent_dispatches = 5
      max_attempts              = 20
      min_backoff               = "30s"
      max_backoff               = "3600s"
    }
  }
}

# Create all queues
resource "google_cloud_tasks_queue" "priority_queues" {
  for_each = var.task_queues
  name     = each.key
  location = var.region

  rate_limits {
    max_dispatches_per_second = each.value.max_dispatches_per_second
    max_concurrent_dispatches = each.value.max_concurrent_dispatches
  }

  retry_config {
    max_attempts = each.value.max_attempts
    min_backoff  = each.value.min_backoff
    max_backoff  = each.value.max_backoff
    max_doublings = 5
  }

  stackdriver_logging_config {
    sampling_ratio = 0.5
  }
}
```

## IAM Configuration

Cloud Tasks needs IAM permissions for two operations: adding tasks to the queue (enqueuing) and the service account identity used when dispatching tasks (the OIDC or OAuth token):

```hcl
# Service account for the task handler (Cloud Run, Cloud Functions, etc.)
resource "google_service_account" "task_handler" {
  account_id   = "task-handler"
  display_name = "Task Handler Service Account"
}

# Service account for the task creator (the application that enqueues tasks)
resource "google_service_account" "task_creator" {
  account_id   = "task-creator"
  display_name = "Task Creator Service Account"
}

# Allow the creator to add tasks to the queue
resource "google_cloud_tasks_queue_iam_member" "enqueue" {
  name     = google_cloud_tasks_queue.email.name
  location = var.region
  role     = "roles/cloudtasks.enqueuer"
  member   = "serviceAccount:${google_service_account.task_creator.email}"
}

# Allow the handler service account to be used as the OIDC identity
# when Cloud Tasks dispatches HTTP requests
resource "google_service_account_iam_member" "task_token" {
  service_account_id = google_service_account.task_handler.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.task_creator.email}"
}

# Grant the task handler permissions it needs
# (e.g., Cloud Run invoker if the handler is a Cloud Run service)
resource "google_cloud_run_service_iam_member" "task_invoker" {
  service  = "task-handler-service"  # Your Cloud Run service name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.task_handler.email}"
}
```

## Queue with HTTP Target Configuration

When you create tasks programmatically, they target HTTP endpoints. Here is how the overall architecture fits together:

```hcl
# Cloud Run service as the task handler
resource "google_cloud_run_v2_service" "task_handler" {
  name     = "task-handler"
  location = var.region

  template {
    service_account = google_service_account.task_handler.email

    containers {
      image = "gcr.io/${var.project_id}/task-handler:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    # Increase timeout for long-running tasks
    timeout = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }
}

# Queue that dispatches to the Cloud Run service
resource "google_cloud_tasks_queue" "cloud_run_queue" {
  name     = "cloud-run-tasks"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 50
    max_concurrent_dispatches = 10
  }

  retry_config {
    max_attempts  = 5
    min_backoff   = "10s"
    max_backoff   = "300s"
    max_doublings = 4
  }
}
```

## Pausing and Disabling Queues

You can pause a queue to stop task dispatching (tasks keep accumulating) or purge it to delete all tasks:

```hcl
# Create a queue in a paused state
resource "google_cloud_tasks_queue" "paused" {
  name     = "paused-queue"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 50
    max_concurrent_dispatches = 10
  }

  # Note: Terraform does not directly support pausing/resuming queues.
  # Use gcloud or the API to pause/resume:
  # gcloud tasks queues pause paused-queue --location=us-central1
  # gcloud tasks queues resume paused-queue --location=us-central1
}
```

## Outputs

```hcl
output "email_queue_name" {
  description = "Full resource name of the email queue"
  value       = google_cloud_tasks_queue.email.id
}

output "priority_queue_names" {
  description = "Names of all priority queues"
  value       = { for k, v in google_cloud_tasks_queue.priority_queues : k => v.id }
}

output "task_handler_sa" {
  description = "Service account email for the task handler"
  value       = google_service_account.task_handler.email
}

output "task_creator_sa" {
  description = "Service account email for the task creator"
  value       = google_service_account.task_creator.email
}
```

## Best Practices

**Separate queues by task type.** Different task types have different rate limits and retry requirements. An email task and a data processing task should not share a queue.

**Set `max_concurrent_dispatches` to protect your backend.** This is more important than `max_dispatches_per_second` for preventing backend overload. Your backend can only handle so many requests at once.

**Use aggressive retry for critical tasks.** For tasks that must eventually succeed (like billing notifications), use high `max_attempts` and long `max_retry_duration`. For best-effort tasks (like analytics events), fewer retries with shorter durations are fine.

**Enable logging selectively.** Full logging (`sampling_ratio = 1.0`) is great for debugging but expensive at scale. Use 0.1 or lower for high-volume queues.

**Use OIDC tokens for Cloud Run and Cloud Functions targets.** This authenticates the task dispatch request using the service account, so your handler can verify the request comes from Cloud Tasks.

**Set appropriate timeouts on your handler.** Cloud Tasks has a dispatch deadline (default 10 minutes for HTTP tasks). Make sure your handler's timeout is shorter than this deadline.

## Conclusion

Cloud Tasks queues are straightforward to set up with Terraform but require thought about rate limits and retry behavior. The key decisions are how fast to dispatch tasks (protecting your backend), how many times to retry (matching the criticality of the task), and the backoff strategy (avoiding thundering herd problems). Getting these right means your asynchronous processing pipeline handles both normal traffic and failure scenarios gracefully.

For scheduled task execution, check out our guide on [creating Cloud Scheduler jobs with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-scheduler-jobs-with-terraform/view).
