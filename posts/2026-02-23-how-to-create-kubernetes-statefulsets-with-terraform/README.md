# How to Create Kubernetes StatefulSets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, StatefulSets, Stateful Applications, Infrastructure as Code

Description: How to create Kubernetes StatefulSets using Terraform for running stateful applications like databases, message queues, and distributed systems.

---

StatefulSets are the Kubernetes workload type designed for applications that need stable network identities, persistent storage, and ordered deployment. Think databases, message brokers, and distributed systems like Elasticsearch or ZooKeeper. Unlike Deployments where pods are interchangeable, StatefulSet pods get a sticky identity that persists across rescheduling.

This guide covers creating StatefulSets with Terraform, including persistent volume claims, headless services, and the configuration patterns you need for production stateful workloads.

## How StatefulSets Differ from Deployments

Before diving into code, it helps to understand what makes StatefulSets special:

- **Stable pod names**: Pods get predictable names like `web-0`, `web-1`, `web-2` instead of random suffixes
- **Ordered operations**: Pods are created sequentially (0, 1, 2) and terminated in reverse order
- **Stable storage**: Each pod gets its own PersistentVolumeClaim that follows it across rescheduling
- **Stable network identity**: Combined with a headless Service, each pod gets a DNS name

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

## Headless Service (Required)

Every StatefulSet needs a headless Service. This provides DNS entries for individual pods.

```hcl
# headless_service.tf - Required for StatefulSet DNS
resource "kubernetes_service" "postgres_headless" {
  metadata {
    name      = "postgres"
    namespace = "database"

    labels = {
      app = "postgres"
    }
  }

  spec {
    # Headless service - no cluster IP
    cluster_ip = "None"

    selector = {
      app = "postgres"
    }

    port {
      name        = "postgres"
      port        = 5432
      target_port = 5432
    }
  }
}
```

With this Service, each pod gets a DNS name like `postgres-0.postgres.database.svc.cluster.local`.

## Basic StatefulSet

Here is a PostgreSQL StatefulSet with persistent storage.

```hcl
# statefulset.tf - PostgreSQL StatefulSet
resource "kubernetes_stateful_set" "postgres" {
  metadata {
    name      = "postgres"
    namespace = "database"

    labels = {
      app        = "postgres"
      managed-by = "terraform"
    }
  }

  spec {
    # Name of the headless service
    service_name = kubernetes_service.postgres_headless.metadata[0].name

    replicas = 3

    selector {
      match_labels = {
        app = "postgres"
      }
    }

    template {
      metadata {
        labels = {
          app = "postgres"
        }
      }

      spec {
        container {
          name  = "postgres"
          image = "postgres:16-alpine"

          port {
            container_port = 5432
            name           = "postgres"
          }

          # Environment variables for PostgreSQL
          env {
            name  = "POSTGRES_DB"
            value = "mydb"
          }

          env {
            name  = "POSTGRES_USER"
            value = "admin"
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = "postgres-credentials"
                key  = "password"
              }
            }
          }

          # Use the pod name as PGDATA to ensure each pod has its own data dir
          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          # Mount persistent storage
          volume_mount {
            name       = "data"
            mount_path = "/var/lib/postgresql/data"
          }

          resources {
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "1"
              memory = "1Gi"
            }
          }

          # Liveness and readiness probes
          liveness_probe {
            exec {
              command = ["pg_isready", "-U", "admin", "-d", "mydb"]
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            exec {
              command = ["pg_isready", "-U", "admin", "-d", "mydb"]
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }

    # Volume claim templates create a PVC for each pod
    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        storage_class_name = "standard"

        resources {
          requests = {
            storage = "10Gi"
          }
        }
      }
    }
  }
}
```

## StatefulSet with Init Containers

Init containers run before the main container and are useful for setup tasks like configuring replication.

```hcl
# statefulset_init.tf - StatefulSet with initialization logic
resource "kubernetes_stateful_set" "redis" {
  metadata {
    name      = "redis"
    namespace = "cache"
  }

  spec {
    service_name = "redis"
    replicas     = 3

    selector {
      match_labels = {
        app = "redis"
      }
    }

    template {
      metadata {
        labels = {
          app = "redis"
        }
      }

      spec {
        # Init container to configure Redis based on pod ordinal
        init_container {
          name  = "config"
          image = "redis:7-alpine"

          command = [
            "sh", "-c",
            <<-EOT
              # Determine if this pod is the master (ordinal 0) or a replica
              ORDINAL=$(echo $HOSTNAME | rev | cut -d'-' -f1 | rev)
              if [ "$ORDINAL" = "0" ]; then
                echo "This is the master"
                cp /mnt/master.conf /etc/redis/redis.conf
              else
                echo "This is a replica, master is redis-0.redis"
                cp /mnt/replica.conf /etc/redis/redis.conf
              fi
            EOT
          ]

          volume_mount {
            name       = "config"
            mount_path = "/mnt"
          }

          volume_mount {
            name       = "redis-config"
            mount_path = "/etc/redis"
          }
        }

        container {
          name  = "redis"
          image = "redis:7-alpine"

          command = ["redis-server", "/etc/redis/redis.conf"]

          port {
            container_port = 6379
            name           = "redis"
          }

          volume_mount {
            name       = "data"
            mount_path = "/data"
          }

          volume_mount {
            name       = "redis-config"
            mount_path = "/etc/redis"
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
          name = "config"
          config_map {
            name = "redis-config"
          }
        }

        volume {
          name = "redis-config"
          empty_dir {}
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        storage_class_name = "ssd"

        resources {
          requests = {
            storage = "5Gi"
          }
        }
      }
    }
  }
}
```

## Update Strategies

StatefulSets support two update strategies.

```hcl
# Rolling update - updates pods one at a time in reverse ordinal order
resource "kubernetes_stateful_set" "rolling_update" {
  metadata {
    name      = "app"
    namespace = "default"
  }

  spec {
    service_name = "app"
    replicas     = 5

    # Rolling update strategy
    update_strategy {
      type = "RollingUpdate"

      rolling_update {
        # Only update pods with ordinal >= 3 (useful for canary updates)
        partition = 0
      }
    }

    selector {
      match_labels = {
        app = "app"
      }
    }

    template {
      metadata {
        labels = {
          app = "app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/app:v2"

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = "1Gi"
          }
        }
      }
    }
  }
}
```

Setting `partition` to a non-zero value enables canary-style updates: only pods with an ordinal greater than or equal to the partition value get updated. This lets you test the new version on a subset of pods before rolling it out fully.

## Pod Management Policy

By default, StatefulSets create and delete pods sequentially. For workloads that do not need ordering, you can use parallel pod management.

```hcl
# For workloads that don't need ordered startup
spec {
  pod_management_policy = "Parallel"  # Default is "OrderedReady"
  # ...
}
```

## Monitoring Stateful Workloads

Stateful applications need extra monitoring attention. Watch for disk usage approaching PVC limits, replication lag between primary and replica pods, and pod restart loops that might indicate data corruption. [OneUptime](https://oneuptime.com) can monitor the services exposed by your StatefulSets, tracking availability and performance to catch issues early.

## Summary

StatefulSets in Terraform provide a declarative way to manage stateful applications on Kubernetes. The key pieces are: a headless Service for stable DNS, volume claim templates for per-pod persistent storage, and careful configuration of update strategies and pod management policies. Combined with init containers for replication setup and proper health probes, you can run production databases and distributed systems confidently with infrastructure as code.

For related storage topics, see our guide on [Kubernetes PersistentVolumes with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-persistentvolumes-with-terraform/view).
