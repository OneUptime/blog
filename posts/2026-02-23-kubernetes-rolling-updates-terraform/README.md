# How to Handle Kubernetes Rolling Updates in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Rolling Updates, Deployment Strategy, Zero Downtime, DevOps

Description: Learn how to configure Kubernetes rolling update strategies in Terraform, including maxSurge, maxUnavailable, rollback handling, and zero-downtime deployment patterns.

---

Rolling updates let you update your application without downtime. Kubernetes gradually replaces old pods with new ones, ensuring a minimum number of pods are always available to handle requests. Terraform manages the deployment spec that controls this behavior - the update strategy, surge settings, and readiness gates that determine how smooth (or painful) your deployments are.

This guide covers how to configure rolling update strategies in Terraform for reliable, zero-downtime deployments.

## The Default Rolling Update Strategy

When you create a deployment without specifying a strategy, Kubernetes uses a rolling update with 25% maxUnavailable and 25% maxSurge. Here is how to configure it explicitly.

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 4

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    # Rolling update strategy configuration
    strategy {
      type = "RollingUpdate"

      rolling_update {
        # Maximum number of pods that can be created above desired count
        max_surge = "25%"
        # Maximum number of pods that can be unavailable during the update
        max_unavailable = "25%"
      }
    }

    template {
      metadata {
        labels = {
          app     = "my-app"
          version = var.app_version
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:${var.app_version}"

          port {
            container_port = 8080
          }

          # Readiness probe is critical for rolling updates
          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }

            initial_delay_seconds = 5
            period_seconds        = 5
            failure_threshold     = 3
          }

          liveness_probe {
            http_get {
              path = "/healthz"
              port = 8080
            }

            initial_delay_seconds = 15
            period_seconds        = 10
            failure_threshold     = 3
          }
        }
      }
    }
  }
}
```

## Understanding maxSurge and maxUnavailable

These two parameters control the pace of the rollout:

- **maxSurge**: How many extra pods can exist during the update. Higher values mean faster rollouts but more resource usage.
- **maxUnavailable**: How many pods can be unavailable. Higher values mean faster rollouts but less capacity.

```hcl
# Conservative: One at a time, always maintain full capacity
strategy {
  type = "RollingUpdate"

  rolling_update {
    max_surge       = "1"
    max_unavailable = "0"
  }
}
```

With 4 replicas, `maxSurge=1` and `maxUnavailable=0` means:
1. Create 1 new pod (now 5 pods total, 4 old + 1 new)
2. Wait for new pod to be ready
3. Terminate 1 old pod (now 4 pods total)
4. Repeat until all pods are updated

This is the safest option - you always have full capacity.

```hcl
# Fast: Update multiple pods at once
strategy {
  type = "RollingUpdate"

  rolling_update {
    max_surge       = "50%"
    max_unavailable = "25%"
  }
}
```

With 4 replicas, this means up to 6 pods total (4 + 50% surge) and 1 pod can be unavailable. The update happens much faster.

```hcl
# Aggressive: Replace all at once (not really rolling)
strategy {
  type = "RollingUpdate"

  rolling_update {
    max_surge       = "100%"
    max_unavailable = "0"
  }
}
```

This creates all new pods before terminating any old ones. It requires 2x resources temporarily but provides zero-downtime updates.

## Recreate Strategy

Sometimes you cannot have old and new versions running simultaneously - for example, when migrating database schemas or when the app does not support rolling updates.

```hcl
# Recreate: Terminate all old pods before creating new ones
resource "kubernetes_deployment" "worker" {
  metadata {
    name      = "worker"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "worker"
      }
    }

    # Recreate strategy - causes downtime
    strategy {
      type = "Recreate"
    }

    template {
      metadata {
        labels = {
          app = "worker"
        }
      }

      spec {
        container {
          name  = "worker"
          image = "worker:${var.worker_version}"
        }
      }
    }
  }
}
```

## Triggering Rolling Updates with Config Changes

Changing a ConfigMap or Secret does not automatically restart pods. Use a hash annotation to trigger updates.

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    "config.yaml" = yamlencode(var.app_config)
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 4

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    strategy {
      type = "RollingUpdate"

      rolling_update {
        max_surge       = "1"
        max_unavailable = "0"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }

        annotations = {
          # This hash changes when the config changes,
          # triggering a rolling update
          "config-hash" = md5(yamlencode(var.app_config))
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:${var.app_version}"

          volume_mount {
            name       = "config"
            mount_path = "/etc/app"
          }
        }

        volume {
          name = "config"

          config_map {
            name = kubernetes_config_map.app_config.metadata[0].name
          }
        }
      }
    }
  }
}
```

