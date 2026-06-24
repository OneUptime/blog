# How to Deploy n8n Workflow Automation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, n8n, Workflow Automation, No-Code, Self-Hosted

Description: Learn how to deploy n8n workflow automation platform on AWS using OpenTofu with RDS PostgreSQL, ECS Fargate, and persistent configuration for production-ready automation workflows.

## Introduction

n8n is a workflow automation tool similar to Zapier but self-hosted. This guide deploys n8n on AWS ECS Fargate with RDS PostgreSQL for workflow storage, EFS for persistent `/home/node/.n8n` data, and ALB for HTTPS access. The S3 binary data configuration shown here uses n8n external storage, which requires a Self-hosted Enterprise plan.

## RDS PostgreSQL for n8n

```hcl
resource "aws_db_instance" "n8n" {
  identifier          = "n8n-${var.environment}"
  engine              = "postgres"
  engine_version      = "15"
  instance_class      = "db.t3.small"
  allocated_storage   = 20
  max_allocated_storage = 100
  storage_encrypted   = true

  db_name  = "n8n"
  username = "n8n"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  deletion_protection     = true
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "/n8n/${var.environment}/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "n8n" {
  family                   = "n8n-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.n8n_task.arn

  volume {
    name = "n8n-data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.n8n.id
      transit_encryption = "ENABLED"
      root_directory     = "/"
    }
  }

  container_definitions = jsonencode([{
    name  = "n8n"
    image = "docker.n8n.io/n8nio/n8n:latest"

    environment = [
      { name = "DB_TYPE",                   value = "postgresdb" },
      { name = "DB_POSTGRESDB_HOST",        value = aws_db_instance.n8n.address },
      { name = "DB_POSTGRESDB_PORT",        value = "5432" },
      { name = "DB_POSTGRESDB_DATABASE",    value = "n8n" },
      { name = "DB_POSTGRESDB_USER",        value = "n8n" },
      { name = "N8N_HOST",                  value = var.n8n_hostname },
      { name = "N8N_PORT",                  value = "5678" },
      { name = "N8N_PROTOCOL",              value = "https" },
      { name = "WEBHOOK_URL",               value = "https://${var.n8n_hostname}/" },
      { name = "N8N_PROXY_HOPS",            value = "1" },
      { name = "NODE_ENV",                  value = "production" },
      { name = "EXECUTIONS_MODE",           value = "regular" },
      { name = "N8N_LOG_LEVEL",             value = "info" },
      # S3 for binary data storage
      { name = "N8N_AVAILABLE_BINARY_DATA_MODES",        value = "filesystem,s3" },
      { name = "N8N_DEFAULT_BINARY_DATA_MODE",           value = "s3" },
      { name = "N8N_EXTERNAL_STORAGE_S3_HOST",           value = "s3.${var.aws_region}.amazonaws.com" },
      { name = "N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME",    value = aws_s3_bucket.n8n_data.id },
      { name = "N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION",  value = var.aws_region },
      { name = "N8N_EXTERNAL_STORAGE_S3_AUTH_AUTO_DETECT", value = "true" },
    ]

    secrets = [
      { name = "DB_POSTGRESDB_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
      { name = "N8N_ENCRYPTION_KEY",     valueFrom = aws_secretsmanager_secret.encryption_key.arn },
      { name = "N8N_USER_MANAGEMENT_JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
    ]

    portMappings = [{ containerPort = 5678, protocol = "tcp" }]

    mountPoints = [{
      sourceVolume  = "n8n-data"
      containerPath = "/home/node/.n8n"
      readOnly      = false
    }]

    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"require('http').get('http://127.0.0.1:5678/healthz/readiness', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\""]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/n8n-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "n8n"
      }
    }
  }])
}
```

## S3 Bucket for Binary Data

n8n's S3 external storage for binary data is available on Self-hosted Enterprise plans.

```hcl
resource "aws_s3_bucket" "n8n_data" {
  bucket = "n8n-data-${data.aws_caller_identity.current.account_id}-${var.environment}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "n8n_data" {
  bucket = aws_s3_bucket.n8n_data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "n8n_data" {
  bucket = aws_s3_bucket.n8n_data.id

  rule {
    id     = "expire-old-binary-data"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }
  }
}

resource "aws_iam_role_policy" "n8n_s3" {
  name = "n8n-s3-access"
  role = aws_iam_role.n8n_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:*"]
      Resource = [aws_s3_bucket.n8n_data.arn, "${aws_s3_bucket.n8n_data.arn}/*"]
    }]
  })
}
```

## Encryption and JWT Secrets

```hcl
resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "encryption_key" {
  name = "/n8n/${var.environment}/encryption-key"
}

resource "aws_secretsmanager_secret_version" "encryption_key" {
  secret_id     = aws_secretsmanager_secret.encryption_key.id
  secret_string = random_password.encryption_key.result
}

resource "random_password" "jwt_secret" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "/n8n/${var.environment}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}
```

## Conclusion

Deploying n8n with OpenTofu on AWS provides a scalable workflow automation platform with proper data persistence. The `N8N_ENCRYPTION_KEY` protects credentials stored in workflows and must remain stable after workflows are created. Using S3 for binary data storage avoids relying on the filesystem for large amounts of binary data, but this external storage mode requires an n8n Enterprise license. Consider enabling n8n's queue mode with Redis for high-volume workflow execution environments.
