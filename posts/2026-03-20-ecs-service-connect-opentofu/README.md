# How to Set Up ECS Service Connect with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Service Connect, Service Mesh, Infrastructure as Code

Description: Learn how to configure ECS Service Connect with OpenTofu to enable service-to-service communication with built-in load balancing and observability in Amazon ECS.

## Introduction

ECS Service Connect is AWS's built-in service mesh for ECS, enabling services to discover and communicate with each other by name with automatic load balancing, retries, and CloudWatch metrics. OpenTofu manages clusters, namespaces, and service configurations.

## Creating an ECS Cluster with Service Connect Namespace

```hcl
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster-${var.environment}"

  service_connect_defaults {
    # Default Cloud Map namespace for Service Connect
    namespace = aws_service_discovery_http_namespace.main.arn
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

# HTTP namespace for Service Connect (does not create DNS records)

resource "aws_service_discovery_http_namespace" "main" {
  name        = var.app_name
  description = "Service Connect namespace for ${var.app_name}"
}
```

## Client Service (Calls Other Services)

```hcl
resource "aws_ecs_service" "frontend" {
  name            = "frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.frontend.id]
  }

  # Service Connect configuration for the client service
  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    log_configuration {
      log_driver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.service_connect.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "frontend-proxy"
      }
    }
  }
}
```

## Server Service (Exposes an Endpoint)

```hcl
resource "aws_ecs_service" "payments" {
  name            = "payments"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.payments.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.payments.id]
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    service {
      port_name      = "http"
      discovery_name = "payments"  # other services call http://payments:8080

      client_alias {
        port     = 8080
        dns_name = "payments"
      }
    }
  }
}
```

## Task Definition with Port Name

Port names in the task definition must match the Service Connect service port names.

```hcl
resource "aws_ecs_task_definition" "payments" {
  family                   = "payments"
  cpu                      = 256
  memory                   = 512
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([{
    name  = "payments"
    image = "${var.ecr_repo}/payments:latest"
    portMappings = [{
      name          = "http"       # must match service_connect service.port_name
      containerPort = 8080
      protocol      = "tcp"
    }]
  }])
}
```

## Outputs

```hcl
output "cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "namespace_arn" {
  value = aws_service_discovery_http_namespace.main.arn
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

ECS Service Connect simplifies microservice communication by providing automatic service discovery, load balancing, and observability without managing a separate service mesh. OpenTofu manages the cluster namespace configuration, service definitions, and task definitions that enable Service Connect.
