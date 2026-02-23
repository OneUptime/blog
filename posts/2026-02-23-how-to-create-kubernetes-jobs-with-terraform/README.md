# How to Create Kubernetes Jobs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Jobs, Batch Processing, Infrastructure as Code

Description: How to create Kubernetes Jobs with Terraform for running one-off and batch tasks like database migrations, data processing, and backups.

---

Kubernetes Jobs run pods that are expected to terminate. Unlike Deployments that keep pods running indefinitely, Jobs are for tasks that run to completion - database migrations, batch data processing, report generation, backup operations, and similar workloads. Managing Jobs through Terraform is especially useful when they are part of your infrastructure setup, like running a database migration as part of a deployment pipeline.

This guide covers creating Kubernetes Jobs with Terraform, from simple one-off tasks to parallel batch processing configurations.

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

## Simple Job

A basic Job that runs a single task to completion.

```hcl
# job.tf - Simple one-shot job
resource "kubernetes_job" "db_migration" {
  metadata {
    name      = "db-migration-v3"
    namespace = "backend"

    labels = {
      app        = "db-migration"
      version    = "v3"
      managed-by = "terraform"
    }
  }

  spec {
    # Number of times the Job should be run successfully
    completions = 1

    # Number of pods that can run in parallel
    parallelism = 1

    # Maximum number of retries before marking the Job as failed
    backoff_limit = 3

    # Automatically clean up the Job after 1 hour
    ttl_seconds_after_finished = 3600

    # Time limit for the entire Job
    active_deadline_seconds = 600  # 10 minutes

    template {
      metadata {
        labels = {
          app = "db-migration"
        }
      }

      spec {
        # Jobs should not restart on failure - let the Job controller handle retries
        restart_policy = "Never"

        container {
          name  = "migrate"
          image = "myregistry.io/db-migrator:v3"

          command = ["./migrate", "--target", "v3"]

          env {
            name  = "DATABASE_HOST"
            value = "postgres.database.svc.cluster.local"
          }

          env {
            name = "DATABASE_PASSWORD"
            value_from {
              secret_key_ref {
                name = "db-credentials"
                key  = "password"
              }
            }
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
      }
    }
  }

  # Wait for the Job to complete before continuing
  wait_for_completion = true

  timeouts {
    create = "10m"
    update = "10m"
  }
}
```

## Parallel Batch Job

Run multiple pods in parallel to process a batch of work.

```hcl
# parallel_job.tf - Process work in parallel
resource "kubernetes_job" "batch_processor" {
  metadata {
    name      = "batch-processor"
    namespace = "data-pipeline"
  }

  spec {
    # Total number of successful completions needed
    completions = 10

    # Run 5 pods at a time
    parallelism = 5

    # Each pod can fail up to 3 times before the Job gives up
    backoff_limit = 6

    # Completion mode: Indexed gives each pod a unique index
    completion_mode = "Indexed"

    template {
      metadata {
        labels = {
          app = "batch-processor"
        }
      }

      spec {
        restart_policy = "Never"

        container {
          name  = "processor"
          image = "myregistry.io/batch-processor:latest"

          # The JOB_COMPLETION_INDEX env var is set automatically
          # Each pod gets a unique index from 0 to completions-1
          env {
            name  = "TOTAL_PARTITIONS"
            value = "10"
          }

          resources {
            requests = {
              cpu    = "500m"
              memory = "1Gi"
            }
            limits = {
              cpu    = "1"
              memory = "2Gi"
            }
          }
        }
      }
    }
  }

  wait_for_completion = true

  timeouts {
    create = "30m"
  }
}
```

## Job with Volume Mounts

Jobs often need to read input data or write output to persistent storage.

