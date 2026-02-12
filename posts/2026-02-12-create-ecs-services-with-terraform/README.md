# How to Create ECS Services with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, ECS, Containers, Fargate

Description: A comprehensive guide to deploying containerized applications on Amazon ECS with Terraform, covering Fargate, task definitions, services, load balancers, and auto-scaling.

---

Amazon ECS is AWS's container orchestration service. If you want to run Docker containers on AWS without managing Kubernetes, ECS is the go-to choice. Combined with Fargate, you don't even need to manage EC2 instances - AWS handles the underlying compute entirely.

Setting up ECS involves several interconnected resources: clusters, task definitions, services, load balancers, and IAM roles. Terraform keeps all of it organized and reproducible.

## ECS Cluster

The cluster is the logical grouping for your services. With Fargate, it's mostly just a name and some settings:

```hcl
# ECS Cluster with Container Insights enabled
resource "aws_ecs_cluster" "main" {
  name = "myapp-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Cluster capacity providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = "FARGATE"
  }

  default_capacity_provider_strategy {
    weight            = 3
    capacity_provider = "FARGATE_SPOT"
  }
}
```

The capacity provider strategy here runs one task on regular Fargate as a baseline and distributes the rest 3:1 to Fargate Spot, which is significantly cheaper.

## IAM Roles

ECS needs two IAM roles: a task execution role (used by ECS to pull images and write logs) and a task role (used by your application code to access AWS services):

```hcl
# Task execution role - ECS uses this to pull images and manage tasks
resource "aws_iam_role" "ecs_execution" {
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

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role - your application uses this to access AWS services
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

# Example: Give the task access to an S3 bucket
resource "aws_iam_role_policy" "task_s3_access" {
  name = "s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::myapp-data/*"
      }
    ]
  })
}
```

For more details on IAM configuration, see our post on [creating IAM roles and policies with Terraform](https://oneuptime.com/blog/post/create-iam-roles-policies-with-terraform/view).

## Task Definition

The task definition describes your container - the image, resources, ports, environment variables, and health checks:

```hcl
# CloudWatch log group for the container
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/myapp"
  retention_in_days = 30
}

# Task definition
resource "aws_ecs_task_definition" "app" {
  family                   = "myapp"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"    # 0.5 vCPU
  memory                   = "1024"   # 1 GB
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${var.ecr_repository_url}:${var.image_tag}"

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "8080"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_url.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

The `secrets` block pulls values from Secrets Manager at runtime, so sensitive data never appears in your Terraform state or task definition. Check out our post on [creating Secrets Manager secrets with Terraform](https://oneuptime.com/blog/post/create-secrets-manager-secrets-with-terraform/view).

## Load Balancer

Most ECS services sit behind an Application Load Balancer:

```hcl
# Application Load Balancer
resource "aws_lb" "app" {
  name               = "myapp-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  tags = {
    Environment = "production"
  }
}

# Target group for ECS
resource "aws_lb_target_group" "app" {
  name        = "myapp-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"  # Required for Fargate

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  # Allow time for in-flight requests during deployments
  deregistration_delay = 30
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## ECS Service

Now tie everything together with the service definition:

```hcl
# ECS Service
resource "aws_ecs_service" "app" {
  name            = "myapp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  # Network configuration for Fargate
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Load balancer integration
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  # Deployment configuration
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Ignore changes to desired_count if auto-scaling manages it
  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [aws_lb_listener.https]
}
```

The `deployment_circuit_breaker` with `rollback = true` is a nice safety net. If the new version fails health checks, ECS automatically rolls back to the last working version.

## Auto-Scaling

Scale your service based on CPU or request count:

```hcl
# Auto-scaling target
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale based on CPU utilization
resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-auto-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Scale based on ALB request count
resource "aws_appautoscaling_policy" "requests" {
  name               = "request-count-auto-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.app.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    target_value       = 1000
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Wrapping Up

ECS with Terraform involves quite a few resources, but each one has a clear purpose. The cluster groups your services, the task definition describes your container, the service manages the desired count and deployments, and auto-scaling keeps things responsive. Start with a single service on Fargate, get it working end to end, then add auto-scaling and Fargate Spot for cost optimization.
