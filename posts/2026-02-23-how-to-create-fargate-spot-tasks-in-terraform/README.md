# How to Create Fargate Spot Tasks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Fargate, Spot, Cost Optimization, Containers, Infrastructure as Code

Description: Learn how to use Fargate Spot with ECS in Terraform to run containers at up to 70% discount while handling interruptions gracefully for fault-tolerant workloads.

---

Fargate Spot lets you run ECS tasks on spare AWS compute capacity at up to 70% discount compared to standard Fargate pricing. The tradeoff is that your tasks can be interrupted with a 30-second warning when AWS needs the capacity back. For fault-tolerant workloads like batch processing, queue workers, and data pipelines, Fargate Spot is an excellent way to reduce costs. This guide shows you how to configure Fargate Spot tasks with Terraform.

## How Fargate Spot Works

When you launch a task with Fargate Spot, AWS runs it on spare capacity. If that capacity is needed for on-demand customers, your task receives a SIGTERM signal followed by a 30-second grace period before being stopped. ECS will automatically try to replace interrupted tasks, but there is no guarantee of immediate capacity.

The key is designing your applications to handle interruptions gracefully by checkpointing progress, using message queues for work distribution, and making operations idempotent.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with private subnets
- Workloads that can tolerate interruption

## Basic Fargate Spot Configuration

The simplest way to use Fargate Spot is through capacity provider strategies.

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

# ECS Cluster with Fargate capacity providers
resource "aws_ecs_cluster" "main" {
  name = "spot-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "spot-cluster"
  }
}

# Associate Fargate and Fargate Spot capacity providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # Default: prefer Fargate Spot with Fargate as fallback
  default_capacity_provider_strategy {
    base              = 0
    weight            = 1
    capacity_provider = "FARGATE_SPOT"
  }
}
```

## IAM Roles

```hcl
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

# Task role
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

## Batch Processing on Fargate Spot

Batch processing workloads are ideal for Fargate Spot because they can checkpoint progress and resume after interruption.

```hcl
# Security group
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = data.aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "batch" {
  name              = "/ecs/batch-processor"
  retention_in_days = 14
}

# Task definition for batch processing
resource "aws_ecs_task_definition" "batch" {
  family                   = "batch-processor"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "processor"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/batch-processor:latest"
      cpu       = 1024
      memory    = 2048
      essential = true

      environment = [
        {
          name  = "SQS_QUEUE_URL"
          value = "https://sqs.us-east-1.amazonaws.com/123456789/batch-queue"
        },
        {
          name  = "S3_CHECKPOINT_BUCKET"
          value = "my-checkpoint-bucket"
        },
        {
          # Set stop timeout to handle SIGTERM gracefully
          name  = "GRACEFUL_SHUTDOWN_TIMEOUT"
          value = "25"  # 25 seconds, leaving 5 seconds buffer
        }
      ]

      # Handle SIGTERM for graceful shutdown
      stopTimeout = 30  # Match Fargate Spot's 30-second warning

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.batch.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "batch"
        }
      }
    }
  ])

  tags = {
    Name = "batch-processor"
  }
}

# ECS Service running entirely on Fargate Spot
resource "aws_ecs_service" "batch" {
  name            = "batch-processor"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.batch.arn
  desired_count   = 5

  # Run 100% on Fargate Spot
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Spread tasks across AZs for resilience
  placement_constraints {
    type = "distinctInstance"
  }

  tags = {
    Name     = "batch-processor-service"
    CostType = "spot"
  }
}
```

## Mixed Fargate and Fargate Spot for Web Services

For web services that need some guaranteed capacity, mix standard Fargate with Fargate Spot.

