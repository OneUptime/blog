# How to Deploy a Fargate Service with OpenTofu on AWS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, Fargate, ECS, Container

Description: Learn how to deploy a containerized application as an AWS Fargate service with ECS task definitions, service auto-scaling, and load balancer integration using OpenTofu.

## Introduction

AWS Fargate is a serverless compute engine for containers that eliminates the need to manage EC2 instances. This guide covers deploying a complete Fargate service with ECS cluster, task definitions, and service configuration using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured
- ECR repository with a container image
- Existing VPC with subnets, security groups, and an ALB target group configured with `ip` targets

## Step 1: Create ECS Cluster

```hcl
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = "production"
  }
}
```

## Step 2: Create Task Definition

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  network_mode             = "awsvpc"    # Required for Fargate
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"       # 0.5 vCPU
  memory                   = "1024"      # 1 GB

  runtime_platform {
    operating_system_family = "LINUX"
  }

  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${var.ecr_repository_url}:${var.image_tag}"
    essential = true

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    environment = [
      { name = "APP_ENV", value = "production" },
      { name = "PORT", value = "8080" }
    ]

    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = var.db_password_ssm_arn
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/my-app"
  retention_in_days = 30
}
```

## Step 3: Create Fargate Service

```hcl
resource "aws_ecs_service" "app" {
  name            = "my-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50

  deployment_controller {
    type = "ECS"
  }

  lifecycle {
    ignore_changes = [desired_count]  # Allow auto-scaling to manage count
  }
}
```

## Step 4: Add Auto-Scaling

```hcl
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "ecs-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully deployed a Fargate service using OpenTofu with ECS task definitions, container health checks, CloudWatch logging, and CPU-based auto-scaling. Fargate eliminates infrastructure management overhead while providing the flexibility of containers. For production workloads, prefer private subnets for Fargate tasks and place an Application Load Balancer in front of the service.
