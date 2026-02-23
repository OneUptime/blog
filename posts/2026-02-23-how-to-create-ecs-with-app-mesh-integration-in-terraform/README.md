# How to Create ECS with App Mesh Integration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, App Mesh, Service Mesh, Envoy, Microservices, Infrastructure as Code

Description: Learn how to integrate AWS App Mesh with ECS using Terraform to add traffic management, observability, and security to your microservices communication.

---

As microservices architectures grow, managing service-to-service communication becomes increasingly complex. AWS App Mesh is a service mesh that provides application-level networking, giving you consistent visibility and control over traffic between your services. It uses Envoy proxy sidecars to intercept and manage all network traffic, enabling features like traffic routing, retries, timeouts, and circuit breakers. This guide shows you how to integrate App Mesh with ECS using Terraform.

## How App Mesh Works with ECS

App Mesh uses several key concepts:

- **Mesh** - The top-level resource that represents your service mesh
- **Virtual Service** - An abstraction of a real service, providing a stable name for service-to-service communication
- **Virtual Node** - A pointer to a specific task group (ECS service)
- **Virtual Router** - Handles traffic routing between virtual nodes
- **Route** - Defines how traffic is distributed to virtual nodes

Each ECS task runs an Envoy sidecar proxy that intercepts all inbound and outbound traffic, applying the routing rules defined in App Mesh.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with private subnets
- AWS Cloud Map namespace for service discovery
- Understanding of ECS and service mesh concepts

## Creating the App Mesh

```hcl
provider "aws" {
  region = "us-east-1"
}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# Create the App Mesh
resource "aws_appmesh_mesh" "main" {
  name = "production-mesh"

  spec {
    egress_filter {
      type = "DROP_ALL"  # Only allow traffic to known services
    }
  }

  tags = {
    Name        = "production-mesh"
    Environment = "production"
  }
}

# Service discovery namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "production.local"
  description = "Service discovery namespace for App Mesh"
  vpc         = data.aws_vpc.main.id
}
```

## Defining Virtual Nodes

Virtual nodes represent your ECS services in the mesh.

```hcl
# Virtual node for the frontend service
resource "aws_appmesh_virtual_node" "frontend" {
  name      = "frontend-node"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    # Backend services that frontend can communicate with
    backend {
      virtual_service {
        virtual_service_name = "api.production.local"
      }
    }

    # Listener configuration
    listener {
      port_mapping {
        port     = 80
        protocol = "http"
      }

      # Health check for the virtual node
      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 30000
        path                = "/health"
        port                = 80
        protocol            = "http"
      }

      # Connection pool limits
      connection_pool {
        http {
          max_connections      = 100
          max_pending_requests = 50
        }
      }
    }

    # Service discovery using Cloud Map
    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "frontend"
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

  tags = {
    Name = "frontend-virtual-node"
  }
}

# Virtual node for the API service
resource "aws_appmesh_virtual_node" "api" {
  name      = "api-node"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    backend {
      virtual_service {
        virtual_service_name = "database.production.local"
      }
    }

    backend {
      virtual_service {
        virtual_service_name = "cache.production.local"
      }
    }

    listener {
      port_mapping {
        port     = 3000
        protocol = "http"
      }

      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 30000
        path                = "/health"
        port                = 3000
        protocol            = "http"
      }

      # Timeout configuration
      timeout {
        http {
          idle {
            unit  = "s"
            value = 60
          }
          per_request {
            unit  = "s"
            value = 30
          }
        }
      }
    }

    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "api"
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

  tags = {
    Name = "api-virtual-node"
  }
}

# Virtual node for API v2 (for canary deployments)
resource "aws_appmesh_virtual_node" "api_v2" {
  name      = "api-v2-node"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    backend {
      virtual_service {
        virtual_service_name = "database.production.local"
      }
    }

    listener {
      port_mapping {
        port     = 3000
        protocol = "http"
      }

      health_check {
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout_millis      = 5000
        interval_millis     = 30000
        path                = "/health"
        port                = 3000
        protocol            = "http"
      }
    }

    service_discovery {
      aws_cloud_map {
        namespace_name = aws_service_discovery_private_dns_namespace.main.name
        service_name   = "api-v2"
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

  tags = {
    Name = "api-v2-virtual-node"
  }
}
```

## Virtual Routers and Routes

Virtual routers handle traffic distribution between virtual node versions.

```hcl
# Virtual router for the API service
resource "aws_appmesh_virtual_router" "api" {
  name      = "api-router"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    listener {
      port_mapping {
        port     = 3000
        protocol = "http"
      }
    }
  }

  tags = {
    Name = "api-virtual-router"
  }
}

# Route with weighted targets for canary deployment
resource "aws_appmesh_route" "api" {
  name                = "api-route"
  mesh_name           = aws_appmesh_mesh.main.name
  virtual_router_name = aws_appmesh_virtual_router.api.name

  spec {
    http_route {
      match {
        prefix = "/"
      }

      action {
        weighted_target {
          virtual_node = aws_appmesh_virtual_node.api.name
          weight       = 90  # 90% to current version
        }

        weighted_target {
          virtual_node = aws_appmesh_virtual_node.api_v2.name
          weight       = 10  # 10% canary to new version
        }
      }

      # Retry policy
      retry_policy {
        http_retry_events = [
          "server-error",
          "gateway-error",
        ]
        max_retries = 3

        per_retry_timeout {
          unit  = "s"
          value = 5
        }
      }

      # Request timeout
      timeout {
        idle {
          unit  = "s"
          value = 60
        }
        per_request {
          unit  = "s"
          value = 30
        }
      }
    }
  }
}
```

