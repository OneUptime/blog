# How to Create Kubernetes Priority Classes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Priority Class, Scheduling, OpenTofu, Infrastructure, Resource Management

Description: Learn how to create Kubernetes Priority Classes with OpenTofu to control pod scheduling priority and preemption behavior for critical workloads.

## Overview

Kubernetes Priority Classes define the priority of pods relative to other pods during scheduling. Higher priority pods can preempt lower priority pods when resources are scarce. OpenTofu manages priority class hierarchies for different workload types.

## Step 1: Create a Priority Class Hierarchy

```hcl
# main.tf - Critical platform components priority

resource "kubernetes_priority_class_v1" "platform_critical" {
  metadata {
    name = "platform-critical"
  }

  value          = 1000000
  global_default = false
  description    = "Critical platform components that should be scheduled ahead of standard workloads"

  # "Never" prevents these pods from preempting lower-priority pods
  preemption_policy = "Never"
}

# High priority for production services
resource "kubernetes_priority_class_v1" "production_high" {
  metadata {
    name = "production-high"
  }

  value          = 100000
  global_default = false
  description    = "High priority production services"
}

# Default priority for standard workloads
resource "kubernetes_priority_class_v1" "production_default" {
  metadata {
    name = "production-default"
  }

  value          = 10000
  global_default = true  # Applied to pods that don't specify a class
  description    = "Default priority for production workloads"
}

# Batch/background jobs get lowest priority
resource "kubernetes_priority_class_v1" "batch_low" {
  metadata {
    name = "batch-low"
  }

  value          = 1000
  global_default = false
  description    = "Low priority for batch jobs that can be preempted"
}
```

## Step 2: Use Priority Classes in Pods

```hcl
# Critical monitoring deployment
resource "kubernetes_deployment_v1" "prometheus" {
  metadata {
    name      = "prometheus"
    namespace = "monitoring"
  }

  spec {
    replicas = 2

    selector {
      match_labels = { app = "prometheus" }
    }

    template {
      metadata {
        labels = { app = "prometheus" }
      }

      spec {
        # Assign the high priority class
        priority_class_name = kubernetes_priority_class_v1.production_high.metadata[0].name

        container {
          name  = "prometheus"
          image = "prom/prometheus:latest"
          port { container_port = 9090 }

          resources {
            requests = {
              cpu    = "500m"
              memory = "2Gi"
            }
            limits = {
              cpu    = "2"
              memory = "8Gi"
            }
          }
        }
      }
    }
  }
}

# Batch job with low priority
resource "kubernetes_cron_job_v1" "low_priority_report" {
  metadata {
    name      = "weekly-report"
    namespace = "batch"
  }

  spec {
    schedule = "0 1 * * 0"  # Weekly Sunday 1am

    job_template {
      metadata {}
      spec {
        template {
          metadata {}

          spec {
            priority_class_name = kubernetes_priority_class_v1.batch_low.metadata[0].name
            restart_policy      = "OnFailure"

            container {
              name  = "report"
              image = "myregistry/report:latest"
            }
          }
        }
      }
    }
  }
}
```

## Summary

Kubernetes Priority Classes with OpenTofu create a workload hierarchy that helps critical services receive scheduling preference during capacity constraints. Set `global_default = true` on a mid-tier priority class so unclassified workloads get reasonable priority. Use `preemption_policy = "Never"` for workloads that should wait for free capacity instead of preempting lower-priority pods.
