# How to Create Kubernetes Priority Classes with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Priority Classes, Scheduling, Resource Management, DevOps

Description: Learn how to create and manage Kubernetes PriorityClasses with Terraform to control pod scheduling priority, enable preemption, and protect critical workloads during resource contention.

---

When your Kubernetes cluster runs out of resources, the scheduler needs to decide which pods get to run and which have to wait - or get evicted. PriorityClasses define the importance of pods relative to each other. A high-priority pod can preempt (evict) lower-priority pods to make room for itself. Without PriorityClasses, all pods are treated equally, which means a batch job can starve a critical API server of resources.

This guide covers creating PriorityClasses with Terraform and using them to build a robust scheduling hierarchy.

## How Priority Classes Work

Every pod has a priority value (an integer). When the scheduler cannot find a node with enough resources for a pending pod, it checks if evicting lower-priority pods would free up enough space. If so, it evicts them and schedules the higher-priority pod.

The priority value is assigned through a PriorityClass. Pods reference the PriorityClass by name, and Kubernetes injects the numeric priority value.

## Creating Priority Classes

Define a hierarchy of priority classes for different workload types.

```hcl
# System-critical: For core platform components
# These should almost never be preempted
resource "kubernetes_priority_class" "system_critical" {
  metadata {
    name = "system-critical"
  }

  value          = 1000000
  global_default = false
  description    = "Priority class for system-critical components like ingress controllers, DNS, and monitoring"

  # Preemption policy controls whether this class can evict others
  preemption_policy = "PreemptLowerPriority"
}

# High priority: For production-facing services
resource "kubernetes_priority_class" "high" {
  metadata {
    name = "high-priority"
  }

  value          = 100000
  global_default = false
  description    = "Priority class for production-facing services that handle user traffic"

  preemption_policy = "PreemptLowerPriority"
}

# Medium priority: Default for most workloads
resource "kubernetes_priority_class" "medium" {
  metadata {
    name = "medium-priority"
  }

  value          = 10000
  # Set as default - pods without a priority class get this one
  global_default = true
  description    = "Default priority class for standard workloads"

  preemption_policy = "PreemptLowerPriority"
}

# Low priority: For background jobs and non-critical work
resource "kubernetes_priority_class" "low" {
  metadata {
    name = "low-priority"
  }

  value          = 1000
  global_default = false
  description    = "Priority class for batch jobs, background processing, and non-critical workloads"

  preemption_policy = "PreemptLowerPriority"
}

# Best effort: Can be evicted by anything
resource "kubernetes_priority_class" "best_effort" {
  metadata {
    name = "best-effort"
  }

  value          = 100
  global_default = false
  description    = "Priority class for disposable workloads that can be evicted freely"

  # Never preempts other pods - only runs when resources are available
  preemption_policy = "Never"
}
```

## Using Priority Classes in Deployments

Assign priority classes to your workloads.

```hcl
# Critical API server with high priority
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api"
      }
    }

    template {
      metadata {
        labels = {
          app = "api"
        }
      }

      spec {
        # Assign the high priority class
        priority_class_name = kubernetes_priority_class.high.metadata[0].name

        container {
          name  = "api"
          image = "my-api:1.0.0"

          port {
            container_port = 8080
          }

          resources {
            requests = {
              cpu    = "500m"
              memory = "512Mi"
            }
            limits = {
              memory = "1Gi"
            }
          }
        }
      }
    }
  }
}

# Background job with low priority
resource "kubernetes_deployment" "report_generator" {
  metadata {
    name      = "report-generator"
    namespace = "production"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "report-generator"
      }
    }

    template {
      metadata {
        labels = {
          app = "report-generator"
        }
      }

      spec {
        # Low priority - can be evicted by higher priority pods
        priority_class_name = kubernetes_priority_class.low.metadata[0].name

        container {
          name  = "report-generator"
          image = "report-generator:1.0.0"

          resources {
            requests = {
              cpu    = "1"
              memory = "2Gi"
            }
            limits = {
              memory = "4Gi"
            }
          }
        }
      }
    }
  }
}
```

## Priority Classes for System Components

Infrastructure components should have the highest priority to keep the cluster healthy.

```hcl
# NGINX Ingress Controller - system critical
resource "helm_release" "nginx_ingress" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"

  values = [
    yamlencode({
      controller = {
        priorityClassName = kubernetes_priority_class.system_critical.metadata[0].name
      }
    })
  ]
}

# CoreDNS already has system-cluster-critical priority
# but custom addons should use your custom classes

# Monitoring stack
resource "helm_release" "prometheus" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          priorityClassName = kubernetes_priority_class.system_critical.metadata[0].name
        }
      }
      alertmanager = {
        alertmanagerSpec = {
          priorityClassName = kubernetes_priority_class.system_critical.metadata[0].name
        }
      }
      grafana = {
        priorityClassName = kubernetes_priority_class.high.metadata[0].name
      }
    })
  ]
}
```

