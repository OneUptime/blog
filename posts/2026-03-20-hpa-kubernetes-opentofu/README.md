# How to Set Up Horizontal Pod Autoscaler with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, HPA, Autoscaling, Infrastructure as Code, Cloud Native, Scaling

Description: Learn how to configure Kubernetes Horizontal Pod Autoscaler (HPA) using OpenTofu to automatically scale application pods based on CPU, memory, or custom metrics.

---

The Horizontal Pod Autoscaler (HPA) automatically adjusts the number of pod replicas in a deployment based on observed metrics. With OpenTofu and the Kubernetes provider, you can manage HPA configurations alongside your application infrastructure, ensuring scaling policies are version-controlled and consistent.

## Setting Up the Kubernetes Provider

```hcl
# providers.tf

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.1.0"
    }
  }
}

provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}
```

## Creating a Basic HPA for CPU Scaling

```hcl
# hpa.tf
# Create a deployment to scale
resource "kubernetes_deployment_v1" "app" {
  metadata {
    name      = "app"
    namespace = var.namespace
  }

  spec {
    # Start with a baseline of 2 replicas
    replicas = 2

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
          image = var.app_image

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
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

# HPA that scales based on CPU utilization
resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  metadata {
    name      = "app-hpa"
    namespace = var.namespace
  }

  spec {
    # Minimum and maximum replica bounds
    min_replicas = 2
    max_replicas = 10

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.app.metadata[0].name
    }

    metric {
      type = "Resource"

      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70  # Scale up when CPU average exceeds 70%
        }
      }
    }
  }
}
```

## HPA with Memory and CPU Metrics

```hcl
# hpa_multi_metric.tf
resource "kubernetes_horizontal_pod_autoscaler_v2" "app_multi" {
  metadata {
    name      = "app-multi-metric-hpa"
    namespace = var.namespace
  }

  spec {
    min_replicas = 2
    max_replicas = 20

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "app"
    }

    # Scale on CPU
    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    # Also scale on memory - HPA uses the largest replica recommendation across the configured metrics
    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }

    # Scale-down behavior: be conservative - wait 5 minutes before scaling down
    behavior {
      scale_down {
        stabilization_window_seconds = 300  # Wait 5 min before scaling down

        policy {
          type          = "Pods"
          value         = 1             # Remove at most 1 pod per period
          period_seconds = 60
        }

        select_policy = "Min"
      }

      scale_up {
        stabilization_window_seconds = 0   # Scale up immediately

        policy {
          type          = "Percent"
          value         = 100           # Allow doubling pod count per period
          period_seconds = 15
        }

        select_policy = "Max"
      }
    }
  }
}
```

## HPA with Custom Prometheus Metrics

```hcl
# custom_metrics_hpa.tf
# Scale based on requests per second (requires a custom metrics adapter such as Prometheus Adapter)
resource "kubernetes_horizontal_pod_autoscaler_v2" "app_custom" {
  metadata {
    name      = "app-rps-hpa"
    namespace = var.namespace
  }

  spec {
    min_replicas = 2
    max_replicas = 50

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "app"
    }

    # Scale on custom requests-per-second metric from Prometheus adapter
    metric {
      type = "Pods"

      pods {
        metric {
          name = "http_requests_per_second"
        }
        target {
          type          = "AverageValue"
          average_value = "100"  # Scale up when avg RPS per pod exceeds 100
        }
      }
    }
  }
}
```

## Best Practices

- Always set resource requests on your pods - HPA cannot function without them when using resource-based metrics.
- Configure scale-down stabilization windows to prevent thrashing during workload fluctuations.
- Pair HPA with Cluster Autoscaler so new pods can actually be scheduled when scale-out occurs.
- Monitor HPA events with `kubectl describe hpa` to understand scaling decisions.
- Set `min_replicas` to at least 2 for production workloads to maintain availability during rolling updates.