## Virtual Services

Virtual services provide stable names for your mesh services.

```hcl
# Virtual service backed by the virtual router
resource "aws_appmesh_virtual_service" "api" {
  name      = "api.production.local"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    provider {
      virtual_router {
        virtual_router_name = aws_appmesh_virtual_router.api.name
      }
    }
  }
}

# Virtual service backed directly by a virtual node (no routing)
resource "aws_appmesh_virtual_service" "frontend" {
  name      = "frontend.production.local"
  mesh_name = aws_appmesh_mesh.main.name

  spec {
    provider {
      virtual_node {
        virtual_node_name = aws_appmesh_virtual_node.frontend.name
      }
    }
  }
}
```

## ECS Task Definition with Envoy Sidecar

Configure the ECS task definition to include the Envoy proxy sidecar.

```hcl
# IAM role for task execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role needs App Mesh permissions
resource "aws_iam_role" "ecs_task" {
  name = "ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "appmesh_envoy" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = "arn:aws:iam::aws:policy/AWSAppMeshEnvoyAccess"
}

# CloudWatch log groups
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/production/api"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "envoy" {
  name              = "/ecs/production/envoy"
  retention_in_days = 14
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "mesh-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Task definition with Envoy sidecar
resource "aws_ecs_task_definition" "api" {
  family                   = "api-mesh"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  # App Mesh proxy configuration
  proxy_configuration {
    type           = "APPMESH"
    container_name = "envoy"

    properties = {
      AppPorts         = "3000"
      EgressIgnoredIPs = "169.254.170.2,169.254.169.254"
      IgnoredUID       = "1337"
      ProxyEgressPort  = 15001
      ProxyIngressPort = 15000
    }
  }

  container_definitions = jsonencode([
    {
      # Application container
      name      = "api"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/api:latest"
      cpu       = 256
      memory    = 512
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "PORT"
          value = "3000"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "api"
        }
      }

      # App container depends on envoy being healthy
      dependsOn = [
        {
          containerName = "envoy"
          condition     = "HEALTHY"
        }
      ]
    },
    {
      # Envoy sidecar proxy
      name      = "envoy"
      image     = "840364872350.dkr.ecr.us-east-1.amazonaws.com/aws-appmesh-envoy:v1.27.0.0-prod"
      cpu       = 256
      memory    = 512
      essential = true
      user      = "1337"

      environment = [
        {
          name  = "APPMESH_RESOURCE_ARN"
          value = aws_appmesh_virtual_node.api.arn
        },
        {
          name  = "ENVOY_LOG_LEVEL"
          value = "info"
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
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "envoy"
        }
      }
    }
  ])

  tags = {
    Name = "api-mesh-task"
  }
}
```

## ECS Service with Service Discovery

```hcl
# Service discovery service for Cloud Map
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

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "mesh-tasks-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Service
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.api.arn
  }

  tags = {
    Name = "api-mesh-service"
  }
}
```

## Outputs

```hcl
output "mesh_name" {
  value = aws_appmesh_mesh.main.name
}

output "mesh_arn" {
  value = aws_appmesh_mesh.main.arn
}

output "api_virtual_service" {
  value = aws_appmesh_virtual_service.api.name
}
```

## Best Practices

When using App Mesh with ECS, start with a simple mesh and gradually add services. Use weighted routing for canary deployments to safely roll out new versions. Configure retry policies and timeouts to handle transient failures gracefully. Set the egress filter to DROP_ALL to enforce that all traffic goes through the mesh. Monitor Envoy proxy metrics alongside your application metrics. Keep the Envoy image updated to get the latest security patches and features.

## Monitoring with OneUptime

App Mesh provides deep traffic visibility, but you also need external monitoring. Use [OneUptime](https://oneuptime.com) to monitor your services from outside the mesh, ensuring end-to-end availability and performance tracking.

## Conclusion

AWS App Mesh with ECS gives you powerful traffic management, observability, and security for your microservices. Terraform makes the complex mesh configuration manageable by defining everything as code. From virtual nodes and routers to Envoy sidecar configuration, the entire service mesh setup is version-controlled and reproducible. By starting simple and gradually adding features like canary routing and retry policies, you can build a robust service mesh that grows with your architecture.

For more ECS topics, see our guides on [ECS with service discovery](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-service-discovery-in-terraform/view) and [ECS with CloudWatch Container Insights](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-cloudwatch-container-insights-in-terraform/view).
