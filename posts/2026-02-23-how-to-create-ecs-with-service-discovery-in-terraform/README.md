# How to Create ECS with Service Discovery in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Service Discovery, Cloud Map, Microservices, Infrastructure as Code

Description: Learn how to set up ECS service discovery with AWS Cloud Map using Terraform so your microservices can find and communicate with each other automatically.

---

In a microservices architecture, services need to discover and communicate with each other dynamically. Hardcoding IP addresses or endpoints breaks down when containers are constantly being created, destroyed, and rescheduled. AWS Cloud Map provides service discovery for ECS, automatically registering and deregistering container instances as they come and go. This guide shows you how to set up ECS with service discovery using Terraform.

## How Service Discovery Works with ECS

When you enable service discovery for an ECS service, each task registers itself with AWS Cloud Map. Cloud Map creates DNS records (A or SRV records) in a private DNS namespace. Other services can then find your containers by querying a simple DNS name like `api.production.local`. When tasks start, they are added to the DNS. When they stop, they are removed. This all happens automatically.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with appropriate permissions
- A VPC with private subnets
- Understanding of ECS and DNS concepts

## Creating the Service Discovery Namespace

The namespace is the root domain for all your services. You can use either a private DNS namespace (for internal communication) or a public DNS namespace.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Reference existing VPC
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

# Create a private DNS namespace for service discovery
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "production.local"
  description = "Private DNS namespace for ECS service discovery"
  vpc         = data.aws_vpc.main.id

  tags = {
    Name        = "production-namespace"
    Environment = "production"
  }
}
```

## Registering Services with Cloud Map

Each microservice gets its own service discovery service, which manages the DNS records for that service.

```hcl
# Service discovery service for the API
resource "aws_service_discovery_service" "api" {
  name = "api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10  # Low TTL for faster failover
      type = "A"  # A records for awsvpc network mode
    }

    # Use multivalue answer routing for load balancing
    routing_policy = "MULTIVALUE"
  }

  # Health check configuration
  health_check_custom_config {
    failure_threshold = 1  # Mark unhealthy after 1 failed check
  }

  tags = {
    Name    = "api-service-discovery"
    Service = "api"
  }
}

# Service discovery service for the worker
resource "aws_service_discovery_service" "worker" {
  name = "worker"

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

  tags = {
    Name    = "worker-service-discovery"
    Service = "worker"
  }
}

# Service discovery service for the cache
resource "aws_service_discovery_service" "cache" {
  name = "cache"

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

  tags = {
    Name    = "cache-service-discovery"
    Service = "cache"
  }
}
```

## ECS Cluster and IAM Roles

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "production-cluster"
  }
}

# Task execution role
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

# Task role for application permissions
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
```

## Security Groups

```hcl
# Security group for ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = data.aws_vpc.main.id

  # Allow traffic between all ECS tasks (inter-service communication)
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
    description = "Inter-service communication"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecs-tasks-sg"
  }
}
```

## Task Definitions

Create task definitions for each microservice.

```hcl
# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/production"
  retention_in_days = 30
}

# API task definition
resource "aws_ecs_task_definition" "api" {
  family                   = "api"
  network_mode             = "awsvpc"  # Required for service discovery with A records
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/api:latest"
      cpu       = 512
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      # Services discover each other via DNS names
      environment = [
        {
          name  = "WORKER_URL"
          value = "http://worker.production.local:8080"
        },
        {
          name  = "CACHE_URL"
          value = "http://cache.production.local:6379"
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])

  tags = {
    Name = "api-task-definition"
  }
}

# Worker task definition
resource "aws_ecs_task_definition" "worker" {
  family                   = "worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "worker"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/worker:latest"
      cpu       = 256
      memory    = 512
      essential = true

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "API_URL"
          value = "http://api.production.local:3000"
        },
        {
          name  = "PORT"
          value = "8080"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])

  tags = {
    Name = "worker-task-definition"
  }
}
```

## ECS Services with Service Discovery

Link each ECS service to its Cloud Map service.

```hcl
# API ECS Service with service discovery
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

  # Service discovery registration
  service_registries {
    registry_arn = aws_service_discovery_service.api.arn
  }

  deployment_configuration {
    minimum_healthy_percent = 50
    maximum_percent         = 200
  }

  tags = {
    Name = "api-service"
  }
}

# Worker ECS Service with service discovery
resource "aws_ecs_service" "worker" {
  name            = "worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.worker.arn
  }

  tags = {
    Name = "worker-service"
  }
}
```

## SRV Records for Port Discovery

If your services run on non-standard ports, use SRV records instead of A records. SRV records include both the IP address and port number.

```hcl
# Service discovery with SRV records
resource "aws_service_discovery_service" "api_srv" {
  name = "api-srv"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "SRV"  # SRV records include port information
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# ECS service using SRV-based discovery
resource "aws_ecs_service" "api_srv" {
  name            = "api-srv"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.api_srv.arn
    container_name = "api"
    container_port = 3000
  }
}
```

## Outputs

```hcl
output "namespace_id" {
  description = "Service discovery namespace ID"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "namespace_name" {
  description = "DNS namespace name"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "api_discovery_name" {
  description = "DNS name for the API service"
  value       = "api.${aws_service_discovery_private_dns_namespace.main.name}"
}

output "worker_discovery_name" {
  description = "DNS name for the worker service"
  value       = "worker.${aws_service_discovery_private_dns_namespace.main.name}"
}
```

## Best Practices

When using ECS service discovery, keep the DNS TTL low (10 seconds or less) so clients quickly discover new tasks and stop routing to removed ones. Use the `awsvpc` network mode for A record-based discovery. Set the failure threshold to 1 for quick deregistration of unhealthy tasks. Use security groups to control which services can communicate with each other. Monitor your Cloud Map health checks to ensure services are registering correctly.

## Monitoring with OneUptime

Service discovery issues can cause cascading failures across your microservices. Use [OneUptime](https://oneuptime.com) to monitor inter-service communication, track DNS resolution times, and get alerted when services cannot discover each other.

## Conclusion

Service discovery with AWS Cloud Map and ECS eliminates the need for hardcoded endpoints in your microservices architecture. Terraform makes it straightforward to define the entire setup as code, from namespaces to services to ECS integration. By using DNS-based discovery, your services can find each other automatically, and the registration and deregistration of tasks happens without any manual intervention.

For more ECS topics, check out our guides on [ECS with EC2 launch type](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-ec2-launch-type-in-terraform/view) and [ECS with capacity providers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-capacity-providers-in-terraform/view).
