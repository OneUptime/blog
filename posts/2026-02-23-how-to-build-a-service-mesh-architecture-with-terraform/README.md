# How to Build a Service Mesh Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Service Mesh, Istio, AWS App Mesh, Kubernetes, Microservices

Description: Learn how to build a service mesh architecture using Terraform with AWS App Mesh and Istio for traffic management, observability, and security between microservices.

---

When your microservices architecture grows beyond a handful of services, you start running into problems that are hard to solve at the application level. How do you enforce mutual TLS between all services? How do you do canary deployments? How do you get consistent observability across services written in different languages? A service mesh solves all of these problems by handling them at the infrastructure layer.

In this guide, we will build a service mesh using Terraform. We will cover both AWS App Mesh for native AWS integration and touch on Istio for Kubernetes environments.

## What a Service Mesh Gives You

Before jumping into code, let's be clear about what a service mesh provides:

- **Traffic management**: Canary deployments, traffic splitting, retries, timeouts
- **Security**: Mutual TLS between services, policy enforcement
- **Observability**: Distributed tracing, metrics, access logging without code changes
- **Resilience**: Circuit breaking, fault injection for testing

## AWS App Mesh with ECS

AWS App Mesh integrates natively with ECS and EKS. Let's build a mesh for an ECS-based microservices application.

```hcl
# mesh.tf - App Mesh configuration
resource "aws_appmesh_mesh" "main" {
  name = "${var.project_name}-mesh"

  spec {
    egress_filter {
      type = "DROP_ALL" # Only allow traffic to known services
    }
  }

  tags = {
    Environment = var.environment
  }
}

# Virtual nodes represent each service in the mesh
resource "aws_appmesh_virtual_node" "api_service" {
  name      = "api-service"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    # How this service is discovered by other services
    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "api"
      }
    }

    # What this service listens on
    listener {
      port_mapping {
        port     = 8080
        protocol = "http"
      }

      # Health check configuration
      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 10000
        path                = "/health"
        protocol            = "http"
      }

      # TLS configuration for incoming traffic
      tls {
        mode = "STRICT"
        certificate {
          acm {
            certificate_arn = aws_acm_certificate.api_service.arn
          }
        }
      }
    }

    # Backend services this service can talk to
    backend {
      virtual_service {
        virtual_service_name = aws_appmesh_virtual_service.order_service.name
      }
    }

    backend {
      virtual_service {
        virtual_service_name = aws_appmesh_virtual_service.user_service.name
      }
    }

    # Logging configuration
    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}

resource "aws_appmesh_virtual_node" "order_service" {
  name      = "order-service"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "orders"
      }
    }

    listener {
      port_mapping {
        port     = 8080
        protocol = "grpc"
      }

      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 10000
        protocol            = "grpc"
      }

      tls {
        mode = "STRICT"
        certificate {
          acm {
            certificate_arn = aws_acm_certificate.order_service.arn
          }
        }
      }
    }

    logging {
      access_log {
        file {
          path = "/dev/stdout"
        }
      }
    }
  }
}
```

## Virtual Services and Routers

Virtual services provide a layer of abstraction so consumers do not need to know about the actual service instances. Virtual routers handle traffic routing between different versions.

```hcl
# routing.tf - Traffic management
resource "aws_appmesh_virtual_service" "order_service" {
  name      = "orders.${var.project_name}.local"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    provider {
      virtual_router {
        virtual_router_name = aws_appmesh_virtual_router.order_service.name
      }
    }
  }
}

resource "aws_appmesh_virtual_router" "order_service" {
  name      = "order-service-router"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    listener {
      port_mapping {
        port     = 8080
        protocol = "grpc"
      }
    }
  }
}

# Route with traffic splitting for canary deployments
resource "aws_appmesh_route" "order_service" {
  name                = "order-service-route"
  mesh_name           = aws_appmesh_mesh.main.name
  virtual_router_name = aws_appmesh_virtual_router.order_service.name

  spec {
    grpc_route {
      action {
        # Send 90% to stable, 10% to canary
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.order_service.name
          weight       = 90
        }
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.order_service_canary.name
          weight       = 10
        }
      }

      # Match all gRPC requests to the orders service
      match {
        service_name = "orders.OrderService"
      }

      # Retry policy for transient failures
      retry_policy {
        max_retries = 3

        grpc_retry_events = [
          "unavailable",
          "resource-exhausted"
        ]

        per_retry_timeout {
          unit  = "ms"
          value = 2000
        }
      }
    }
  }
}
```

## Service Discovery

Cloud Map provides service discovery so services can find each other within the mesh.

```hcl
# discovery.tf - Service discovery with Cloud Map
resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.project_name}.local"
  vpc  = aws_vpc.main.id

  tags = {
    Environment = var.environment
  }
}

resource "aws_service_discovery_service" "api" {
  name = "api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "orders" {
  name = "orders"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
```

## ECS Service with Envoy Sidecar

Each ECS service needs an Envoy proxy sidecar that handles all mesh traffic.

```hcl
# ecs.tf - ECS service with Envoy sidecar
resource "aws_ecs_task_definition" "order_service" {
  family                   = "order-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.order_service_task.arn

  # App Mesh proxy configuration
  proxy_configuration {
    type           = "APPMESH"
    container_name = "envoy"

    properties = {
      AppPorts         = "8080"
      EgressIgnoredIPs = "169.254.170.2,169.254.169.254"
      IgnoredUID       = "1337"
      ProxyEgressPort  = 15001
      ProxyIngressPort = 15000
    }
  }

  container_definitions = jsonencode([
    {
      name      = "order-service"
      image     = "${var.ecr_repository_url}/order-service:${var.app_version}"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      dependsOn = [
        {
          containerName = "envoy"
          condition     = "HEALTHY"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.order_service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "order-service"
        }
      }
    },
    {
      name      = "envoy"
      image     = "public.ecr.aws/appmesh/aws-appmesh-envoy:v1.27.0.0-prod"
      essential = true
      user      = "1337"

      environment = [
        {
          name  = "APPMESH_RESOURCE_ARN"
          value = aws_appmesh_virtual_node.order_service.arn
        },
        {
          name  = "ENABLE_ENVOY_XRAY_TRACING"
          value = "1"
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"]
        interval    = 5
        timeout     = 2
        retries     = 3
        startPeriod = 10
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.envoy.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "envoy-order-service"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "order_service" {
  name            = "order-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.order_service.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.order_service.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.orders.arn
  }
}
```

## Observability with X-Ray

With the Envoy sidecar, you get distributed tracing through X-Ray without changing your application code.

```hcl
# observability.tf - Distributed tracing and metrics
resource "aws_xray_sampling_rule" "mesh_services" {
  rule_name      = "mesh-services"
  priority       = 1000
  version        = 1
  reservoir_size = 10
  fixed_rate     = 0.1 # Sample 10% of requests
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
}
```

## Summary

A service mesh built with Terraform provides consistent networking behavior across all your services. The key benefits are that security (mutual TLS), observability (tracing), and traffic management (canary deployments) all happen at the infrastructure level, not in your application code.

Start simple. Get the mesh running with basic routing and then gradually add features like traffic splitting, retry policies, and circuit breaking as you need them.

For monitoring the health and performance of your service mesh, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) for comprehensive observability across your microservices.
