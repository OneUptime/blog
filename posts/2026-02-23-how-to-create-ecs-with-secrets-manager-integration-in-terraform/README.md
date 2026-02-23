# How to Create ECS with Secrets Manager Integration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Secrets Manager, Security, Containers, Infrastructure as Code

Description: Learn how to securely inject secrets from AWS Secrets Manager into ECS tasks using Terraform, avoiding hardcoded credentials in your container definitions.

---

Hardcoding secrets like database passwords, API keys, and tokens in container configurations is a serious security risk. AWS Secrets Manager provides a centralized, encrypted store for sensitive data, and ECS can pull secrets directly from Secrets Manager at runtime. This means your task definitions never contain actual secret values. In this guide, you will learn how to integrate ECS with Secrets Manager using Terraform.

## How Secrets Manager Integration Works with ECS

When you reference a Secrets Manager secret in an ECS task definition, ECS fetches the secret value when starting the task. The secret is injected as an environment variable into the container. The task definition only contains the ARN of the secret, not the actual value. This has several benefits:

- Secrets are encrypted at rest and in transit
- You can rotate secrets without updating task definitions
- Access is controlled through IAM policies
- Secrets are not visible in the ECS console or task definition JSON

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with private subnets
- Basic understanding of ECS and IAM

## Creating Secrets in Secrets Manager

```hcl
provider "aws" {
  region = "us-east-1"
}

# KMS key for encrypting secrets
resource "aws_kms_key" "secrets" {
  description             = "KMS key for ECS secrets"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "ecs-secrets-key"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/ecs-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# Database credentials secret
resource "aws_secretsmanager_secret" "database" {
  name        = "production/database/credentials"
  description = "Database credentials for the production application"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Environment = "production"
    Service     = "database"
  }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id

  secret_string = jsonencode({
    username = "dbadmin"
    password = var.db_password
    host     = "production-db.cluster-xxxxx.us-east-1.rds.amazonaws.com"
    port     = 5432
    dbname   = "production"
  })
}

# API key secret
resource "aws_secretsmanager_secret" "api_key" {
  name        = "production/api/key"
  description = "Third-party API key"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Environment = "production"
    Service     = "api"
  }
}

resource "aws_secretsmanager_secret_version" "api_key" {
  secret_id     = aws_secretsmanager_secret.api_key.id
  secret_string = var.api_key
}

# Redis credentials secret
resource "aws_secretsmanager_secret" "redis" {
  name        = "production/redis/credentials"
  description = "Redis authentication token"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Environment = "production"
    Service     = "redis"
  }
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id

  secret_string = jsonencode({
    auth_token = var.redis_auth_token
    host       = "production-redis.xxxxx.ng.0001.use1.cache.amazonaws.com"
    port       = 6379
  })
}

# Variables for secret values
variable "db_password" {
  type      = string
  sensitive = true
}

variable "api_key" {
  type      = string
  sensitive = true
}

variable "redis_auth_token" {
  type      = string
  sensitive = true
}
```

## IAM Roles with Secrets Manager Permissions

The task execution role needs permission to read secrets and decrypt them with KMS.

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

# Attach the standard ECS task execution policy
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Custom policy for Secrets Manager access
resource "aws_iam_role_policy" "secrets_access" {
  name = "ecs-secrets-access"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.database.arn,
          aws_secretsmanager_secret.api_key.arn,
          aws_secretsmanager_secret.redis.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.secrets.arn
        ]
      }
    ]
  })
}
```

## Task Definition with Secrets

Reference secrets in the container definition using the `secrets` block instead of `environment`.

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/production-app"
  retention_in_days = 30
}

# Task definition with secrets injection
resource "aws_ecs_task_definition" "app" {
  family                   = "production-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

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

      # Non-sensitive environment variables go here
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "LOG_LEVEL"
          value = "info"
        }
      ]

      # Secrets from Secrets Manager - injected at task start
      secrets = [
        {
          # Inject the entire JSON secret as a single env var
          name      = "DATABASE_CREDENTIALS"
          valueFrom = aws_secretsmanager_secret.database.arn
        },
        {
          # Inject a specific JSON key from the secret
          # This pulls only the "password" field from the database secret
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.database.arn}:password::"
        },
        {
          # Inject specific fields for database connection
          name      = "DB_USERNAME"
          valueFrom = "${aws_secretsmanager_secret.database.arn}:username::"
        },
        {
          name      = "DB_HOST"
          valueFrom = "${aws_secretsmanager_secret.database.arn}:host::"
        },
        {
          # API key as a plain string secret
          name      = "API_KEY"
          valueFrom = aws_secretsmanager_secret.api_key.arn
        },
        {
          # Redis auth token from JSON secret
          name      = "REDIS_AUTH_TOKEN"
          valueFrom = "${aws_secretsmanager_secret.redis.arn}:auth_token::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])

  tags = {
    Name = "production-app"
  }
}
```

