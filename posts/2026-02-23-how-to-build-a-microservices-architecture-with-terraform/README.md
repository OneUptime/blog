# How to Build a Microservices Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Microservices, ECS, Docker, Infrastructure Patterns, Cloud Architecture

Description: A practical guide to provisioning a complete microservices architecture on AWS using Terraform, covering ECS Fargate, service discovery, load balancing, and inter-service communication.

---

Microservices give teams the freedom to develop, deploy, and scale individual components independently. But that freedom comes with infrastructure complexity. Each service needs its own compute, networking, service discovery, and monitoring. Managing all of this manually is a recipe for configuration drift and outages.

Terraform solves this problem by letting you define your entire microservices infrastructure as code. In this guide, we will build a production-grade microservices platform on AWS using ECS Fargate, Application Load Balancers, and service discovery.

## Architecture Overview

Here is what our microservices platform looks like:

- A VPC with public and private subnets across multiple availability zones
- An ECS Fargate cluster for running containers
- Application Load Balancer for routing traffic
- AWS Cloud Map for service discovery
- ECR repositories for container images
- CloudWatch for centralized logging

## Project Structure

Organize your Terraform code with reusable modules:

```text
microservices-infra/
  main.tf
  variables.tf
  outputs.tf
  modules/
    vpc/
    ecs_cluster/
    ecs_service/
    alb/
    service_discovery/
```

## VPC Foundation

Every microservices deployment starts with proper networking. We need private subnets for our services and public subnets for the load balancer:

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Public subnets for the load balancer
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-${var.availability_zones[count.index]}"
  }
}

# Private subnets for ECS services
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-private-${var.availability_zones[count.index]}"
  }
}

# NAT Gateway so private subnets can reach the internet
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}-nat"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}
```

## ECS Cluster

The cluster itself is simple with Fargate since there are no EC2 instances to manage:

```hcl
# modules/ecs_cluster/main.tf
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}
```

## Reusable Service Module

This is the heart of the architecture. Each microservice gets deployed through this module:

```hcl
# modules/ecs_service/main.tf

# Task definition describes the container configuration
resource "aws_ecs_task_definition" "this" {
  family                   = var.service_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      # Send logs to CloudWatch
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = var.service_name
        }
      }

      environment = [
        for key, value in var.environment_variables : {
          name  = key
          value = value
        }
      ]
    }
  ])
}

# The ECS service runs and maintains the desired task count
resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  # Register with Cloud Map for service discovery
  service_registries {
    registry_arn = aws_service_discovery_service.this.arn
  }

  depends_on = [aws_lb_listener_rule.this]
}
```

## Service Discovery

Cloud Map lets your services find each other by name instead of hardcoded endpoints:

```hcl
# modules/service_discovery/main.tf
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}.local"
  description = "Service discovery namespace for microservices"
  vpc         = var.vpc_id
}

# Each service registers here
resource "aws_service_discovery_service" "this" {
  name = var.service_name

  dns_config {
    namespace_id = var.namespace_id

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

With this setup, your order service can reach the user service at `users.myproject.local` without knowing the actual IP address.

## Load Balancer and Routing

The ALB handles external traffic and routes it to the right service based on path patterns:

```hcl
# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

# Path-based routing to different services
resource "aws_lb_listener_rule" "this" {
  listener_arn = var.listener_arn
  priority     = var.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  condition {
    path_pattern {
      values = [var.path_pattern]
    }
  }
}
```

## Auto Scaling

Each service should scale independently based on its own metrics:

```hcl
# Auto scaling target
resource "aws_appautoscaling_target" "this" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale based on CPU utilization
resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this.resource_id
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  service_namespace  = aws_appautoscaling_target.this.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Composing the Services

In the root module, you instantiate each microservice:

```hcl
# Deploy the users service
module "users_service" {
  source              = "./modules/ecs_service"
  service_name        = "users"
  cluster_id          = module.ecs_cluster.cluster_id
  ecr_repository_url  = aws_ecr_repository.users.repository_url
  image_tag           = "latest"
  container_port      = 3000
  cpu                 = 256
  memory              = 512
  desired_count       = 2
  private_subnet_ids  = module.vpc.private_subnet_ids
  path_pattern        = "/api/users*"
  environment_variables = {
    DB_HOST = module.users_db.endpoint
  }
}

# Deploy the orders service
module "orders_service" {
  source              = "./modules/ecs_service"
  service_name        = "orders"
  cluster_id          = module.ecs_cluster.cluster_id
  ecr_repository_url  = aws_ecr_repository.orders.repository_url
  image_tag           = "latest"
  container_port      = 3000
  cpu                 = 512
  memory              = 1024
  desired_count       = 3
  private_subnet_ids  = module.vpc.private_subnet_ids
  path_pattern        = "/api/orders*"
  environment_variables = {
    DB_HOST       = module.orders_db.endpoint
    USERS_SERVICE = "users.${var.project_name}.local"
  }
}
```

## Monitoring

Set up CloudWatch dashboards and alarms per service. For a deeper dive into building observability infrastructure, check out [building a monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

Building a microservices architecture with Terraform gives you a repeatable, version-controlled way to manage complex distributed systems. The modular approach we covered here means adding a new service is as simple as adding another module block. Each service gets its own scaling policies, security groups, and service discovery registration, all defined in code. Start with two or three services, get the patterns right, and then scale from there.
