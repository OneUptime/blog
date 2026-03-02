# How to Create Kubernetes Deployments with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Deployment, Infrastructure as Code, DevOps, Container

Description: Step-by-step guide to creating Kubernetes Deployments using Terraform including rolling updates, health checks, and resource management.

---

Deployments are the workhorse of Kubernetes. They manage the lifecycle of your application pods, handle rolling updates, and ensure the desired number of replicas are always running. While most people use kubectl or Helm to manage Deployments, using Terraform brings your application infrastructure under the same tool that manages your cloud resources, creating a single source of truth.

This guide walks through creating Kubernetes Deployments with Terraform, covering everything from basic pod specs to advanced configurations like rolling update strategies, health probes, and resource limits.

## Provider Configuration

```hcl
# providers.tf - Set up the Kubernetes provider
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
  config_path    = "~/.kube/config"
  config_context = "my-cluster"
}
```

## Basic Deployment

Here is a straightforward Deployment that runs three replicas of an Nginx web server.

```hcl
# deployment.tf - Basic Kubernetes Deployment
resource "kubernetes_deployment" "web" {
  metadata {
    name      = "web-server"
    namespace = "default"

    labels = {
      app        = "web-server"
      managed-by = "terraform"
    }
  }

  spec {
    # Run 3 replicas for high availability
    replicas = 3

    # Selector must match the pod template labels
    selector {
      match_labels = {
        app = "web-server"
      }
    }

    template {
      metadata {
        labels = {
          app     = "web-server"
          version = "1.0"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.25-alpine"

          port {
            container_port = 80
            name           = "http"
          }

          # Set resource requests and limits
          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }
        }
      }
    }
  }
}
```

## Deployment with Health Probes

Health probes are critical for production deployments. They tell Kubernetes when your app is ready to receive traffic and when it needs to be restarted.

```hcl
# deployment_with_probes.tf - Deployment with liveness and readiness probes
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api-server"
    namespace = "backend"

    labels = {
      app = "api-server"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api-server"
      }
    }

    template {
      metadata {
        labels = {
          app = "api-server"
        }
      }

      spec {
        container {
          name  = "api"
          image = "myregistry.io/api-server:v2.1.0"

          port {
            container_port = 8080
            name           = "http"
          }

          # Liveness probe - restart the container if this fails
          liveness_probe {
            http_get {
              path = "/healthz"
              port = 8080
            }
            initial_delay_seconds = 15
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          # Readiness probe - stop sending traffic if this fails
          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 5
            period_seconds        = 5
            timeout_seconds       = 2
            failure_threshold     = 3
          }

          # Startup probe - gives slow-starting containers time to initialize
          startup_probe {
            http_get {
              path = "/healthz"
              port = 8080
            }
            initial_delay_seconds = 0
            period_seconds        = 5
            failure_threshold     = 30  # 30 * 5 = 150 seconds to start
          }

          resources {
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "1Gi"
            }
          }
        }
      }
    }
  }
}
```

## Rolling Update Strategy

Control how Kubernetes rolls out updates to your pods.

```hcl
# rolling_update.tf - Deployment with explicit update strategy
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 5

    # Rolling update strategy configuration
    strategy {
      type = "RollingUpdate"

      rolling_update {
        # Allow at most 1 extra pod during updates
        max_surge = "1"

        # Never have fewer than 4 pods available during updates
        max_unavailable = "1"
      }
    }

    # Keep 5 old ReplicaSets for easy rollback
    revision_history_limit = 5

    # Wait 60 seconds after a pod is ready before continuing the rollout
    min_ready_seconds = 10

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        # Spread pods across nodes for high availability
        topology_spread_constraint {
          max_skew           = 1
          topology_key       = "kubernetes.io/hostname"
          when_unsatisfiable = "DoNotSchedule"

          label_selector {
            match_labels = {
              app = "my-app"
            }
          }
        }

        container {
          name  = "app"
          image = "myregistry.io/my-app:v3.0.0"

          port {
            container_port = 8080
          }

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

## Deployment with Environment Variables and ConfigMap

Most applications need configuration injected at runtime.

```hcl
# deployment_with_config.tf - Deployment using ConfigMap and Secrets
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "default"
  }

  data = {
    DATABASE_HOST = "db.internal.svc.cluster.local"
    LOG_LEVEL     = "info"
    CACHE_TTL     = "300"
  }
}

resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = "default"
  }

  data = {
    DATABASE_PASSWORD = base64encode("supersecretpassword")
    API_KEY           = base64encode("myapikey123")
  }

  type = "Opaque"
}

