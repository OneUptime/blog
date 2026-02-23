# How to Create Kubernetes CronJobs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, CronJobs, Scheduling, Batch Processing, Infrastructure as Code

Description: How to create Kubernetes CronJobs using Terraform to schedule recurring tasks like backups, reports, and maintenance operations.

---

CronJobs are the Kubernetes equivalent of cron on Linux. They run Jobs on a schedule, making them perfect for recurring tasks like database backups, report generation, cache cleanup, and health check routines. Managing CronJobs through Terraform ensures your scheduled tasks are version-controlled and consistent across environments.

This guide covers creating CronJobs with Terraform, including schedule syntax, concurrency policies, and failure handling.

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Basic CronJob

A CronJob that runs a database backup every night at 2 AM.

```hcl
# cronjob.tf - Nightly database backup
resource "kubernetes_cron_job_v1" "db_backup" {
  metadata {
    name      = "db-backup"
    namespace = "database"

    labels = {
      app        = "db-backup"
      managed-by = "terraform"
    }
  }

  spec {
    # Run at 2:00 AM every day
    schedule = "0 2 * * *"

    # Timezone (requires Kubernetes 1.27+)
    # time_zone = "America/New_York"

    # Keep 3 successful and 1 failed job for debugging
    successful_jobs_history_limit = 3
    failed_jobs_history_limit     = 1

    # What to do if the previous job is still running
    concurrency_policy = "Forbid"

    # If the CronJob misses too many scheduled times, skip it
    starting_deadline_seconds = 600  # 10 minutes

    job_template {
      metadata {
        labels = {
          app = "db-backup"
        }
      }

      spec {
        # Clean up completed jobs after 12 hours
        ttl_seconds_after_finished = 43200

        backoff_limit = 2

        active_deadline_seconds = 3600  # 1 hour max

        template {
          metadata {
            labels = {
              app = "db-backup"
            }
          }

          spec {
            restart_policy = "OnFailure"

            container {
              name  = "backup"
              image = "myregistry.io/pg-backup:v2"

              command = [
                "sh", "-c",
                "pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backup/db-$(date +%Y%m%d-%H%M%S).sql.gz"
              ]

              env {
                name  = "DB_HOST"
                value = "postgres.database.svc.cluster.local"
              }

              env {
                name  = "DB_NAME"
                value = "production"
              }

              env {
                name  = "DB_USER"
                value = "backup_user"
              }

              env {
                name = "PGPASSWORD"
                value_from {
                  secret_key_ref {
                    name = "db-credentials"
                    key  = "backup-password"
                  }
                }
              }

              volume_mount {
                name       = "backup-storage"
                mount_path = "/backup"
              }

              resources {
                requests = {
                  cpu    = "100m"
                  memory = "256Mi"
                }
                limits = {
                  cpu    = "500m"
                  memory = "512Mi"
                }
              }
            }

            volume {
              name = "backup-storage"
              persistent_volume_claim {
                claim_name = "backup-pvc"
              }
            }
          }
        }
      }
    }
  }
}
```

## Understanding Cron Schedule Syntax

The schedule field uses standard cron format with five fields:

```
# +------------ minute (0-59)
# | +---------- hour (0-23)
# | | +-------- day of month (1-31)
# | | | +------ month (1-12)
# | | | | +---- day of week (0-6, Sunday=0)
# | | | | |
# * * * * *
```

Common examples:

```hcl
# Every 5 minutes
schedule = "*/5 * * * *"

# Every hour at minute 0
schedule = "0 * * * *"

# Every day at midnight
schedule = "0 0 * * *"

# Every Monday at 9 AM
schedule = "0 9 * * 1"

# First day of every month at 6 AM
schedule = "0 6 1 * *"

# Weekdays at 8:30 AM
schedule = "30 8 * * 1-5"
```

## CronJob for Cache Cleanup

