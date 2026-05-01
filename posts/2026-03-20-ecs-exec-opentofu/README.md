# How to Set Up ECS Exec for Container Debugging with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, ECS Exec, Debugging, SSM, Infrastructure as Code

Description: Learn how to enable and configure ECS Exec with OpenTofu to interactively access running containers on Fargate and EC2 for debugging without SSH or bastion hosts.

## Introduction

ECS Exec uses AWS Systems Manager Session Manager to establish an interactive session directly to a running container. It works with both Fargate and EC2 launch types, requires no inbound security group rules, can log commands and their output to CloudWatch and S3 for audit compliance, and doesn't require SSH or exposing container ports.

## Prerequisites

- OpenTofu v1.6+
- An ECS cluster and task with a task IAM role; ECS Exec uses a managed SSM agent that Amazon ECS or AWS Fargate starts inside the container
- If you're using EC2, an Amazon ECS-optimized AMI released after January 20th, 2021 with agent version 1.50.2+; if you're using Fargate, platform version 1.4.0+ (Linux) or 1.0.0+ (Windows)
- AWS CLI v1.22.3+ or v2.3.6+ and the Session Manager plugin
- If you enable CloudWatch or S3 exec logging, the container image must include `script` and `cat`
- AWS credentials with ECS, SSM, and KMS permissions

## Step 1: Configure Cluster for ECS Exec

```hcl
data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/${var.project_name}/exec"
  retention_in_days = 7
  kms_key_id        = var.kms_key_arn
}

resource "aws_s3_bucket" "ecs_exec_audit" {
  bucket = "${var.project_name}-ecs-exec-audit-${data.aws_caller_identity.current.account_id}"
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = var.kms_key_arn  # Encrypt session data
      logging    = "OVERRIDE"

      log_configuration {
        # Log session activity to CloudWatch
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name

        # Log session activity to S3 for long-term audit
        s3_bucket_name               = aws_s3_bucket.ecs_exec_audit.bucket
        s3_bucket_encryption_enabled = true
        s3_key_prefix                = "ecs-exec/"
      }
    }
  }
}
```

## Step 2: Grant Task Role Permissions for ECS Exec

```hcl
resource "aws_iam_role_policy" "ecs_exec" {
  name = "ecs-exec-permissions"
  role = var.task_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      },
      # Required if logging to CloudWatch
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      # Required if logging to S3
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetEncryptionConfiguration"
        ]
        Resource = aws_s3_bucket.ecs_exec_audit.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.ecs_exec_audit.arn}/*"
      },
      # Required if using KMS encryption
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}
```

## Step 3: Enable ECS Exec on Service

```hcl
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = var.task_definition_arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_tasks_sg_id]
    assign_public_ip = false
  }

  # Enable ECS Exec on this service
  enable_execute_command = true

  tags = {
    Name = "${var.project_name}-app"
  }
}
```

## Step 4: Use ECS Exec to Access Container

```bash
# Install Session Manager plugin for AWS CLI

# https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

# Get the task ID
TASK_ID=$(aws ecs list-tasks \
  --cluster my-project-cluster \
  --service-name my-project-app \
  --query 'taskArns[0]' --output text | awk -F'/' '{print $NF}')

# Open interactive shell in the container
aws ecs execute-command \
  --cluster my-project-cluster \
  --task $TASK_ID \
  --container app \
  --interactive \
  --command "/bin/sh"

# Run a single command
aws ecs execute-command \
  --cluster my-project-cluster \
  --task $TASK_ID \
  --container app \
  --interactive \
  --command "ps aux"
```

## Step 5: IAM Policy for Developers to Use ECS Exec

```hcl
resource "aws_iam_policy" "ecs_exec_access" {
  name = "${var.project_name}-ecs-exec-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecs:ExecuteCommand", "ecs:DescribeTasks"]
        Resource = [
          "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:cluster/${var.project_name}-cluster",
          "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:task/${var.project_name}-cluster/*"
        ]
      },
      # Required if using a customer managed KMS key for ECS Exec
      {
        Effect   = "Allow"
        Action   = ["kms:GenerateDataKey"]
        Resource = var.kms_key_arn
      }
    ]
  })
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

ECS Exec provides production-safe debugging access without requiring SSH access or exposing container ports. Enable audit logging to both CloudWatch and S3 for compliance-CloudWatch enables real-time monitoring while S3 provides long-term retention. Restrict `ecs:ExecuteCommand` access to specific clusters and consider using IAM conditions to limit access to non-production environments for most developers.
