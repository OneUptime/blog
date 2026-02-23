# How to Configure Kubernetes Liveness and Readiness Probes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Health Checks, Probes, Reliability, DevOps

Description: Learn how to configure Kubernetes liveness, readiness, and startup probes in Terraform to ensure your applications are healthy, properly receiving traffic, and gracefully handling failures.

---

Health probes are how Kubernetes knows whether your application is running correctly. Without them, Kubernetes has no way to tell the difference between a healthy pod and one that has deadlocked, is stuck in an infinite loop, or has not finished starting up. Liveness probes restart unhealthy containers. Readiness probes control whether a pod receives traffic. Startup probes protect slow-starting applications.

Configuring these correctly in Terraform means your deployments are self-healing from the start.

## The Three Types of Probes

- **Liveness probe**: Is the container alive? If this fails, Kubernetes restarts the container.
- **Readiness probe**: Is the container ready to serve traffic? If this fails, Kubernetes removes the pod from service endpoints.
- **Startup probe**: Has the container finished starting? Until this succeeds, liveness and readiness probes are disabled.

## HTTP Probes

The most common probe type for web applications. Kubernetes sends an HTTP GET request and checks the status code.

```hcl
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
        container {
          name  = "api"
          image = "my-api:1.0.0"

          port {
            container_port = 8080
          }

          # Liveness probe - restarts container if it fails
          liveness_probe {
            http_get {
              path = "/healthz"
              port = 8080
            }

            # Wait 30 seconds before first check
            initial_delay_seconds = 30
            # Check every 10 seconds
            period_seconds = 10
            # Wait up to 5 seconds for a response
            timeout_seconds = 5
            # Fail after 3 consecutive failures
            failure_threshold = 3
            # Recover after 1 success
            success_threshold = 1
          }

          # Readiness probe - controls traffic routing
          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }

            # Start checking quickly
            initial_delay_seconds = 5
            # Check frequently
            period_seconds = 5
            timeout_seconds = 3
            failure_threshold = 3
            success_threshold = 1
          }

          # Startup probe - for slow-starting apps
          startup_probe {
            http_get {
              path = "/healthz"
              port = 8080
            }

            # Allow up to 5 minutes for startup (30 * 10s)
            period_seconds    = 10
            failure_threshold = 30
            timeout_seconds   = 5
          }
        }
      }
    }
  }
}
```

## TCP Socket Probes

For services that do not have HTTP endpoints, like databases or message queues.

```hcl
resource "kubernetes_deployment" "redis" {
  metadata {
    name      = "redis"
    namespace = "cache"
  }

  spec {
    replicas = 1

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
        container {
          name  = "redis"
          image = "redis:7.2"

          port {
            container_port = 6379
          }

          # TCP socket probe - checks if the port is accepting connections
          liveness_probe {
            tcp_socket {
              port = 6379
            }

            initial_delay_seconds = 15
            period_seconds        = 20
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            tcp_socket {
              port = 6379
            }

            initial_delay_seconds = 5
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }
        }
      }
    }
  }
}
```

## Exec Probes

For applications that need a custom check, you can run a command inside the container.

```hcl
resource "kubernetes_deployment" "postgres" {
  metadata {
    name      = "postgres"
    namespace = "database"
  }

  spec {
    replicas = 1

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
          image = "postgres:16"

          port {
            container_port = 5432
          }

          env {
            name  = "POSTGRES_PASSWORD"
            value = var.postgres_password
          }

          # Exec probe - runs a command and checks exit code
          liveness_probe {
            exec {
              command = ["pg_isready", "-U", "postgres"]
            }

            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            exec {
              command = ["pg_isready", "-U", "postgres"]
            }

            initial_delay_seconds = 5
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }
        }
      }
    }
  }
}
```

## HTTP Probes with Custom Headers

Some applications require authentication or custom headers on health check endpoints.

```hcl
container {
  name  = "app"
  image = "my-app:1.0.0"

  liveness_probe {
    http_get {
      path = "/healthz"
      port = 8080

      # Custom headers for the health check request
      http_header {
        name  = "Authorization"
        value = "Bearer health-check-token"
      }

      http_header {
        name  = "X-Health-Check"
        value = "true"
      }
    }

    period_seconds    = 10
    failure_threshold = 3
  }
}
```

## GRPC Probes

For gRPC services (requires Kubernetes 1.27+):

```hcl
container {
  name  = "grpc-service"
  image = "my-grpc-service:1.0.0"

  port {
    container_port = 50051
  }

  # gRPC health check
  liveness_probe {
    grpc {
      port = 50051
    }

    initial_delay_seconds = 15
    period_seconds        = 10
    failure_threshold     = 3
  }

  readiness_probe {
    grpc {
      port = 50051
    }

    initial_delay_seconds = 5
    period_seconds        = 5
    failure_threshold     = 3
  }
}
```

