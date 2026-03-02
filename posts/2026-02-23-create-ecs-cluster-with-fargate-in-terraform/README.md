# How to Create ECS Cluster with Fargate in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Fargate, Container, Serverless Containers

Description: A hands-on guide to creating Amazon ECS clusters with AWS Fargate launch type in Terraform, covering cluster configuration, capacity providers, namespaces, and monitoring.

---

Amazon ECS with Fargate lets you run containers without managing servers. You define your container specifications - CPU, memory, image, networking - and Fargate handles the underlying compute. No EC2 instances to patch, no capacity planning for the host fleet, and no wasted resources from underutilized servers.

The ECS cluster is the top-level grouping for your services and tasks. With Fargate, the cluster itself is lightweight - it is mostly a logical construct that holds configuration and serves as the namespace for your services. This guide covers creating a Fargate-enabled cluster in Terraform with all the production settings you need.

## Basic Fargate Cluster

At its simplest, a Fargate cluster is just a name and some settings:

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "myapp-cluster"

  # Enable Container Insights for monitoring
  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "myapp-cluster"
    Environment = var.environment
  }
}
```

That is a functional cluster, but a production setup needs capacity providers and additional configuration.

## Capacity Providers

Capacity providers tell ECS which launch types are available. For Fargate, you have two options: `FARGATE` (on-demand) and `FARGATE_SPOT` (up to 70% cheaper, but tasks can be interrupted):

```hcl
# Cluster capacity providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # Default strategy - use a mix of Fargate and Fargate Spot
  default_capacity_provider_strategy {
    base              = 1          # First task always uses on-demand Fargate
    weight            = 1          # Relative weight for on-demand
    capacity_provider = "FARGATE"
  }

  default_capacity_provider_strategy {
    base              = 0
    weight            = 3          # 3x weight for Spot - 75% of additional tasks use Spot
    capacity_provider = "FARGATE_SPOT"
  }
}
```

With this configuration, the first task always runs on regular Fargate (for availability), and subsequent tasks are split roughly 25% Fargate / 75% Fargate Spot. Adjust the weights based on your tolerance for interruption.

## Service Connect Namespace

If your services need to communicate with each other, set up a Cloud Map namespace for service discovery:

```hcl
# Service Connect namespace for inter-service communication
resource "aws_service_discovery_http_namespace" "main" {
  name        = "myapp"
  description = "Service discovery namespace for myapp ECS services"

  tags = {
    Name = "myapp-namespace"
  }
}

# Associate the namespace with the cluster
resource "aws_ecs_cluster" "main" {
  name = "myapp-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  # Service Connect default namespace
  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.main.arn
  }

  tags = {
    Name        = "myapp-cluster"
    Environment = var.environment
  }
}
```

## CloudWatch Log Group

Create a log group for cluster-level logging:

```hcl
# Log group for ECS tasks
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/myapp"
  retention_in_days = 30

  tags = {
    Name = "ecs-myapp-logs"
  }
}
```

## Execute Command Configuration

ECS Exec lets you run commands inside running containers for debugging. It requires some setup:

```hcl
# KMS key for encrypting exec sessions
resource "aws_kms_key" "ecs_exec" {
  description = "KMS key for ECS Exec session encryption"

  tags = {
    Name = "ecs-exec-key"
  }
}

# S3 bucket for exec session logs
resource "aws_s3_bucket" "ecs_exec_logs" {
  bucket = "myapp-ecs-exec-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "ecs-exec-logs"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "ecs_exec_logs" {
  bucket = aws_s3_bucket.ecs_exec_logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

# CloudWatch log group for exec sessions
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/exec-logs"
  retention_in_days = 30
}

# Cluster with exec configuration
resource "aws_ecs_cluster" "main" {
  name = "myapp-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.ecs_exec.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
        s3_bucket_name                 = aws_s3_bucket.ecs_exec_logs.id
        s3_key_prefix                  = "exec-logs"
      }
    }
  }

  tags = {
    Name = "myapp-cluster"
  }
}

data "aws_caller_identity" "current" {}
```

With this configured, you can shell into a running container:

```bash
aws ecs execute-command \
  --cluster myapp-cluster \
  --task TASK_ID \
  --container app \
  --interactive \
  --command "/bin/sh"
```

## IAM Roles

Fargate tasks need two IAM roles:

```hcl
# Task execution role - used by ECS agent to pull images and write logs
resource "aws_iam_role" "ecs_execution" {
  name = "myapp-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# If pulling from ECR, the execution role needs additional permissions
# The managed policy above covers ECR and CloudWatch Logs

# Task role - used by your application code to access AWS services
resource "aws_iam_role" "ecs_task" {
  name = "myapp-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Add permissions based on what your application needs
resource "aws_iam_role_policy" "task_permissions" {
  name = "task-permissions"
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
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage"
        ]
        Resource = var.sqs_queue_arn
      },
      {
        # Required for ECS Exec
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## VPC and Networking

Fargate tasks need a VPC with subnets:

```hcl
# Security group for ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = var.vpc_id
  description = "Security group for ECS Fargate tasks"

  # Allow traffic from the load balancer
  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "From ALB"
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "ecs-tasks-sg"
  }
}
```

## Outputs

```hcl
output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "execution_role_arn" {
  description = "Task execution role ARN"
  value       = aws_iam_role.ecs_execution.arn
}

output "task_role_arn" {
  description = "Task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "namespace_arn" {
  description = "Service discovery namespace ARN"
  value       = aws_service_discovery_http_namespace.main.arn
}
```

## Fargate vs EC2 Launch Type

Choose Fargate when you want zero server management, have variable workloads, or want to pay per task-second. Choose EC2 launch type when you need GPU support, need to optimize costs for steady-state workloads, or need specific instance types.

You can mix both in the same cluster by adding EC2 capacity providers alongside Fargate.

## Summary

An ECS Fargate cluster in Terraform starts with `aws_ecs_cluster`, capacity providers for Fargate and Fargate Spot, and supporting IAM roles. Enable Container Insights for monitoring, configure ECS Exec for debugging, and set up a Cloud Map namespace if your services need to discover each other. The cluster is the foundation - the real work happens in task definitions and services, which we cover in our guides on [creating ECS task definitions](https://oneuptime.com/blog/post/2026-02-23-create-ecs-task-definitions-in-terraform/view) and [ECS services with load balancers](https://oneuptime.com/blog/post/2026-02-23-create-ecs-services-with-load-balancer-in-terraform/view).