## ECS Service

```hcl
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

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
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

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "production-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  tags = {
    Name = "production-app-service"
  }
}
```

## Secret Rotation

Configure automatic rotation for database credentials.

```hcl
# Lambda function for secret rotation
resource "aws_lambda_function" "rotate_db_secret" {
  filename      = "rotate_secret.zip"
  function_name = "rotate-database-secret"
  role          = aws_iam_role.rotation_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 60

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.us-east-1.amazonaws.com"
    }
  }
}

# Enable rotation on the database secret
resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.rotate_db_secret.arn

  rotation_rules {
    automatically_after_days = 30  # Rotate every 30 days
  }
}

# IAM role for rotation Lambda
resource "aws_iam_role" "rotation_lambda" {
  name = "secret-rotation-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}
```

## Using SSM Parameter Store as an Alternative

For non-sensitive configuration, you can use SSM Parameter Store, which integrates the same way.

```hcl
# SSM parameters for non-sensitive config
resource "aws_ssm_parameter" "app_config" {
  name  = "/production/app/config"
  type  = "String"
  value = "some-config-value"
}

# Secure SSM parameter for sensitive config
resource "aws_ssm_parameter" "app_secret" {
  name   = "/production/app/secret-config"
  type   = "SecureString"
  value  = var.secret_config
  key_id = aws_kms_key.secrets.arn
}

# Reference SSM parameters in task definition secrets block
# Note: SSM uses the parameter ARN with the "ssm:" prefix not needed
# The valueFrom format is: arn:aws:ssm:region:account:parameter/name
```

## Outputs

```hcl
output "secret_arns" {
  description = "ARNs of created secrets"
  value = {
    database = aws_secretsmanager_secret.database.arn
    api_key  = aws_secretsmanager_secret.api_key.arn
    redis    = aws_secretsmanager_secret.redis.arn
  }
}

output "service_name" {
  value = aws_ecs_service.app.name
}
```

## Best Practices

When integrating ECS with Secrets Manager, follow the principle of least privilege in your IAM policies by granting access only to the specific secrets each service needs. Use custom KMS keys for encryption so you can control access and audit usage. Reference specific JSON keys in your valueFrom syntax to inject individual fields rather than entire JSON blobs. Enable secret rotation for database credentials and API keys. Never log secret values in your application code. Tag your secrets consistently for cost tracking and access management.

## Monitoring with OneUptime

Secret access failures can cause application startup issues that are hard to diagnose. Use [OneUptime](https://oneuptime.com) to monitor your ECS task health and get alerted when tasks fail to start, which may indicate secrets access problems.

## Conclusion

Integrating ECS with AWS Secrets Manager through Terraform provides a secure, automated way to manage sensitive configuration for your containerized applications. By keeping secrets out of your task definitions and injecting them at runtime, you reduce the risk of credential exposure and make secret rotation seamless. Terraform makes the entire setup reproducible and auditable, from secret creation to IAM policies to task definitions.

For more ECS security and configuration topics, see our guides on [ECS with EFS volumes](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-efs-volumes-in-terraform/view) and [ECS with CloudWatch Container Insights](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-cloudwatch-container-insights-in-terraform/view).