```hcl
# cache_cleanup.tf - Clean up expired cache entries hourly
resource "kubernetes_cron_job_v1" "cache_cleanup" {
  metadata {
    name      = "cache-cleanup"
    namespace = "default"
  }

  spec {
    schedule = "0 * * * *"  # Every hour

    concurrency_policy            = "Replace"  # Kill the old one if still running
    successful_jobs_history_limit = 1
    failed_jobs_history_limit     = 3

    job_template {
      metadata {}

      spec {
        backoff_limit              = 1
        ttl_seconds_after_finished = 3600

        template {
          metadata {
            labels = {
              app = "cache-cleanup"
            }
          }

          spec {
            restart_policy = "Never"

            container {
              name  = "cleanup"
              image = "redis:7-alpine"

              command = [
                "sh", "-c",
                "redis-cli -h redis.cache.svc.cluster.local --scan --pattern 'temp:*' | xargs -L 100 redis-cli -h redis.cache.svc.cluster.local DEL"
              ]

              resources {
                requests = {
                  cpu    = "50m"
                  memory = "64Mi"
                }
                limits = {
                  cpu    = "200m"
                  memory = "128Mi"
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

## CronJob for Report Generation

```hcl
# report.tf - Weekly report generation
resource "kubernetes_cron_job_v1" "weekly_report" {
  metadata {
    name      = "weekly-report"
    namespace = "reporting"
  }

  spec {
    # Every Monday at 7 AM
    schedule = "0 7 * * 1"

    concurrency_policy            = "Forbid"
    successful_jobs_history_limit = 5
    failed_jobs_history_limit     = 3

    job_template {
      metadata {
        labels = {
          app = "weekly-report"
        }
      }

      spec {
        backoff_limit           = 3
        active_deadline_seconds = 7200  # 2 hours max

        template {
          metadata {
            labels = {
              app = "weekly-report"
            }
          }

          spec {
            restart_policy       = "OnFailure"
            service_account_name = "report-runner"

            container {
              name  = "reporter"
              image = "myregistry.io/report-generator:v4"

              args = ["--type", "weekly", "--format", "pdf", "--send-email"]

              env_from {
                config_map_ref {
                  name = "report-config"
                }
              }

              env_from {
                secret_ref {
                  name = "report-secrets"
                }
              }

              volume_mount {
                name       = "reports"
                mount_path = "/reports"
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

            volume {
              name = "reports"
              persistent_volume_claim {
                claim_name = "reports-pvc"
              }
            }
          }
        }
      }
    }
  }
}
```

## Concurrency Policies

CronJobs have three concurrency policies that control what happens when a scheduled run overlaps with a previous run:

```hcl
# Allow - Multiple jobs can run concurrently (default)
concurrency_policy = "Allow"

# Forbid - Skip the new run if the previous one is still running
concurrency_policy = "Forbid"

# Replace - Kill the running job and start a new one
concurrency_policy = "Replace"
```

Choose `Forbid` for tasks that should not overlap (like database backups). Choose `Replace` for tasks where the latest run is more important (like cache refresh). Use `Allow` when it is safe for multiple runs to execute simultaneously.

## Suspending a CronJob

You can temporarily suspend a CronJob without deleting it.

```hcl
# suspended_cronjob.tf - A CronJob that is paused
resource "kubernetes_cron_job_v1" "suspended_task" {
  metadata {
    name      = "maintenance-task"
    namespace = "default"
  }

  spec {
    schedule = "0 3 * * *"

    # Suspend the CronJob - no new Jobs will be created
    suspend = true

    job_template {
      metadata {}

      spec {
        template {
          metadata {
            labels = {
              app = "maintenance"
            }
          }

          spec {
            restart_policy = "Never"

            container {
              name    = "maintenance"
              image   = "myregistry.io/maintenance:v1"
              command = ["./run-maintenance"]

              resources {
                requests = {
                  cpu    = "100m"
                  memory = "128Mi"
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

## Creating Multiple CronJobs with for_each

When you have several scheduled tasks, use `for_each` to keep things consistent.

```hcl
# multi_cronjobs.tf - Multiple CronJobs from configuration
variable "scheduled_tasks" {
  type = map(object({
    schedule   = string
    image      = string
    command    = list(string)
    cpu_limit  = optional(string, "200m")
    mem_limit  = optional(string, "256Mi")
  }))
  default = {
    cleanup = {
      schedule = "0 */6 * * *"
      image    = "myregistry.io/cleanup:v1"
      command  = ["./cleanup", "--older-than", "7d"]
    }
    sync = {
      schedule = "*/30 * * * *"
      image    = "myregistry.io/sync:v2"
      command  = ["./sync", "--full"]
    }
    healthcheck = {
      schedule  = "*/5 * * * *"
      image     = "myregistry.io/healthcheck:v1"
      command   = ["./check", "--all-services"]
      cpu_limit = "100m"
      mem_limit = "128Mi"
    }
  }
}

resource "kubernetes_cron_job_v1" "tasks" {
  for_each = var.scheduled_tasks

  metadata {
    name      = each.key
    namespace = "default"
  }

  spec {
    schedule                      = each.value.schedule
    concurrency_policy            = "Forbid"
    successful_jobs_history_limit = 3
    failed_jobs_history_limit     = 1

    job_template {
      metadata {
        labels = {
          app  = each.key
          type = "scheduled-task"
        }
      }

      spec {
        backoff_limit              = 2
        ttl_seconds_after_finished = 3600

        template {
          metadata {
            labels = {
              app = each.key
            }
          }

          spec {
            restart_policy = "Never"

            container {
              name    = each.key
              image   = each.value.image
              command = each.value.command

              resources {
                requests = {
                  cpu    = "50m"
                  memory = "64Mi"
                }
                limits = {
                  cpu    = each.value.cpu_limit
                  memory = each.value.mem_limit
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

## Monitoring Scheduled Tasks

CronJobs that fail silently are a common source of incidents. A backup CronJob that has been failing for weeks is only discovered when you actually need the backup. Monitor your CronJobs by tracking whether they run on schedule, whether they complete successfully, and how long they take. [OneUptime](https://oneuptime.com) can help you set up alerts for failed jobs and track the downstream impact on your services.

## Summary

Kubernetes CronJobs managed through Terraform provide reliable, version-controlled task scheduling. The key configuration points are: the cron schedule, concurrency policy (Forbid, Replace, or Allow), history limits for debugging, and TTL for automatic cleanup. Use `for_each` when managing multiple scheduled tasks, and always set appropriate resource limits and deadlines to prevent runaway jobs from impacting your cluster.

For one-off tasks that do not need scheduling, see [Kubernetes Jobs with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-jobs-with-terraform/view).
