# How to Create Kubernetes StatefulSets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, OpenTofu, Database, Persistent Storage, Infrastructure

Description: Learn how to create Kubernetes StatefulSets with OpenTofu for stateful applications that require stable network identities, ordered deployment, and persistent storage.

## Overview

StatefulSets manage stateful applications that require stable, unique network identifiers, persistent storage, and ordered, graceful deployment. They're ideal for databases, message queues, and distributed systems. OpenTofu manages StatefulSet definitions with persistent volume claims.

## Step 1: Create a StatefulSet for PostgreSQL

```hcl
# main.tf - PostgreSQL StatefulSet

resource "kubernetes_stateful_set_v1" "postgres" {
  metadata {
    name      = "postgres"
    namespace = "production"
  }

  spec {
    service_name          = kubernetes_service_v1.postgres_headless.metadata[0].name
    replicas              = 3
    pod_management_policy = "OrderedReady"

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

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.postgres_secret.metadata[0].name
                key  = "password"
              }
            }
          }

          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          volume_mount {
            name       = "postgres-data"
            mount_path = "/var/lib/postgresql/data"
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

          liveness_probe {
            exec {
              command = ["pg_isready", "-U", "postgres"]
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }
        }
      }
    }

    # Volume Claim Templates create a PVC for each pod
    volume_claim_template {
      metadata {
        name = "postgres-data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        storage_class_name = "premium-rwo"

        resources {
          requests = {
            storage = "50Gi"
          }
        }
      }
    }

    update_strategy {
      type = "RollingUpdate"
      rolling_update {
        partition = 0  # Update all pods (set > 0 to stage higher ordinals first)
      }
    }
  }
}

# Headless service for stable DNS names (postgres-0.postgres-headless, etc.)
resource "kubernetes_service_v1" "postgres_headless" {
  metadata {
    name      = "postgres-headless"
    namespace = "production"
  }

  spec {
    cluster_ip = "None"  # Headless - no cluster IP
    selector = {
      app = "postgres"
    }

    port {
      port        = 5432
      target_port = 5432
    }
  }
}
```

## Step 2: Redis StatefulSet with Persistent Storage

```hcl
resource "kubernetes_stateful_set_v1" "redis" {
  metadata {
    name      = "redis"
    namespace = "production"
  }

  spec {
    service_name = kubernetes_service_v1.redis_headless.metadata[0].name
    replicas     = 3

    selector {
      match_labels = { app = "redis" }
    }

    template {
      metadata {
        labels = { app = "redis" }
      }

      spec {
        container {
          name  = "redis"
          image = "redis:7-alpine"
          args  = ["--appendonly", "yes", "--requirepass", "$(REDIS_PASSWORD)"]

          port {
            container_port = 6379
          }

          env {
            name = "REDIS_PASSWORD"
            value_from {
              secret_key_ref {
                name = "redis-secret"
                key  = "password"
              }
            }
          }

          volume_mount {
            name       = "redis-data"
            mount_path = "/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "redis-data"
      }
      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = { storage = "10Gi" }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "redis_headless" {
  metadata {
    name      = "redis-headless"
    namespace = "production"
  }

  spec {
    cluster_ip = "None"
    selector = {
      app = "redis"
    }

    port {
      port        = 6379
      target_port = 6379
    }
  }
}
```

## Summary

Kubernetes StatefulSets with OpenTofu provide reliable, ordered deployment of stateful applications. Volume claim templates automatically provision PVCs for each replica, and the headless service provides stable DNS names for direct pod addressing. Use `partition` in rolling updates to stage updates or perform canary-style rollouts of stateful applications.
