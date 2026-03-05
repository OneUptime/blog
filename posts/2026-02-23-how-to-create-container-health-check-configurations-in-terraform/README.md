# How to Create Container Health Check Configurations in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Containers, Health Check, ECS, Kubernetes, Monitoring

Description: Learn how to configure container health checks in Terraform for Kubernetes, ECS, and other platforms to ensure application reliability and automatic recovery.

---

Container health checks are essential for maintaining application reliability. They enable the orchestration platform to detect when a container is unhealthy and take corrective action, such as restarting the container or removing it from load balancer rotation. Properly configured health checks mean the difference between a self-healing system and one that silently fails. Terraform provides a consistent way to define health check configurations across different container platforms.

This guide covers how to create comprehensive health check configurations in Terraform for Kubernetes, AWS ECS, Azure Container Apps, and Docker Compose.

## Types of Health Checks

Most container orchestrators support multiple types of health checks:

- **Liveness Probe**: Determines if the container is running. If it fails, the container is restarted.
- **Readiness Probe**: Determines if the container is ready to receive traffic. If it fails, the container is removed from load balancing.
- **Startup Probe**: Determines if the application has started. Protects slow-starting containers from being killed by liveness probes.

## Kubernetes Health Checks

### HTTP Health Checks

```hcl
# Kubernetes deployment with comprehensive health checks
resource "kubernetes_deployment" "api" {
  metadata {
    name = "api-service"
    labels = {
      app = "api-service"
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
        container {
          name  = "api"
          image = "myregistry.example.com/api:v2.0"

          port {
            container_port = 8080
          }

          # Startup probe - checks if the app has started
          # While this probe is running, liveness and readiness probes are disabled
          startup_probe {
            http_get {
              path = "/health/startup"
              port = 8080

              # Custom headers for health check authentication
              http_header {
                name  = "X-Health-Check"
                value = "startup"
              }
            }

            # Wait 5 seconds before first check
            initial_delay_seconds = 5
            # Check every 5 seconds
            period_seconds = 5
            # Allow up to 30 failures (5s * 30 = 150s max startup time)
            failure_threshold = 30
            # One success is enough
            success_threshold = 1
            # Each check times out after 3 seconds
            timeout_seconds = 3
          }

          # Liveness probe - checks if the app is alive
          # If this fails, Kubernetes restarts the container
          liveness_probe {
            http_get {
              path = "/health/live"
              port = 8080
            }

            # No initial delay needed when startup probe is configured
            initial_delay_seconds = 0
            period_seconds        = 15
            failure_threshold     = 3
            success_threshold     = 1
            timeout_seconds       = 5
          }

          # Readiness probe - checks if the app can handle traffic
          # If this fails, the pod is removed from service endpoints
          readiness_probe {
            http_get {
              path = "/health/ready"
              port = 8080
            }

            initial_delay_seconds = 0
            period_seconds        = 10
            failure_threshold     = 3
            success_threshold     = 1
            timeout_seconds       = 3
          }

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
        }
      }
    }
  }
}
```

### TCP and Command Health Checks

```hcl
# Database container with TCP health check
resource "kubernetes_deployment" "database_proxy" {
  metadata {
    name = "db-proxy"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "db-proxy"
      }
    }

    template {
      metadata {
        labels = {
          app = "db-proxy"
        }
      }

      spec {
        container {
          name  = "proxy"
          image = "myregistry.example.com/db-proxy:v1.0"

          port {
            container_port = 5432
          }

          # TCP health check - verifies port is accepting connections
          liveness_probe {
            tcp_socket {
              port = 5432
            }
            initial_delay_seconds = 10
            period_seconds        = 20
            failure_threshold     = 3
            timeout_seconds       = 5
          }

          readiness_probe {
            tcp_socket {
              port = 5432
            }
            initial_delay_seconds = 5
            period_seconds        = 10
            failure_threshold     = 3
            timeout_seconds       = 3
          }
        }

        # Worker container with exec command health check
        container {
          name  = "worker"
          image = "myregistry.example.com/worker:v1.0"

          # Command-based health check
          liveness_probe {
            exec {
              command = [
                "/bin/sh", "-c",
                "test -f /tmp/healthy && test $(( $(date +%s) - $(stat -c %Y /tmp/healthy) )) -lt 60"
              ]
            }
            initial_delay_seconds = 30
            period_seconds        = 30
            failure_threshold     = 3
            timeout_seconds       = 10
          }
        }
      }
    }
  }
}
```

