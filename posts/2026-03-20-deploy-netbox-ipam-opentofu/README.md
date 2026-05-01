# How to Deploy Netbox IPAM with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, NetBox, IPAM, Network Management, Self-Hosted

Description: Learn how to deploy NetBox IP Address Management on AWS using OpenTofu with RDS PostgreSQL, ElastiCache Redis, ECS Fargate, and ALB for network documentation and IPAM.

## Introduction

NetBox is the source of truth for network infrastructure - it manages IP address space, racks, devices, connections, and circuits. This guide deploys NetBox on AWS ECS Fargate with RDS PostgreSQL and ElastiCache Redis for caching and task queuing.

## RDS PostgreSQL for NetBox

```hcl
resource "aws_db_instance" "netbox" {
  identifier          = "netbox-${var.environment}"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.medium"
  allocated_storage   = 50
  max_allocated_storage = 500
  storage_encrypted   = true

  db_name  = "netbox"
  username = "netbox"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 14
  deletion_protection     = true
}
```

## ElastiCache Redis

```hcl
resource "aws_elasticache_replication_group" "netbox" {
  replication_group_id       = "netbox-${var.environment}"
  description                = "Redis for NetBox caching and task queue"
  node_type                  = "cache.t3.small"
  num_cache_clusters         = 1
  engine_version             = "7.0"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # Set REDIS_SSL and REDIS_CACHE_SSL if you enable Redis TLS

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "netbox" {
  family                   = "netbox-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.netbox_task.arn

  volume {
    name = "netbox-media"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.netbox.id
      transit_encryption = "ENABLED"
    }
  }

  container_definitions = jsonencode([
    {
      name  = "netbox"
      image = "netboxcommunity/netbox:v3.7.8"
      essential = true

      environment = [
        { name = "ALLOWED_HOSTS",    value = "${var.netbox_hostname} localhost 127.0.0.1" },
        { name = "DB_HOST",          value = aws_db_instance.netbox.address },
        { name = "DB_PORT",          value = "5432" },
        { name = "DB_NAME",          value = "netbox" },
        { name = "DB_USER",          value = "netbox" },
        { name = "REDIS_HOST",       value = aws_elasticache_replication_group.netbox.primary_endpoint_address },
        { name = "REDIS_PORT",       value = "6379" },
        { name = "REDIS_CACHE_HOST", value = aws_elasticache_replication_group.netbox.primary_endpoint_address },
        { name = "REDIS_CACHE_PORT", value = "6379" },
        { name = "CORS_ORIGIN_ALLOW_ALL", value = "True" },
        { name = "TIME_ZONE",        value = "UTC" },
      ]

      secrets = [
        { name = "DB_PASSWORD",   valueFrom = aws_secretsmanager_secret.db_password.arn },
        { name = "SECRET_KEY",    valueFrom = aws_secretsmanager_secret.secret_key.arn },
        { name = "SUPERUSER_API_TOKEN", valueFrom = aws_secretsmanager_secret.api_token.arn },
      ]

      portMappings = [{ containerPort = 8080, protocol = "tcp" }]

      mountPoints = [{
        sourceVolume  = "netbox-media"
        containerPath = "/opt/netbox/netbox/media"
        readOnly      = false
      }]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/api/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 120
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/netbox-${var.environment}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "netbox"
        }
      }
    },
    {
      # NetBox worker for background tasks
      name  = "netbox-worker"
      image = "netboxcommunity/netbox:v3.7.8"
      essential = true
      dependsOn = [{
        containerName = "netbox"
        condition     = "HEALTHY"
      }]
      command = ["/opt/netbox/venv/bin/python", "/opt/netbox/netbox/manage.py", "rqworker"]

      environment = [
        { name = "DB_HOST",    value = aws_db_instance.netbox.address },
        { name = "REDIS_HOST", value = aws_elasticache_replication_group.netbox.primary_endpoint_address },
      ]

      secrets = [
        { name = "DB_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
        { name = "SECRET_KEY",  valueFrom = aws_secretsmanager_secret.secret_key.arn },
      ]
    }
  ])
}
```

## Using the NetBox Provider for IP Management

```hcl
terraform {
  required_providers {
    netbox = {
      source  = "registry.terraform.io/e-breuninger/netbox"
      version = "~> 3.8.0"
    }
  }
}

provider "netbox" {
  server_url = "https://${var.netbox_hostname}"
  api_token  = var.netbox_api_token
}

resource "netbox_prefix" "prod_vpc" {
  prefix      = var.vpc_cidr
  status      = "active"
  description = "Production VPC - ${var.environment}"
  is_pool     = false
}
```

## Conclusion

Deploying NetBox with OpenTofu provides a network documentation and IPAM platform that integrates with your infrastructure. The NetBox provider lets you register IP prefixes, devices, and racks as you create them with OpenTofu - creating infrastructure and documenting it in NetBox in the same apply. The worker container handles background tasks like webhook dispatching and scheduled jobs.
