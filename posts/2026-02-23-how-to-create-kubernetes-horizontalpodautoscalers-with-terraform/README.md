# How to Create Kubernetes HorizontalPodAutoscalers with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, HPA, Autoscaling, Infrastructure as Code, DevOps

Description: How to create Kubernetes HorizontalPodAutoscalers with Terraform to automatically scale your workloads based on CPU, memory, and custom metrics.

---

HorizontalPodAutoscalers (HPAs) automatically adjust the number of pod replicas based on observed metrics. When traffic spikes, the HPA adds more pods. When traffic drops, it scales back down. This keeps your applications responsive during peak times without wasting resources during quiet periods. Managing HPAs through Terraform ensures your autoscaling policies are version-controlled and consistent across environments.

This guide covers creating HPAs with Terraform, from basic CPU-based scaling to advanced configurations with multiple metrics and custom scaling behaviors.

## Prerequisites

HPAs require the Metrics Server to be installed in your cluster. Most managed Kubernetes services (GKE, EKS, AKS) include it by default. You can verify it is running:

```bash
kubectl get deployment metrics-server -n kube-system
```

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

## Basic HPA - CPU Based

The simplest HPA scales based on CPU utilization.

```hcl
# First, create a Deployment to autoscale
resource "kubernetes_deployment" "web" {
  metadata {
    name      = "web-app"
    namespace = "default"
  }

  spec {
    replicas = 2  # Initial replica count

    selector {
      match_labels = {
        app = "web-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "web-app"
        }
      }

      spec {
        container {
          name  = "web"
          image = "myregistry.io/web-app:v2"

          port {
            container_port = 8080
          }

          # Resource requests are required for CPU-based HPA
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

    # Let HPA manage replicas
    lifecycle {
      ignore_changes = [spec[0].replicas]
    }
  }
}

# HPA that scales based on CPU usage
resource "kubernetes_horizontal_pod_autoscaler_v2" "web_hpa" {
  metadata {
    name      = "web-app-hpa"
    namespace = "default"

    labels = {
      managed-by = "terraform"
    }
  }

  spec {
    # Reference the Deployment to scale
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.web.metadata[0].name
    }

    # Replica bounds
    min_replicas = 2
    max_replicas = 10

    # Scale when average CPU exceeds 70%
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
  }
}
```

The `lifecycle.ignore_changes` on `spec[0].replicas` in the Deployment is important. Without it, Terraform would reset the replica count to the initial value on every apply, fighting with the HPA.

## HPA with Memory Scaling

```hcl
# memory_hpa.tf - Scale based on memory utilization
resource "kubernetes_horizontal_pod_autoscaler_v2" "memory_hpa" {
  metadata {
    name      = "api-memory-hpa"
    namespace = "backend"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "api-server"
    }

    min_replicas = 3
    max_replicas = 20

    # Scale on memory utilization
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
  }
}
```

## HPA with Multiple Metrics

You can scale based on multiple metrics simultaneously. The HPA calculates the desired replica count for each metric and uses the highest value.

```hcl
# multi_metric_hpa.tf - Scale based on CPU and memory
resource "kubernetes_horizontal_pod_autoscaler_v2" "multi_metric" {
  metadata {
    name      = "api-multi-hpa"
    namespace = "backend"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "api-server"
    }

    min_replicas = 3
    max_replicas = 25

    # CPU metric
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

    # Memory metric
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
  }
}
```

## HPA with Custom Metrics

If you have custom metrics (from Prometheus, Datadog, etc.) exposed through the custom metrics API, you can scale based on them.

```hcl
# custom_metric_hpa.tf - Scale on custom application metrics
resource "kubernetes_horizontal_pod_autoscaler_v2" "custom_metric" {
  metadata {
    name      = "worker-hpa"
    namespace = "backend"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "worker"
    }

    min_replicas = 2
    max_replicas = 50

    # Scale based on queue depth (custom metric from your app)
    metric {
      type = "Pods"

      pods {
        metric {
          name = "queue_messages_pending"
        }

        target {
          type          = "AverageValue"
          average_value = "30"  # Scale when avg > 30 messages per pod
        }
      }
    }

    # Also consider CPU
    metric {
      type = "Resource"

      resource {
        name = "cpu"

        target {
          type                = "Utilization"
          average_utilization = 75
        }
      }
    }
  }
}
```

## HPA with External Metrics

External metrics come from outside the cluster, like a cloud message queue.

```hcl
# external_metric_hpa.tf - Scale based on external metrics
resource "kubernetes_horizontal_pod_autoscaler_v2" "external_metric" {
  metadata {
    name      = "queue-processor-hpa"
    namespace = "processing"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "queue-processor"
    }

    min_replicas = 1
    max_replicas = 100

    # Scale based on SQS queue depth (external metric)
    metric {
      type = "External"

      external {
        metric {
          name = "sqs_queue_messages_visible"

          selector {
            match_labels = {
              queue_name = "processing-queue"
            }
          }
        }

        target {
          type  = "AverageValue"
          average_value = "5"  # 5 messages per pod
        }
      }
    }
  }
}
```

