# How to Create ECS Execute Command Configuration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Execute Command, Debugging, SSM, Containers, Infrastructure as Code

Description: Learn how to configure ECS Exec with Terraform to get interactive shell access to running containers for debugging and troubleshooting in production.

---

Debugging containers in production is challenging when you cannot access the container directly. ECS Exec, powered by AWS Systems Manager (SSM), lets you get an interactive shell session or run a single command inside a running container. This is similar to `docker exec` but works with Fargate and EC2 launch types in a secure, auditable way. This guide shows you how to configure ECS Execute Command with Terraform.

## How ECS Exec Works

ECS Exec uses AWS Systems Manager Session Manager to establish a connection to your container. When you enable ECS Exec on a service, the ECS agent installs the SSM agent inside each container. You can then use the `aws ecs execute-command` CLI command to start an interactive session. All sessions are logged to CloudWatch Logs or S3 for auditing.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- AWS CLI v2 with the Session Manager plugin installed
- A VPC with private subnets
- NAT gateway or VPC endpoints for SSM connectivity

## VPC Endpoints for SSM (Required for Private Subnets)

If your tasks run in private subnets without a NAT gateway, you need VPC endpoints for SSM.

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

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "vpc-endpoints-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vpc-endpoints-sg"
  }
}

# SSM endpoint
resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = data.aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ssm-endpoint"
  }
}

# SSM Messages endpoint (required for ECS Exec)
resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id              = data.aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ssmmessages-endpoint"
  }
}
```

## IAM Configuration

The task role needs SSM permissions for ECS Exec to work.

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

# Task role with SSM permissions for ECS Exec
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

# SSM permissions required for ECS Exec
resource "aws_iam_role_policy" "ecs_exec" {
  name = "ecs-exec-policy"
  role = aws_iam_role.ecs_task.id

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
      {
        # Optional: allow logging to CloudWatch
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        # Optional: allow logging to S3
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetEncryptionConfiguration"
        ]
        Resource = [
          "${aws_s3_bucket.ecs_exec_logs.arn}/*"
        ]
      },
      {
        # Optional: KMS for encrypted sessions
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.ecs_exec.arn
        ]
      }
    ]
  })
}
```

## Logging Configuration

Configure audit logging for ECS Exec sessions.

```hcl
# KMS key for encrypting exec sessions
resource "aws_kms_key" "ecs_exec" {
  description             = "KMS key for ECS Exec session encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "ecs-exec-key"
  }
}

# CloudWatch log group for exec session logs
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/exec-logs"
  retention_in_days = 90  # Keep exec logs for audit compliance

  tags = {
    Name    = "ecs-exec-logs"
    Purpose = "audit"
  }
}

# S3 bucket for exec session logs (long-term storage)
resource "aws_s3_bucket" "ecs_exec_logs" {
  bucket = "my-ecs-exec-session-logs"

  tags = {
    Name    = "ecs-exec-logs"
    Purpose = "audit"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ecs_exec_logs" {
  bucket = aws_s3_bucket.ecs_exec_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.ecs_exec.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "ecs_exec_logs" {
  bucket = aws_s3_bucket.ecs_exec_logs.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}
```

## ECS Cluster with Execute Command Logging

```hcl
# ECS Cluster with exec command logging configuration
resource "aws_ecs_cluster" "main" {
  name = "exec-enabled-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      # Encrypt exec sessions with KMS
      kms_key_id = aws_kms_key.ecs_exec.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
        s3_bucket_name                 = aws_s3_bucket.ecs_exec_logs.id
        s3_bucket_encryption_enabled   = true
        s3_key_prefix                  = "exec-logs"
      }
    }
  }

  tags = {
    Name = "exec-enabled-cluster"
  }
}
```

## Task Definition and Service with ECS Exec Enabled

```hcl
# Application log group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/exec-app"
  retention_in_days = 30
}

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

# Task definition
resource "aws_ecs_task_definition" "app" {
  family                   = "exec-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn  # Must have SSM permissions

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/app:latest"
      cpu       = 512
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      # The container needs a shell for interactive exec sessions
      # Most images include /bin/sh or /bin/bash
      # For distroless images, you may need to add debug tools

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }

      # Recommended: include common debug tools in your container
      # apt-get install -y curl wget net-tools dnsutils
    }
  ])

  tags = {
    Name = "exec-app"
  }
}

# ECS Service with execute command enabled
resource "aws_ecs_service" "app" {
  name            = "exec-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  # Enable execute command on this service
  enable_execute_command = true

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  tags = {
    Name = "exec-app-service"
  }
}
```

## Using ECS Exec

After deploying, use the AWS CLI to access your containers.

```bash
# Start an interactive shell session
aws ecs execute-command \
  --cluster exec-enabled-cluster \
  --task <task-id> \
  --container app \
  --interactive \
  --command "/bin/sh"

# Run a single command
aws ecs execute-command \
  --cluster exec-enabled-cluster \
  --task <task-id> \
  --container app \
  --command "cat /etc/hostname"

# Check connectivity from inside the container
aws ecs execute-command \
  --cluster exec-enabled-cluster \
  --task <task-id> \
  --container app \
  --interactive \
  --command "curl -s http://api.production.local:3000/health"
```

## IAM Policy for Users

Control which users can use ECS Exec.

```hcl
# IAM policy for developers who need exec access
resource "aws_iam_policy" "ecs_exec_users" {
  name = "ecs-exec-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:ExecuteCommand",
          "ecs:DescribeTasks"
        ]
        Resource = [
          "arn:aws:ecs:us-east-1:*:task/${aws_ecs_cluster.main.name}/*"
        ]
        Condition = {
          StringEquals = {
            "ecs:cluster" = aws_ecs_cluster.main.arn
          }
        }
      },
      {
        # Required for the SSM session
        Effect = "Allow"
        Action = [
          "ssm:StartSession"
        ]
        Resource = "arn:aws:ecs:us-east-1:*:task/${aws_ecs_cluster.main.name}/*"
      }
    ]
  })
}
```

## Outputs

```hcl
output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "service_name" {
  value = aws_ecs_service.app.name
}

output "exec_log_group" {
  value = aws_cloudwatch_log_group.ecs_exec.name
}

output "exec_command_example" {
  value = "aws ecs execute-command --cluster ${aws_ecs_cluster.main.name} --task <TASK_ID> --container app --interactive --command '/bin/sh'"
}
```

## Best Practices

When configuring ECS Exec, always enable logging for audit compliance. Use KMS encryption for exec sessions to protect sensitive data. Restrict exec access to specific users and roles through IAM policies. Do not enable exec on every service - only enable it on services where debugging access is needed. Include basic debug tools in your container images (curl, wget, dig) so they are available during exec sessions. Review exec session logs regularly as part of your security audit process.

## Monitoring with OneUptime

While ECS Exec gives you interactive debugging access, proactive monitoring helps you detect issues before they require manual intervention. Use [OneUptime](https://oneuptime.com) to monitor your ECS services continuously and reserve exec access for deep debugging when needed.

## Conclusion

ECS Execute Command brings the convenience of `docker exec` to cloud-hosted containers in a secure, auditable way. With Terraform, you can configure the entire setup including VPC endpoints, IAM roles, KMS encryption, and logging as part of your infrastructure code. This gives your team a reliable debugging tool for production containers while maintaining security and compliance through encrypted, logged sessions.

For more ECS operational topics, check out our guides on [ECS task definition revisions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-ecs-task-definition-revisions-in-terraform/view) and [Fargate Spot tasks](https://oneuptime.com/blog/post/2026-02-23-how-to-create-fargate-spot-tasks-in-terraform/view).
