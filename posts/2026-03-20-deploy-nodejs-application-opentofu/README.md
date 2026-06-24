# How to Deploy a Node.js Application with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Node.js, ECS, Fargate, AWS, Infrastructure as Code

Description: Learn how to deploy a Node.js application on AWS using OpenTofu, with ECS Fargate for containers, an Application Load Balancer, and RDS for the database.

## Introduction

This guide deploys a containerized Node.js application on AWS ECS Fargate using OpenTofu. The architecture includes an Application Load Balancer, ECS service with auto-scaling, and ECR for container image storage.

## ECR Repository

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "myapp-nodejs"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
```

## ECS Cluster and Task Definition

```hcl
resource "aws_ecs_cluster" "main" {
  name = "myapp-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "nodejs" {
  family                   = "myapp-nodejs"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "nodejs-app"
    image = "${aws_ecr_repository.app.repository_url}:${var.app_version}"

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = "3000" },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.db_url.arn },
      { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
    ]

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/myapp-nodejs"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "nodejs"
      }
    }
  }])
}
```

## Load Balancer and Target Group

```hcl
resource "aws_lb" "app" {
  name               = "myapp-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets
}

resource "aws_lb_target_group" "nodejs" {
  name        = "myapp-nodejs-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nodejs.arn
  }
}
```

## ECS Service with Auto-Scaling

```hcl
resource "aws_ecs_service" "nodejs" {
  name            = "myapp-nodejs"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.nodejs.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.nodejs.arn
    container_name   = "nodejs-app"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_appautoscaling_target" "nodejs" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.nodejs.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "myapp-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.nodejs.resource_id
  scalable_dimension = aws_appautoscaling_target.nodejs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.nodejs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

## Summary

This OpenTofu configuration deploys a Node.js application on ECS Fargate with HTTPS load balancing, automatic scaling based on CPU utilization, deployment circuit breakers for automatic rollbacks, and secrets managed through AWS Secrets Manager. The ECR repository stores container images with automatic cleanup of old images. Deploy new versions by updating the `app_version` variable and running `tofu apply`; ECS handles the rolling deployment.
