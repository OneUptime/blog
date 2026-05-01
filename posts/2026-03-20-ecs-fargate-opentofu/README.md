# How to Deploy ECS with Fargate Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Fargate, Serverless Containers, Infrastructure as Code

Description: Learn how to deploy containerized applications on AWS Fargate using OpenTofu, eliminating the need to manage EC2 instances while running production container workloads.

## Introduction

AWS Fargate is a serverless compute engine for ECS that removes the need to provision, configure, or scale EC2 instances. You define CPU and memory requirements per task, and Fargate automatically provides the underlying compute. It supports both FARGATE (on-demand) and FARGATE_SPOT (up to 70% cost savings for interruption-tolerant workloads).

## Prerequisites

- OpenTofu v1.6+
- An ECR repository with a container image
- AWS credentials with ECS, ECR, and IAM permissions

## Step 1: Create ECS Cluster and Capacity Providers

```hcl
# ECS Cluster with Fargate capacity providers

resource "aws_ecs_cluster" "fargate" {
  name = "${var.project_name}-fargate"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "fargate" {
  cluster_name       = aws_ecs_cluster.fargate.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 1
    weight            = 1
  }
}
```

## Step 2: Create Fargate Task Definition

```hcl
resource "aws_ecs_task_definition" "fargate_app" {
  family                   = "${var.project_name}-fargate-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"  # Required for Fargate
  cpu                      = "256"     # 0.25 vCPU; use a supported Fargate CPU/memory combination
  memory                   = "512"     # 512 MiB

  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arn

  # Runtime platform
  runtime_platform {
    cpu_architecture        = "ARM64"    # Graviton; ARM64 on Fargate requires platform version 1.4.0+
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true
      cpu       = 256
      memory    = 512

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
          appProtocol   = "http"  # For ECS Service Connect
        }
      ]

      environment = [
        { name = "ENV", value = var.environment }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "fargate"
          "awslogs-create-group"  = "true"  # Requires logs:CreateLogGroup on the execution role
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}
```

## Step 3: Deploy Fargate Service with Spot Mix

```hcl
resource "aws_ecs_service" "fargate" {
  name            = "${var.project_name}-fargate"
  cluster         = aws_ecs_cluster.fargate.id
  task_definition = aws_ecs_task_definition.fargate_app.arn
  desired_count   = 3

  # Mix of on-demand and spot for cost optimization
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 1  # 1 guaranteed on-demand task
    weight            = 1
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 2  # 2/3 of tasks on Spot
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_tasks_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count]
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# View running tasks
aws ecs list-tasks \
  --cluster my-project-fargate \
  --service-name my-project-fargate \
  --desired-status RUNNING

# Check service CPU usage in Container Insights
aws cloudwatch get-metric-statistics \
  --namespace ECS/ContainerInsights \
  --metric-name CpuUtilized \
  --dimensions Name=ClusterName,Value=my-project-fargate Name=ServiceName,Value=my-project-fargate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

## Conclusion

Use ARM64 Fargate tasks when possible when your images support it-Graviton can improve price/performance compared to x86. FARGATE_SPOT is ideal for web services, batch workloads, and CI/CD tasks that can handle 2-minute interruption notices; combine it with a small on-demand base to ensure continuity. Container Insights is valuable for Fargate since you can't SSH to underlying hosts-it publishes CPU, memory, and network metrics to CloudWatch, and enhanced observability adds more granular task- and container-level metrics.