## Priority Classes for Batch Jobs

CronJobs and batch jobs are natural candidates for low or best-effort priority.

```hcl
# CronJob with low priority
resource "kubernetes_cron_job_v1" "data_export" {
  metadata {
    name      = "data-export"
    namespace = "production"
  }

  spec {
    schedule = "0 2 * * *"  # 2 AM daily

    job_template {
      spec {
        template {
          spec {
            # Low priority - batch work can wait
            priority_class_name = kubernetes_priority_class.low.metadata[0].name

            container {
              name  = "export"
              image = "data-exporter:1.0.0"

              resources {
                requests = {
                  cpu    = "2"
                  memory = "4Gi"
                }
                limits = {
                  memory = "8Gi"
                }
              }
            }

            restart_policy = "OnFailure"
          }
        }
      }
    }
  }
}

# CI/CD runners with best-effort priority
resource "kubernetes_deployment" "ci_runner" {
  metadata {
    name      = "ci-runner"
    namespace = "ci"
  }

  spec {
    replicas = 5

    selector {
      match_labels = {
        app = "ci-runner"
      }
    }

    template {
      metadata {
        labels = {
          app = "ci-runner"
        }
      }

      spec {
        # Best effort - these can be evicted freely
        priority_class_name = kubernetes_priority_class.best_effort.metadata[0].name

        container {
          name  = "runner"
          image = "ci-runner:latest"

          resources {
            requests = {
              cpu    = "1"
              memory = "2Gi"
            }
            limits = {
              cpu    = "4"
              memory = "8Gi"
            }
          }
        }
      }
    }
  }
}
```

## Non-Preempting Priority Classes

Sometimes you want ordering without eviction. The `Never` preemption policy means the priority is only used for scheduling order, not for evicting other pods.

```hcl
# Staging workloads - higher scheduling priority than batch
# but should not evict anything
resource "kubernetes_priority_class" "staging" {
  metadata {
    name = "staging"
  }

  value          = 5000
  global_default = false
  description    = "Priority for staging workloads - will not preempt other pods"

  # Never preempt - just affects scheduling order
  preemption_policy = "Never"
}
```

## Dynamic Priority Based on Environment

Use Terraform variables to set different priorities per environment.

```hcl
variable "environment" {
  type = string
}

locals {
  priority_class = {
    production  = kubernetes_priority_class.high.metadata[0].name
    staging     = kubernetes_priority_class.medium.metadata[0].name
    development = kubernetes_priority_class.low.metadata[0].name
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = var.environment
  }

  spec {
    replicas = var.environment == "production" ? 3 : 1

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
        # Priority class varies by environment
        priority_class_name = local.priority_class[var.environment]

        container {
          name  = "app"
          image = "my-app:${var.app_version}"
        }
      }
    }
  }
}
```

## Built-in Priority Classes

Kubernetes ships with two built-in priority classes:

- `system-cluster-critical` (value: 2000000000) - For cluster-critical pods like kube-dns, kube-proxy
- `system-node-critical` (value: 2000001000) - For node-critical pods like kubelet, container runtime

Do not use these for your application workloads. Create custom priority classes with lower values instead.

## Monitoring Preemption Events

Watch for preemption events to understand scheduling behavior:

```bash
# Check for preemption events
kubectl get events --field-selector reason=Preempted -A

# See which pods have been preempted recently
kubectl get events -A | grep -i preempt

# Check pending pods waiting for resources
kubectl get pods --field-selector status.phase=Pending -A
```

## Best Practices

- Create a clear priority hierarchy with well-separated values
- Set exactly one PriorityClass as `global_default` for pods without explicit priority
- Use `preemption_policy = "Never"` for workloads that should not evict others
- Do not set custom priority values above 1,000,000,000 to avoid conflicts with system classes
- Assign system-critical priority to infrastructure components (ingress, DNS, monitoring)
- Use low or best-effort priority for batch jobs, CI runners, and dev workloads
- Combine priority classes with resource quotas and limit ranges for complete resource management
- Monitor preemption events to detect resource contention issues

For more on Kubernetes scheduling, see our guide on [handling Kubernetes namespace isolation with Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-namespace-isolation-terraform/view).