## Graceful Shutdown for Rolling Updates

Your application needs to handle SIGTERM gracefully. Configure the termination grace period to give it time.

```hcl
spec {
  # Give the pod 60 seconds to shut down gracefully
  termination_grace_period_seconds = 60

  container {
    name  = "app"
    image = "my-app:1.0.0"

    # Pre-stop hook to drain connections
    lifecycle {
      pre_stop {
        exec {
          # Sleep for a few seconds to let the load balancer
          # stop sending new requests
          command = ["/bin/sh", "-c", "sleep 5"]
        }
      }
    }

    readiness_probe {
      http_get {
        path = "/ready"
        port = 8080
      }

      period_seconds    = 5
      failure_threshold = 1
    }
  }
}
```

The sequence during a rolling update is:
1. Pod is marked for termination
2. Pod is removed from service endpoints (readiness)
3. Pre-stop hook runs
4. SIGTERM is sent to the process
5. Application drains connections and shuts down
6. After grace period, SIGKILL is sent if still running

## Waiting for Rollouts in Terraform

Terraform can wait for deployments to complete their rollout.

```hcl
resource "kubernetes_deployment" "app" {
  # Wait for the rolling update to complete
  wait_for_rollout = true

  metadata {
    name      = "my-app"
    namespace = "production"
  }

  # Configure timeouts for the rollout
  timeouts {
    create = "10m"
    update = "10m"
    delete = "5m"
  }

  spec {
    # Kubernetes also has a progress deadline
    progress_deadline_seconds = 600

    replicas = 4

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    strategy {
      type = "RollingUpdate"

      rolling_update {
        max_surge       = "1"
        max_unavailable = "0"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:${var.app_version}"
        }
      }
    }
  }
}
```

If `wait_for_rollout = true`, Terraform blocks until all pods are updated and ready. If the rollout takes longer than the timeout, Terraform reports an error.

## Blue-Green with Terraform

While not a true rolling update, you can implement blue-green deployments using Terraform by managing two deployments and switching the service selector.

```hcl
locals {
  active_color = var.active_color  # "blue" or "green"
}

# Blue deployment
resource "kubernetes_deployment" "blue" {
  metadata {
    name      = "my-app-blue"
    namespace = "production"
  }

  spec {
    replicas = local.active_color == "blue" ? 4 : 0

    selector {
      match_labels = {
        app   = "my-app"
        color = "blue"
      }
    }

    template {
      metadata {
        labels = {
          app     = "my-app"
          color   = "blue"
          version = var.blue_version
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:${var.blue_version}"
        }
      }
    }
  }
}

# Green deployment
resource "kubernetes_deployment" "green" {
  metadata {
    name      = "my-app-green"
    namespace = "production"
  }

  spec {
    replicas = local.active_color == "green" ? 4 : 0

    selector {
      match_labels = {
        app   = "my-app"
        color = "green"
      }
    }

    template {
      metadata {
        labels = {
          app     = "my-app"
          color   = "green"
          version = var.green_version
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:${var.green_version}"
        }
      }
    }
  }
}

# Service points to the active color
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    selector = {
      app   = "my-app"
      color = local.active_color
    }

    port {
      port        = 80
      target_port = 8080
    }
  }
}
```

Switch traffic by changing `var.active_color` and running `terraform apply`.

## Monitoring Rollouts

After applying a Terraform change that triggers a rolling update, monitor it:

```bash
# Watch the rollout progress
kubectl rollout status deployment/my-app -n production

# Check rollout history
kubectl rollout history deployment/my-app -n production

# View the events during rollout
kubectl describe deployment my-app -n production
```

## Best Practices

- Always configure readiness probes - they are essential for safe rolling updates
- Set `maxUnavailable = 0` and `maxSurge = 1` for the safest updates
- Use termination grace period and pre-stop hooks for graceful shutdown
- Hash config data in pod annotations to trigger restarts on config changes
- Set `wait_for_rollout = true` in CI/CD to fail the pipeline on broken deployments
- Use PodDisruptionBudgets alongside rolling update strategies
- Set `progress_deadline_seconds` to detect stuck rollouts
- Test your rolling update configuration in staging before production

For more on Kubernetes deployment patterns, see our guide on [creating Kubernetes PodDisruptionBudgets with Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-poddisruptionbudgets-terraform/view).
