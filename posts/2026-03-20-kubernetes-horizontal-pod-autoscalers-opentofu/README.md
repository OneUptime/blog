# How to Create Kubernetes Horizontal Pod Autoscalers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, OpenTofu, Infrastructure, Performance

Description: Learn how to create Kubernetes Horizontal Pod Autoscalers (HPA) with OpenTofu using CPU, memory, and custom metrics to automatically scale deployments.

## Overview

Kubernetes Horizontal Pod Autoscalers automatically scale the number of pod replicas based on observed metrics. OpenTofu manages HPA v2 resources with CPU, memory, and external metrics scaling policies.

## Step 1: CPU-Based HPA

```hcl
# main.tf - HPA based on CPU utilization

resource "kubernetes_horizontal_pod_autoscaler_v2" "web_app_hpa" {
  metadata {
    name      = "web-app-hpa"
    namespace = "production"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.web_app.metadata[0].name
    }

    min_replicas = 3
    max_replicas = 20

    metric {
      type = "Resource"

      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70  # Target 70% CPU utilization
        }
      }
    }
  }
}
```

## Step 2: CPU and Memory HPA

```hcl
# HPA with both CPU and memory metrics
resource "kubernetes_horizontal_pod_autoscaler_v2" "api_hpa" {
  metadata {
    name      = "api-service-hpa"
    namespace = "production"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "api-service"
    }

    min_replicas = 2
    max_replicas = 50

    # Scale on CPU
    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 60
        }
      }
    }

    # Scale on memory
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

    # Scale-down behavior - be conservative
    behavior {
      scale_down {
        stabilization_window_seconds = 300  # Wait 5 min before scaling down
        select_policy                = "Min"

        policy {
          type           = "Percent"
          value          = 10   # Remove max 10% of pods per period
          period_seconds = 60
        }
      }

      # Scale up aggressively
      scale_up {
        stabilization_window_seconds = 0  # Scale up immediately

        policy {
          type           = "Pods"
          value          = 4    # Add up to 4 pods per period
          period_seconds = 60
        }
      }
    }
  }
}
```

## Step 3: External Metrics HPA

```hcl
# HPA scaling on external metrics from Prometheus Adapter
resource "kubernetes_horizontal_pod_autoscaler_v2" "queue_consumer_hpa" {
  metadata {
    name      = "queue-consumer-hpa"
    namespace = "production"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "queue-consumer"
    }

    min_replicas = 1
    max_replicas = 100

    # External metric from Prometheus Adapter: queue depth
    metric {
      type = "External"

      external {
        metric {
          name = "rabbitmq_queue_messages_ready"
          selector {
            match_labels = {
              queue = "order-processing"
            }
          }
        }

        target {
          type  = "AverageValue"
          average_value = "100"  # 100 messages per consumer
        }
      }
    }
  }
}
```

## Summary

Kubernetes HPA v2 with OpenTofu enables metric-driven autoscaling for deployments. Combine CPU and memory metrics for comprehensive scaling triggers. Use scale-down stabilization windows to prevent flapping during brief traffic spikes, and configure separate scale-up/scale-down policies for asymmetric scaling behavior.