```hcl
# job_with_volumes.tf - Job that processes data from a PVC
resource "kubernetes_job" "data_export" {
  metadata {
    name      = "data-export"
    namespace = "data-pipeline"
  }

  spec {
    completions   = 1
    backoff_limit = 2

    ttl_seconds_after_finished = 7200

    template {
      metadata {
        labels = {
          app = "data-export"
        }
      }

      spec {
        restart_policy = "Never"

        # Init container to set up the output directory
        init_container {
          name  = "setup"
          image = "busybox:1.36"

          command = ["sh", "-c", "mkdir -p /output/$(date +%Y%m%d)"]

          volume_mount {
            name       = "output"
            mount_path = "/output"
          }
        }

        container {
          name  = "exporter"
          image = "myregistry.io/data-exporter:v1"

          command = [
            "./export",
            "--format", "csv",
            "--output-dir", "/output",
            "--date-range", "last-7-days",
          ]

          volume_mount {
            name       = "output"
            mount_path = "/output"
          }

          volume_mount {
            name       = "config"
            mount_path = "/etc/exporter"
            read_only  = true
          }

          resources {
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "1"
              memory = "2Gi"
            }
          }
        }

        volume {
          name = "output"
          persistent_volume_claim {
            claim_name = "export-output"
          }
        }

        volume {
          name = "config"
          config_map {
            name = "exporter-config"
          }
        }
      }
    }
  }
}
```

## Job with Service Account

Jobs that interact with the Kubernetes API or cloud services need appropriate permissions.

```hcl
# job_with_sa.tf - Job with custom service account
resource "kubernetes_service_account" "backup_sa" {
  metadata {
    name      = "backup-runner"
    namespace = "default"

    # GKE Workload Identity annotation
    annotations = {
      "iam.gke.io/gcp-service-account" = "backup-runner@my-project.iam.gserviceaccount.com"
    }
  }
}

resource "kubernetes_job" "backup" {
  metadata {
    name      = "cluster-backup"
    namespace = "default"
  }

  spec {
    completions   = 1
    backoff_limit = 2

    ttl_seconds_after_finished = 86400  # Clean up after 24 hours

    template {
      metadata {
        labels = {
          app = "cluster-backup"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.backup_sa.metadata[0].name
        restart_policy       = "OnFailure"

        container {
          name  = "backup"
          image = "myregistry.io/cluster-backup:v2"

          command = [
            "./backup",
            "--destination", "gs://my-backup-bucket/cluster",
            "--compress",
          ]

          resources {
            requests = {
              cpu    = "200m"
              memory = "256Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }
}
```

## Job Triggered by Terraform Changes

You can use Terraform triggers to re-run Jobs when dependencies change.

```hcl
# triggered_job.tf - Re-run when the app version changes
variable "app_version" {
  type    = string
  default = "v3"
}

resource "kubernetes_job" "migration" {
  metadata {
    # Include version in the name since Jobs are immutable
    name      = "migration-${var.app_version}"
    namespace = "default"
  }

  spec {
    completions   = 1
    backoff_limit = 3

    ttl_seconds_after_finished = 3600

    template {
      metadata {
        labels = {
          app     = "migration"
          version = var.app_version
        }
      }

      spec {
        restart_policy = "Never"

        container {
          name  = "migrate"
          image = "myregistry.io/migrator:${var.app_version}"

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

  wait_for_completion = true

  timeouts {
    create = "10m"
  }
}
```

## Important Notes about Jobs in Terraform

There are a few quirks to be aware of when managing Jobs with Terraform:

1. **Jobs are immutable** - Once created, you cannot update a Job's spec. If you need to change it, Terraform will delete and recreate it. Include version information in the Job name to make this explicit.

2. **wait_for_completion** - Setting this to `true` makes Terraform block until the Job finishes. This is useful for migrations that must complete before other resources are created, but it means your Terraform apply will take as long as the Job runs.

3. **ttl_seconds_after_finished** - Always set this to avoid accumulating completed Job objects in your cluster. Without it, completed Jobs stay around forever.

4. **Restart policies** - Jobs only support `Never` and `OnFailure`. Using `Never` means a new pod is created for each retry. Using `OnFailure` means the same pod is restarted.

## Monitoring Job Execution

Track whether your Jobs complete successfully, how long they take, and whether they are hitting retry limits. Failed Jobs can indicate infrastructure problems (out of memory, network issues) or application bugs. [OneUptime](https://oneuptime.com) can help you monitor the services that depend on successful Job execution, catching issues downstream when critical batch tasks fail.

## Summary

Kubernetes Jobs in Terraform provide a declarative way to manage batch and one-off tasks. Key considerations include setting appropriate backoff limits and deadlines, using TTL to clean up completed Jobs, choosing the right restart policy, and deciding whether Terraform should wait for completion. For recurring tasks, check out [Kubernetes CronJobs with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-cronjobs-with-terraform/view).
