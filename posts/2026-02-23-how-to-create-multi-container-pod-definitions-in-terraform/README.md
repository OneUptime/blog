# How to Create Multi-Container Pod Definitions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Container, ECS, POD, Sidecar

Description: Learn how to create multi-container pod definitions in Terraform for Kubernetes and ECS, including sidecar patterns, init containers, and shared volumes.

---

Multi-container pods are a fundamental pattern in container orchestration. Instead of running everything in a single container, you split responsibilities across multiple containers that share the same network namespace and storage volumes. This enables powerful patterns like sidecars for logging, proxies for service mesh, and init containers for setup tasks. Terraform supports defining multi-container configurations across Kubernetes, ECS, and other container platforms.

This guide covers how to create multi-container pod definitions in Terraform, including common patterns and best practices for both Kubernetes and AWS ECS.

## Understanding Multi-Container Patterns

The most common multi-container patterns are:

- **Sidecar**: A helper container that extends the main container's functionality (logging, monitoring, proxy)
- **Ambassador**: A proxy container that handles outbound connections
- **Adapter**: A container that transforms the main container's output
- **Init Container**: A container that runs to completion before the main containers start

## Kubernetes Multi-Container Pod with Terraform

### Basic Sidecar Pattern

```hcl
# Kubernetes deployment with sidecar container
resource "kubernetes_deployment" "app_with_sidecar" {
  metadata {
    name      = "web-app"
    namespace = "default"
    labels = {
      app = "web-app"
    }
  }

  spec {
    replicas = 3

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
        # Init container - runs before main containers
        init_container {
          name  = "init-config"
          image = "busybox:1.36"

          # Download configuration files before the app starts
          command = [
            "sh", "-c",
            "wget -O /config/app.json https://config-server/api/config"
          ]

          volume_mount {
            name       = "config-volume"
            mount_path = "/config"
          }
        }

        # Main application container
        container {
          name  = "app"
          image = "myregistry.example.com/web-app:v2.1.0"

          port {
            container_port = 8080
            name           = "http"
          }

          # Resource limits for the main container
          resources {
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          # Health checks
          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 15
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }

          # Shared volumes
          volume_mount {
            name       = "config-volume"
            mount_path = "/app/config"
            read_only  = true
          }

          volume_mount {
            name       = "log-volume"
            mount_path = "/app/logs"
          }
        }

        # Sidecar container for log forwarding
        container {
          name  = "log-forwarder"
          image = "fluent/fluent-bit:2.1"

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }

          # Share the log volume with the main container
          volume_mount {
            name       = "log-volume"
            mount_path = "/var/log/app"
            read_only  = true
          }

          volume_mount {
            name       = "fluent-bit-config"
            mount_path = "/fluent-bit/etc"
          }
        }

        # Sidecar container for metrics collection
        container {
          name  = "metrics-exporter"
          image = "prom/statsd-exporter:v0.24.0"

          port {
            container_port = 9102
            name           = "metrics"
          }

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }

        # Volume definitions
        volume {
          name = "config-volume"
          empty_dir {}
        }

        volume {
          name = "log-volume"
          empty_dir {}
        }

        volume {
          name = "fluent-bit-config"
          config_map {
            name = kubernetes_config_map.fluent_bit.metadata[0].name
          }
        }
      }
    }
  }
}

# ConfigMap for Fluent Bit sidecar
resource "kubernetes_config_map" "fluent_bit" {
  metadata {
    name = "fluent-bit-config"
  }

  data = {
    "fluent-bit.conf" = <<-EOF
      [SERVICE]
          Flush        5
          Daemon       Off
          Log_Level    info

      [INPUT]
          Name         tail
          Path         /var/log/app/*.log
          Tag          app.*

      [OUTPUT]
          Name         forward
          Match        *
          Host         fluentd-aggregator
          Port         24224
    EOF
  }
}
```

### Service Mesh Sidecar Pattern

```hcl
# Deployment with Envoy sidecar proxy
resource "kubernetes_deployment" "app_with_envoy" {
  metadata {
    name = "api-service"
    annotations = {
      # Some service meshes inject sidecars automatically
      # For manual sidecar injection:
      "sidecar.istio.io/inject" = "false"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api-service"
      }
    }

    template {
      metadata {
        labels = {
          app = "api-service"
        }
      }

      spec {
        # Main application container
        container {
          name  = "api"
          image = "myregistry.example.com/api:v1.5.0"

          port {
            container_port = 8080
          }

          # Application communicates with localhost proxy
          env {
            name  = "UPSTREAM_URL"
            value = "http://localhost:9901"
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

        # Envoy sidecar proxy
        container {
          name  = "envoy"
          image = "envoyproxy/envoy:v1.28-latest"

          port {
            container_port = 9901
            name           = "admin"
          }

          port {
            container_port = 10000
            name           = "ingress"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          volume_mount {
            name       = "envoy-config"
            mount_path = "/etc/envoy"
          }
        }

        volume {
          name = "envoy-config"
          config_map {
            name = kubernetes_config_map.envoy.metadata[0].name
          }
        }
      }
    }
  }
}
```