resource "kubernetes_deployment" "configured_app" {
  metadata {
    name      = "configured-app"
    namespace = "default"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "configured-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "configured-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/configured-app:latest"

          # Individual environment variables
          env {
            name  = "APP_NAME"
            value = "configured-app"
          }

          # Environment variable from ConfigMap
          env {
            name = "DATABASE_HOST"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app_config.metadata[0].name
                key  = "DATABASE_HOST"
              }
            }
          }

          # Environment variable from Secret
          env {
            name = "DATABASE_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "DATABASE_PASSWORD"
              }
            }
          }

          # Load all ConfigMap keys as environment variables
          env_from {
            config_map_ref {
              name = kubernetes_config_map.app_config.metadata[0].name
            }
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }
        }
      }
    }
  }
}
```

## Deployment with Volumes

Mount persistent storage or configuration files into your pods.

```hcl
# deployment_with_volumes.tf - Deployment with various volume types
resource "kubernetes_deployment" "app_with_volumes" {
  metadata {
    name      = "app-with-storage"
    namespace = "default"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "app-with-storage"
      }
    }

    template {
      metadata {
        labels = {
          app = "app-with-storage"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/app:latest"

          # Mount the PVC at /data
          volume_mount {
            name       = "data-volume"
            mount_path = "/data"
          }

          # Mount the ConfigMap as files at /config
          volume_mount {
            name       = "config-volume"
            mount_path = "/config"
            read_only  = true
          }

          # Temporary directory for cache
          volume_mount {
            name       = "cache"
            mount_path = "/tmp/cache"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }
        }

        # Volume definitions
        volume {
          name = "data-volume"
          persistent_volume_claim {
            claim_name = "app-data-pvc"
          }
        }

        volume {
          name = "config-volume"
          config_map {
            name = kubernetes_config_map.app_config.metadata[0].name
          }
        }

        volume {
          name = "cache"
          empty_dir {
            medium     = "Memory"
            size_limit = "100Mi"
          }
        }
      }
    }
  }
}
```

## Using Variables for Flexibility

Make your Deployment configuration reusable across environments.

```hcl
# variables.tf
variable "app_name" {
  type    = string
  default = "my-app"
}

variable "image_tag" {
  type        = string
  description = "Container image tag to deploy"
}

variable "replicas" {
  type    = number
  default = 3
}

variable "environment" {
  type    = string
  default = "production"
}

# deployment.tf - Parameterized deployment
resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.app_name
    namespace = var.environment

    labels = {
      app         = var.app_name
      environment = var.environment
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = var.app_name
      }
    }

    template {
      metadata {
        labels = {
          app         = var.app_name
          environment = var.environment
        }
      }

      spec {
        container {
          name  = var.app_name
          image = "myregistry.io/${var.app_name}:${var.image_tag}"

          resources {
            requests = {
              cpu    = var.environment == "production" ? "500m" : "100m"
              memory = var.environment == "production" ? "512Mi" : "128Mi"
            }
            limits = {
              cpu    = var.environment == "production" ? "1" : "250m"
              memory = var.environment == "production" ? "1Gi" : "256Mi"
            }
          }
        }
      }
    }
  }
}
```

## Lifecycle Management

Terraform's lifecycle features help manage deployments safely.

```hcl
resource "kubernetes_deployment" "managed_app" {
  metadata {
    name      = "managed-app"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "managed-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "managed-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/managed-app:v1.0.0"

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

  # Ignore changes to replicas if HPA is managing scaling
  lifecycle {
    ignore_changes = [
      spec[0].replicas,
    ]
  }
}
```

This `ignore_changes` on replicas is important when you use a Horizontal Pod Autoscaler. Without it, Terraform would try to reset the replica count back to the value in your configuration every time you run apply.

## Monitoring Your Deployments

Once your deployments are running, you need visibility into their health. Track pod restarts, deployment rollout status, and container resource usage. [OneUptime](https://oneuptime.com) can monitor the endpoints exposed by your deployments, alerting you when response times degrade or services go down.

## Summary

Creating Kubernetes Deployments with Terraform gives you version-controlled, repeatable application infrastructure. The key patterns to remember are: always set resource requests and limits, use health probes for production workloads, configure rolling update strategies appropriate for your application, and use `lifecycle.ignore_changes` when other controllers (like HPA) manage certain fields.

Next, learn how to expose your deployments to traffic with [Kubernetes Services in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-services-with-terraform/view).
