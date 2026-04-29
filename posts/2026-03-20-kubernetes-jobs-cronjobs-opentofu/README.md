# How to Create Kubernetes Jobs and CronJobs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Job, CronJob, OpenTofu, Batch Processing, Infrastructure

Description: Learn how to create Kubernetes Jobs and CronJobs with OpenTofu for one-time batch tasks, database migrations, and scheduled workloads.

## Overview

Kubernetes Jobs run one-off tasks to completion, while CronJobs schedule recurring tasks using cron syntax. OpenTofu manages both resource types for batch processing, database migrations, and scheduled reports.

## Step 1: Create a Kubernetes Job

```hcl
# main.tf - Database migration job

resource "kubernetes_job_v1" "db_migration" {
  metadata {
    name      = "database-migration"
    namespace = "production"
  }

  spec {
    # Number of successful completions required
    completions = 1
    parallelism = 1

    # Retry on failure
    backoff_limit = 3

    # Automatically delete job after 300 seconds of completion
    ttl_seconds_after_finished = 300

    template {
      metadata {
        labels = {
          app = "db-migration"
        }
      }

      spec {
        restart_policy = "OnFailure"

        container {
          name  = "migration"
          image = "myregistry/my-app:v2.0.0"
          args  = ["migrate", "--direction=up"]

          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = "app-secrets"
                key  = "database-url"
              }
            }
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "256Mi"
            }
          }
        }

        service_account_name = "migration-sa"
      }
    }
  }

  # Wait for the job to complete before tofu apply finishes
  wait_for_completion = true

  timeouts {
    create = "5m"
  }
}
```

## Step 2: Create a CronJob

```hcl
# Nightly report generation CronJob
resource "kubernetes_cron_job_v1" "nightly_report" {
  metadata {
    name      = "nightly-report-generator"
    namespace = "production"
  }

  spec {
    # Run at midnight UTC daily
    schedule           = "0 0 * * *"
    timezone           = "UTC"
    concurrency_policy = "Forbid"  # Don't run if previous is still running

    # Keep history
    successful_jobs_history_limit = 3
    failed_jobs_history_limit     = 1

    # Start within 120 seconds of scheduled time
    starting_deadline_seconds = 120

    job_template {
      metadata {}

      spec {
        completions   = 1
        backoff_limit = 2

        template {
          metadata {}

          spec {
            restart_policy = "OnFailure"

            container {
              name  = "report-generator"
              image = "myregistry/report-generator:latest"
              args  = ["generate-daily-report"]

              env {
                name  = "REPORT_DATE"
                value = "yesterday"
              }

              resources {
                requests = {
                  cpu    = "500m"
                  memory = "1Gi"
                }
                limits = {
                  cpu    = "2"
                  memory = "4Gi"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Step 3: Parallel Job with Indexed Completion Mode

```hcl
# Parallel job processing multiple work items
resource "kubernetes_job_v1" "parallel_processor" {
  metadata {
    name      = "batch-data-processor"
    namespace = "production"
  }

  spec {
    completions             = 10   # Process 10 items total
    parallelism             = 5    # Run 5 pods at a time
    completion_mode         = "Indexed"  # Each pod gets a unique index
    backoff_limit           = 3
    ttl_seconds_after_finished = 600

    template {
      metadata {}

      spec {
        restart_policy = "OnFailure"

        container {
          name  = "processor"
          image = "myregistry/processor:latest"
          # Indexed Jobs automatically expose JOB_COMPLETION_INDEX
        }
      }
    }
  }
}
```

## Summary

Kubernetes Jobs and CronJobs with OpenTofu handle batch processing and scheduled tasks reliably. Use Jobs with `wait_for_completion = true` for ordered operations like database migrations, CronJobs with `concurrency_policy = "Forbid"` to prevent overlapping runs, and `ttl_seconds_after_finished` to automatically clean up completed jobs.