### gRPC Health Checks

```hcl
# gRPC service with gRPC health check
resource "kubernetes_deployment" "grpc_service" {
  metadata {
    name = "grpc-service"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "grpc-service"
      }
    }

    template {
      metadata {
        labels = {
          app = "grpc-service"
        }
      }

      spec {
        container {
          name  = "grpc"
          image = "myregistry.example.com/grpc-service:v1.0"

          port {
            container_port = 50051
          }

          # gRPC health check (Kubernetes 1.24+)
          liveness_probe {
            grpc {
              port    = 50051
              service = "my.service.Health"
            }
            initial_delay_seconds = 10
            period_seconds        = 20
          }

          readiness_probe {
            grpc {
              port = 50051
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }
        }
      }
    }
  }
}
```

## AWS ECS Health Checks

### Task Definition Health Checks

```hcl
# ECS task definition with container health check
resource "aws_ecs_task_definition" "api" {
  family                   = "api-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${aws_ecr_repository.api.repository_url}:v2.0"
      essential = true

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      # Container-level health check
      healthCheck = {
        # Command to check container health
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:8080/health || exit 1"
        ]
        # Time between health checks
        interval = 30
        # Time to wait for a health check response
        timeout = 5
        # Number of consecutive failures before marking unhealthy
        retries = 3
        # Grace period for the container to start before health checks begin
        startPeriod = 60
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])
}

# ECS service with load balancer health check
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }
}

# ALB target group with health check
resource "aws_lb_target_group" "api" {
  name        = "api-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  # Load balancer health check configuration
  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  # Deregistration delay for graceful shutdown
  deregistration_delay = 30

  stickiness {
    type    = "lb_cookie"
    enabled = false
  }
}
```

## Health Check Variables Module

Create a reusable module for health check configuration:

```hcl
# variables for health check configuration
variable "health_check_config" {
  description = "Health check configuration"
  type = object({
    path                = string
    port                = number
    interval            = number
    timeout             = number
    healthy_threshold   = number
    unhealthy_threshold = number
    start_period        = number
  })
  default = {
    path                = "/health"
    port                = 8080
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    start_period        = 60
  }
}

# Use the configuration consistently
locals {
  ecs_health_check = {
    command     = ["CMD-SHELL", "curl -f http://localhost:${var.health_check_config.port}${var.health_check_config.path} || exit 1"]
    interval    = var.health_check_config.interval
    timeout     = var.health_check_config.timeout
    retries     = var.health_check_config.unhealthy_threshold
    startPeriod = var.health_check_config.start_period
  }

  alb_health_check = {
    enabled             = true
    path                = var.health_check_config.path
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = var.health_check_config.healthy_threshold
    unhealthy_threshold = var.health_check_config.unhealthy_threshold
    timeout             = var.health_check_config.timeout
    interval            = var.health_check_config.interval
    matcher             = "200"
  }
}
```

## Monitoring with OneUptime

Health checks ensure your containers are running, but external monitoring validates the end-user experience. OneUptime provides synthetic monitoring that tests your application from the outside, complementing your internal container health checks. If containers report healthy but users experience issues, OneUptime catches it. Visit [OneUptime](https://oneuptime.com) for comprehensive health monitoring.

## Conclusion

Container health check configurations in Terraform ensure your applications are self-healing and reliable. Kubernetes offers the most granular control with startup, liveness, and readiness probes supporting HTTP, TCP, gRPC, and command-based checks. ECS provides container-level health checks combined with load balancer health checks for traffic management. The key to effective health checks is choosing appropriate thresholds: be generous with startup timing, check frequently enough to detect issues quickly, but not so aggressively that temporary hiccups trigger unnecessary restarts. By defining health checks in Terraform, you ensure every deployment has consistent reliability configuration.

For more container topics, see [How to Create Multi-Container Pod Definitions in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-multi-container-pod-definitions-in-terraform/view) and [How to Create Container Resource Limits in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-resource-limits-in-terraform/view).