## Scaling Behavior Configuration

The `behavior` block gives you fine-grained control over how fast the HPA scales up and down.

```hcl
# behavior_hpa.tf - HPA with controlled scaling behavior
resource "kubernetes_horizontal_pod_autoscaler_v2" "controlled_hpa" {
  metadata {
    name      = "controlled-app-hpa"
    namespace = "production"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "production-app"
    }

    min_replicas = 5
    max_replicas = 50

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

    # Scaling behavior
    behavior {
      # Scale up quickly to handle traffic spikes
      scale_up {
        # Wait 30 seconds between scale-up decisions
        stabilization_window_seconds = 30

        policy {
          type           = "Percent"
          value          = 100  # Can double the pods
          period_seconds = 60
        }

        policy {
          type           = "Pods"
          value          = 5   # Or add up to 5 pods
          period_seconds = 60
        }

        # Use the policy that results in the most pods
        select_policy = "Max"
      }

      # Scale down slowly to avoid flapping
      scale_down {
        # Wait 5 minutes before scaling down
        stabilization_window_seconds = 300

        policy {
          type           = "Percent"
          value          = 10  # Remove at most 10% of pods
          period_seconds = 60
        }

        # Use the policy that removes the fewest pods
        select_policy = "Min"
      }
    }
  }
}
```

This configuration scales up aggressively (doubling pods if needed) but scales down conservatively (removing at most 10% per minute, with a 5-minute stabilization window). This pattern prevents the HPA from rapidly scaling down after a brief traffic lull, only to need to scale up again immediately.

## HPA for StatefulSets

HPAs can also scale StatefulSets, though you should be careful with stateful workloads.

```hcl
# statefulset_hpa.tf - Autoscale a StatefulSet
resource "kubernetes_horizontal_pod_autoscaler_v2" "cache_hpa" {
  metadata {
    name      = "redis-hpa"
    namespace = "cache"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "StatefulSet"
      name        = "redis"
    }

    min_replicas = 3
    max_replicas = 9

    metric {
      type = "Resource"

      resource {
        name = "memory"

        target {
          type                = "Utilization"
          average_utilization = 75
        }
      }
    }

    # Scale conservatively for stateful workloads
    behavior {
      scale_up {
        stabilization_window_seconds = 120
        policy {
          type           = "Pods"
          value          = 1
          period_seconds = 300
        }
      }

      scale_down {
        stabilization_window_seconds = 600
        policy {
          type           = "Pods"
          value          = 1
          period_seconds = 600
        }
      }
    }
  }
}
```

## Creating HPAs for Multiple Deployments

```hcl
# multi_hpa.tf - HPAs for multiple services
variable "autoscaled_services" {
  type = map(object({
    namespace       = string
    min_replicas    = number
    max_replicas    = number
    cpu_target      = number
    memory_target   = optional(number)
  }))
  default = {
    "web-frontend" = {
      namespace    = "frontend"
      min_replicas = 2
      max_replicas = 20
      cpu_target   = 70
    }
    "api-server" = {
      namespace     = "backend"
      min_replicas  = 3
      max_replicas  = 30
      cpu_target    = 65
      memory_target = 80
    }
    "worker" = {
      namespace    = "backend"
      min_replicas = 1
      max_replicas = 50
      cpu_target   = 80
    }
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "services" {
  for_each = var.autoscaled_services

  metadata {
    name      = "${each.key}-hpa"
    namespace = each.value.namespace
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = each.key
    }

    min_replicas = each.value.min_replicas
    max_replicas = each.value.max_replicas

    metric {
      type = "Resource"

      resource {
        name = "cpu"

        target {
          type                = "Utilization"
          average_utilization = each.value.cpu_target
        }
      }
    }

    dynamic "metric" {
      for_each = each.value.memory_target != null ? [each.value.memory_target] : []
      content {
        type = "Resource"

        resource {
          name = "memory"

          target {
            type                = "Utilization"
            average_utilization = metric.value
          }
        }
      }
    }
  }
}
```

## Monitoring Autoscaling

Track how your HPAs behave over time. Watch for HPAs that are constantly at max replicas (indicating you need to raise the ceiling or optimize the app), HPAs that oscillate rapidly (indicating the stabilization window needs adjustment), and HPAs that never scale (indicating thresholds might be too high). [OneUptime](https://oneuptime.com) can monitor your application endpoints and correlate response time changes with scaling events, helping you tune your autoscaling configuration.

## Summary

Kubernetes HPAs managed through Terraform provide automatic, metric-driven scaling for your workloads. The key patterns are: always set resource requests on your Deployments (HPAs need them), use `lifecycle.ignore_changes` on replicas in your Deployment to prevent Terraform from fighting with the HPA, configure the behavior block to scale up fast and scale down slowly, and use multiple metrics when a single metric does not capture the full picture of your application's load. Start with CPU-based scaling and add memory or custom metrics as you understand your application's scaling characteristics better.