```hcl
# CloudWatch log group for web app
resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/web-app"
  retention_in_days = 30
}

# Task definition for the web application
resource "aws_ecs_task_definition" "web" {
  family                   = "web-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/web-app:latest"
      cpu       = 512
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.web.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "web"
        }
      }
    }
  ])
}

# Web service with mixed capacity strategy
resource "aws_ecs_service" "web" {
  name            = "web-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = 6

  # Guarantee 2 tasks on standard Fargate, rest on Spot
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 2      # First 2 tasks always on standard Fargate
    weight            = 1      # 25% of additional tasks on standard
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 3      # 75% of additional tasks on Spot
  }

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  tags = {
    Name     = "web-app-service"
    CostType = "mixed"
  }
}
```

## Queue Worker with Auto Scaling on Fargate Spot

Scale workers based on queue depth for maximum cost efficiency.

```hcl
# SQS queue for work items
resource "aws_sqs_queue" "work" {
  name                       = "work-queue"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400

  # Dead letter queue for failed messages
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.work_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "work_dlq" {
  name = "work-queue-dlq"
}

# CloudWatch log group for worker
resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/queue-worker"
  retention_in_days = 14
}

# Worker task definition
resource "aws_ecs_task_definition" "worker" {
  family                   = "queue-worker"
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

      environment = [
        {
          name  = "QUEUE_URL"
          value = aws_sqs_queue.work.url
        }
      ]

      stopTimeout = 30

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.worker.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])
}

# Worker service on Fargate Spot
resource "aws_ecs_service" "worker" {
  name            = "queue-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 2

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  tags = {
    Name = "queue-worker-service"
  }
}

# Auto scaling based on SQS queue depth
resource "aws_appautoscaling_target" "worker" {
  max_capacity       = 20
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "worker_queue_depth" {
  name               = "worker-queue-depth-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker.resource_id
  scalable_dimension = aws_appautoscaling_target.worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker.service_namespace

  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      metric_name = "ApproximateNumberOfMessagesVisible"
      namespace   = "AWS/SQS"
      statistic   = "Average"

      dimensions {
        name  = "QueueName"
        value = aws_sqs_queue.work.name
      }
    }

    # Target 10 messages per worker task
    target_value       = 10.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Monitoring Spot Interruptions

Track spot interruptions with CloudWatch alarms.

```hcl
# SNS topic for spot interruption alerts
resource "aws_sns_topic" "spot_alerts" {
  name = "fargate-spot-alerts"
}

# CloudWatch alarm for task count drops (potential spot interruptions)
resource "aws_cloudwatch_metric_alarm" "spot_interruptions" {
  alarm_name          = "fargate-spot-task-count-drop"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 4  # Alert if running tasks drop below 4
  alarm_description   = "Possible Fargate Spot interruption - task count dropped"
  alarm_actions       = [aws_sns_topic.spot_alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.web.name
  }
}
```

## Outputs

```hcl
output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "batch_service" {
  value = aws_ecs_service.batch.name
}

output "web_service" {
  value = aws_ecs_service.web.name
}

output "worker_service" {
  value = aws_ecs_service.worker.name
}
```

## Best Practices

When using Fargate Spot, design your applications to handle SIGTERM signals gracefully within the 30-second window. Use SQS queues for work distribution so interrupted tasks do not lose work. Set the container `stopTimeout` to 30 seconds to match the spot interruption warning period. Always maintain some standard Fargate capacity for critical services using the `base` parameter. Use auto scaling to automatically replace interrupted tasks and adjust capacity based on demand. Checkpoint long-running operations to S3 or a database so they can resume after interruption.

## Monitoring with OneUptime

Spot interruptions can impact service availability. Use [OneUptime](https://oneuptime.com) to monitor your Fargate Spot services, track interruption frequency, and ensure your fault-tolerant design is working correctly.

## Conclusion

Fargate Spot offers significant cost savings for ECS workloads that can tolerate interruption. By combining Fargate Spot with proper application design, queue-based architectures, and auto scaling, you can run cost-effective container workloads without managing any infrastructure. Terraform makes it easy to define capacity provider strategies that balance cost and availability for each service based on its criticality and fault tolerance.

For more ECS cost optimization topics, check out our guides on [ECS with capacity providers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-capacity-providers-in-terraform/view) and [ECS Execute Command configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-execute-command-configuration-in-terraform/view).
