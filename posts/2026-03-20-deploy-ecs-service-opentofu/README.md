# How to Deploy an ECS Service with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Fargate, Infrastructure as Code

Description: Learn how to deploy a containerised application as an ECS service with Fargate launch type using OpenTofu, including task definitions, service discovery, and load balancing.

## Introduction

Amazon ECS (Elastic Container Service) runs containers without managing servers. Using the Fargate launch type eliminates EC2 node management entirely. This guide deploys a web application as an ECS Fargate service behind an Application Load Balancer.

## ECS Cluster

```hcl
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = var.cluster_name }
}
```

## Task Execution and Task IAM Roles

```hcl
# Execution role: lets ECS pull images and write logs

resource "aws_iam_role" "ecs_execution" {
  name               = "${var.service_name}-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role: permissions for the container application itself
resource "aws_iam_role" "ecs_task" {
  name               = "${var.service_name}-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}
```

## Task Definition

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = var.service_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [{
        containerPort = var.container_port
        protocol      = "tcp"
      }]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT",     value = tostring(var.container_port) },
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = var.db_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.service_name}"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.service_name}"
  retention_in_days = 30
}
```

## ECS Service

```hcl
resource "aws_ecs_service" "app" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  # Allow ECS to update the task definition revision
  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener.app]
}
```

## Outputs

```hcl
output "cluster_arn"     { value = aws_ecs_cluster.main.arn }
output "service_name"    { value = aws_ecs_service.app.name }
output "task_definition" { value = aws_ecs_task_definition.app.arn }
```

## Conclusion

ECS Fargate with OpenTofu provides a serverless container platform with minimal operational overhead. Store secrets in AWS Secrets Manager, enable Container Insights for observability, and use `lifecycle { ignore_changes = [task_definition] }` to let your CI/CD pipeline manage image deployments independently of infrastructure changes.
