# How to Create ECS Services with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Service, Fargate, Deployment, Infrastructure as Code

Description: Learn how to create ECS services with OpenTofu for long-running containers with rolling deployments, health checks, and network configuration in a VPC.

## Introduction

ECS Services maintain a desired number of task replicas running, handle rolling deployments, integrate with load balancers, and restart failed tasks. They support FARGATE and EC2 launch types, deployment circuit breakers for automatic rollback on failed rolling deployments, and blue/green deployments via CodeDeploy.

## Prerequisites

- OpenTofu v1.6+
- An ECS cluster, task definition, VPC with subnets, and an ALB target group using the `ip` target type
- AWS credentials with ECS and EC2 permissions

## Step 1: Create ECS Fargate Service

```hcl
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = var.ecs_cluster_id
  task_definition = var.task_definition_arn
  desired_count   = 2  # Number of running task replicas

  launch_type = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false  # Use NAT Gateway for outbound access
  }

  # Rolling deployment configuration
  deployment_minimum_healthy_percent = 100  # Never reduce below 100% during deployment
  deployment_maximum_percent         = 200  # Allow up to 200% during rollout

  deployment_circuit_breaker {
    enable   = true   # Auto-detect failed deployments
    rollback = true   # Automatically roll back on failure
  }

  # Wait for load balancer health checks before marking deployment complete
  health_check_grace_period_seconds = 60

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "app"
    container_port   = 8080
  }

  # Keep the service balanced across AZs for higher availability
  availability_zone_rebalancing = "ENABLED"

  # ECS Exec for debugging
  enable_execute_command = true

  # Propagate tags to tasks
  propagate_tags = "SERVICE"

  tags = {
    Name        = "${var.project_name}-app"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [desired_count]  # Allow auto-scaling to manage count
  }
}
```

## Step 2: Security Group for ECS Tasks

```hcl
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]  # Allow traffic from ALB only
    description     = "Application traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "${var.project_name}-ecs-tasks-sg"
  }
}
```

## Step 3: Service with Capacity Provider Strategy

```hcl
resource "aws_ecs_service" "app_with_spot" {
  name            = "${var.project_name}-app-spot"
  cluster         = var.ecs_cluster_id
  task_definition = var.task_definition_arn
  desired_count   = 4

  # Use Fargate Spot for cost savings with Fargate on-demand as backup
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 1  # At least 1 task on on-demand
    weight            = 1
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    base              = 0
    weight            = 4  # Prefer Spot for most of the remaining tasks
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "app"
    container_port   = 8080
  }

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

# Monitor service deployment

aws ecs describe-services \
  --cluster my-project-cluster \
  --services my-project-app \
  --query 'services[0].{Status: status, Running: runningCount, Desired: desiredCount, Pending: pendingCount}'

# Force new deployment (for example, to restart tasks that use the same image tag)
aws ecs update-service \
  --cluster my-project-cluster \
  --service my-project-app \
  --force-new-deployment
```

## Conclusion

The deployment circuit breaker is the most important ECS service feature to enable for rolling deployments because it automatically rolls back deployments where tasks fail to start or health checks fail, preventing prolonged outages from bad deployments. Use `ignore_changes = [desired_count]` so auto-scaling policies can adjust task count without triggering OpenTofu drift detection. FARGATE_SPOT can reduce compute costs by up to 70% for fault-tolerant services that can handle interruptions.