## Different Probes for Different Components

A common pattern: use aggressive readiness probes for fast traffic management and conservative liveness probes to avoid unnecessary restarts.

```hcl
resource "kubernetes_deployment" "web" {
  metadata {
    name      = "web"
    namespace = "production"
  }

  spec {
    replicas = 5

    selector {
      match_labels = {
        app = "web"
      }
    }

    template {
      metadata {
        labels = {
          app = "web"
        }
      }

      spec {
        container {
          name  = "web"
          image = "web-app:${var.app_version}"

          port {
            container_port = 3000
          }

          # Aggressive readiness - pull from traffic quickly
          readiness_probe {
            http_get {
              path = "/ready"
              port = 3000
            }

            # Check every 3 seconds for fast response
            period_seconds    = 3
            timeout_seconds   = 2
            # Pull from traffic after 2 failures (6 seconds)
            failure_threshold = 2
            success_threshold = 1
          }

          # Conservative liveness - avoid unnecessary restarts
          liveness_probe {
            http_get {
              path = "/healthz"
              port = 3000
            }

            initial_delay_seconds = 30
            # Check less frequently
            period_seconds    = 15
            timeout_seconds   = 5
            # Only restart after 5 failures (75 seconds of unhealthiness)
            failure_threshold = 5
          }

          # Startup probe handles slow starts
          startup_probe {
            http_get {
              path = "/healthz"
              port = 3000
            }

            period_seconds    = 5
            # Allow 2 minutes for startup
            failure_threshold = 24
          }
        }
      }
    }
  }
}
```

## Probes with Variables for Flexibility

Make probe configuration adjustable per environment.

```hcl
variable "probe_config" {
  type = object({
    liveness_initial_delay = number
    liveness_period        = number
    liveness_threshold     = number
    readiness_period       = number
    readiness_threshold    = number
    startup_period         = number
    startup_threshold      = number
  })

  default = {
    liveness_initial_delay = 30
    liveness_period        = 10
    liveness_threshold     = 3
    readiness_period       = 5
    readiness_threshold    = 3
    startup_period         = 10
    startup_threshold      = 30
  }
}

# Use the variable in the deployment
container {
  name  = "app"
  image = "my-app:1.0.0"

  liveness_probe {
    http_get {
      path = "/healthz"
      port = 8080
    }

    initial_delay_seconds = var.probe_config.liveness_initial_delay
    period_seconds        = var.probe_config.liveness_period
    failure_threshold     = var.probe_config.liveness_threshold
  }

  readiness_probe {
    http_get {
      path = "/ready"
      port = 8080
    }

    period_seconds    = var.probe_config.readiness_period
    failure_threshold = var.probe_config.readiness_threshold
  }

  startup_probe {
    http_get {
      path = "/healthz"
      port = 8080
    }

    period_seconds    = var.probe_config.startup_period
    failure_threshold = var.probe_config.startup_threshold
  }
}
```

## Common Mistakes

### Liveness Probe That Depends on External Services

```hcl
# BAD: If the database goes down, all app pods get restarted
liveness_probe {
  http_get {
    path = "/healthz"  # This endpoint checks database connectivity
    port = 8080
  }
}

# GOOD: Liveness checks only the application process itself
liveness_probe {
  http_get {
    path = "/livez"  # This endpoint only checks if the process is alive
    port = 8080
  }
}

# Use readiness for dependency checks
readiness_probe {
  http_get {
    path = "/ready"  # This checks database, cache, and other dependencies
    port = 8080
  }
}
```

### Too Aggressive Liveness Probe

```hcl
# BAD: Restarts after 6 seconds of slow responses
liveness_probe {
  http_get {
    path = "/healthz"
    port = 8080
  }

  period_seconds    = 2
  timeout_seconds   = 1
  failure_threshold = 3
}

# GOOD: Gives the application time to recover
liveness_probe {
  http_get {
    path = "/healthz"
    port = 8080
  }

  period_seconds    = 10
  timeout_seconds   = 5
  failure_threshold = 5
}
```

## Best Practices

- Always configure both liveness and readiness probes for production workloads
- Use startup probes for applications with long initialization (Java apps, ML models)
- Keep liveness probe endpoints lightweight - they should not check external dependencies
- Use readiness probes to check dependency health (database, cache, queues)
- Make liveness probes conservative (longer periods, higher thresholds) to avoid restart loops
- Make readiness probes aggressive for fast traffic management
- Use HTTP probes when possible - they are the most informative
- Implement dedicated /healthz and /ready endpoints rather than checking your main endpoint
- Test probe behavior by simulating failures in staging

For more on Kubernetes deployment strategies, see our guide on [handling Kubernetes rolling updates in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-rolling-updates-terraform/view).