## AWS ECS Multi-Container Task Definitions

### ECS Task with Sidecar Containers

```hcl
# ECS task definition with multiple containers
resource "aws_ecs_task_definition" "multi_container" {
  family                   = "multi-container-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"   # Total CPU for all containers
  memory                   = "2048"   # Total memory for all containers
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      # Main application container
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:v2.0.0"
      essential = true  # Task stops if this container stops
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      # Health check for the main container
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      # Log configuration
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }

      # Container dependencies
      dependsOn = [
        {
          containerName = "datadog-agent"
          condition     = "START"
        }
      ]

      # Environment variables
      environment = [
        {
          name  = "DD_AGENT_HOST"
          value = "localhost"  # Sidecar accessible via localhost
        },
        {
          name  = "APP_PORT"
          value = "8080"
        }
      ]
    },
    {
      # Datadog agent sidecar
      name      = "datadog-agent"
      image     = "public.ecr.aws/datadog/agent:latest"
      essential = false  # Task continues if this container fails
      cpu       = 256
      memory    = 512

      portMappings = [
        {
          containerPort = 8126
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "DD_APM_ENABLED"
          value = "true"
        },
        {
          name  = "ECS_FARGATE"
          value = "true"
        }
      ]

      secrets = [
        {
          name      = "DD_API_KEY"
          valueFrom = aws_secretsmanager_secret.datadog_api_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.datadog.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "datadog"
        }
      }
    },
    {
      # Nginx reverse proxy sidecar
      name      = "nginx"
      image     = "nginx:1.25-alpine"
      essential = true
      cpu       = 256
      memory    = 512

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      # Nginx depends on the app being available
      dependsOn = [
        {
          containerName = "app"
          condition     = "HEALTHY"
        }
      ]

      # Mount nginx config from a volume
      mountPoints = [
        {
          sourceVolume  = "nginx-config"
          containerPath = "/etc/nginx/conf.d"
          readOnly      = true
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.nginx.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "nginx"
        }
      }
    }
  ])

  # Shared volume for nginx configuration
  volume {
    name = "nginx-config"

    efs_volume_configuration {
      file_system_id = aws_efs_file_system.config.id
      root_directory = "/nginx"
    }
  }
}
```

## Shared Volume Patterns

```hcl
# Kubernetes pod with shared volumes between containers
resource "kubernetes_deployment" "shared_volumes" {
  metadata {
    name = "data-processor"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "data-processor"
      }
    }

    template {
      metadata {
        labels = {
          app = "data-processor"
        }
      }

      spec {
        # Container that writes data
        container {
          name  = "data-fetcher"
          image = "myregistry.example.com/data-fetcher:v1.0"

          volume_mount {
            name       = "shared-data"
            mount_path = "/data/output"
          }
        }

        # Container that processes data written by the first container
        container {
          name  = "data-processor"
          image = "myregistry.example.com/data-processor:v1.0"

          volume_mount {
            name       = "shared-data"
            mount_path = "/data/input"
            read_only  = true
          }
        }

        # Shared empty directory volume
        volume {
          name = "shared-data"
          empty_dir {
            medium     = "Memory"    # Use tmpfs for fast I/O
            size_limit = "256Mi"
          }
        }
      }
    }
  }
}
```

## Outputs

```hcl
output "deployment_name" {
  description = "Name of the Kubernetes deployment"
  value       = kubernetes_deployment.app_with_sidecar.metadata[0].name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.multi_container.arn
}

output "ecs_task_revision" {
  description = "Revision number of the ECS task definition"
  value       = aws_ecs_task_definition.multi_container.revision
}
```

## Monitoring with OneUptime

Multi-container pods add complexity to your monitoring needs. Each container may have different health indicators and failure modes. OneUptime provides container-level monitoring within pods, helping you identify which container in a multi-container setup is causing issues. Visit [OneUptime](https://oneuptime.com) to set up comprehensive container monitoring.

## Conclusion

Multi-container pod definitions in Terraform enable powerful architectural patterns like sidecars, ambassadors, and init containers. Whether you are working with Kubernetes deployments or ECS task definitions, Terraform gives you a consistent way to define, version, and deploy multi-container workloads. The key considerations are resource allocation across containers, shared volume configuration, container dependencies and startup ordering, and health check strategies. By codifying these configurations in Terraform, you ensure your multi-container patterns are reproducible and consistently applied across environments.

For more container topics, see [How to Create Container Health Check Configurations in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-health-check-configurations-in-terraform/view) and [How to Create Container Resource Limits in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-resource-limits-in-terraform/view).
