# How to Deploy Nextcloud with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Nextcloud, File Storage, Collaboration, Self-Hosted

Description: Learn how to deploy Nextcloud on AWS using OpenTofu with RDS, ElastiCache Redis, EFS storage, and ECS Fargate for a production-ready self-hosted cloud storage platform.

## Introduction

Nextcloud is a self-hosted cloud platform for file storage, collaboration, and productivity tools. This guide deploys Nextcloud on AWS ECS Fargate with RDS PostgreSQL, ElastiCache Redis for caching, EFS for persistent Nextcloud application storage, and S3 as a primary object storage backend.

## S3 as Primary Storage

```hcl
resource "aws_s3_bucket" "nextcloud" {
  bucket = "nextcloud-storage-${data.aws_caller_identity.current.account_id}-${var.environment}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "nextcloud" {
  bucket = aws_s3_bucket.nextcloud.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "nextcloud" {
  bucket = aws_s3_bucket.nextcloud.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
```

## RDS PostgreSQL

```hcl
resource "aws_db_instance" "nextcloud" {
  identifier          = "nextcloud-${var.environment}"
  engine              = "postgres"
  engine_version      = "15"
  instance_class      = "db.t3.medium"
  allocated_storage   = 50
  max_allocated_storage = 500
  storage_encrypted   = true

  db_name  = "nextcloud"
  username = "nextcloud"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 14
  deletion_protection     = true
}
```

## ElastiCache Redis for Caching

```hcl
resource "aws_elasticache_replication_group" "nextcloud" {
  replication_group_id       = "nextcloud-${var.environment}"
  description                = "Redis cache for Nextcloud"
  node_type                  = "cache.t3.small"
  num_cache_clusters         = 2
  engine_version             = "7.0"
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_token.result

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "nextcloud" {
  family                   = "nextcloud-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.nextcloud_task.arn

  container_definitions = jsonencode([{
    name  = "nextcloud"
    image = "nextcloud:33-apache"

    environment = [
      { name = "POSTGRES_HOST",     value = aws_db_instance.nextcloud.address },
      { name = "POSTGRES_DB",       value = "nextcloud" },
      { name = "POSTGRES_USER",     value = "nextcloud" },
      { name = "REDIS_HOST",        value = aws_elasticache_replication_group.nextcloud.primary_endpoint_address },
      { name = "REDIS_HOST_PORT",   value = "6379" },
      { name = "NEXTCLOUD_TRUSTED_DOMAINS", value = var.nextcloud_hostname },
      { name = "OBJECTSTORE_S3_BUCKET",     value = aws_s3_bucket.nextcloud.id },
      { name = "OBJECTSTORE_S3_REGION",     value = var.aws_region },
      { name = "OBJECTSTORE_S3_USEPATH_STYLE", value = "false" },
    ]

    secrets = [
      { name = "POSTGRES_PASSWORD",    valueFrom = aws_secretsmanager_secret.db_password.arn },
      { name = "REDIS_HOST_PASSWORD",  valueFrom = aws_secretsmanager_secret.redis_token.arn },
      { name = "NEXTCLOUD_ADMIN_USER", valueFrom = aws_secretsmanager_secret.admin_user.arn },
      { name = "NEXTCLOUD_ADMIN_PASSWORD", valueFrom = aws_secretsmanager_secret.admin_password.arn },
    ]

    portMappings = [{ containerPort = 80, protocol = "tcp" }]  # Apache HTTP port

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/nextcloud"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "nextcloud"
      }
    }
  }])
}
```

## IAM Role for S3 Access

```hcl
resource "aws_iam_role_policy" "nextcloud_s3" {
  name = "nextcloud-s3-access"
  role = aws_iam_role.nextcloud_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.nextcloud.arn,
        "${aws_s3_bucket.nextcloud.arn}/*"
      ]
    }]
  })
}
```

## Conclusion

Deploying Nextcloud with OpenTofu on AWS creates a scalable, resilient file storage platform. Using S3 as the primary object storage backend (via `objectstore` configuration) enables virtually unlimited storage capacity with built-in redundancy. Redis caching dramatically improves performance for concurrent users. The IAM task role approach avoids storing long-lived AWS access keys in Nextcloud's configuration.
