# How to Set Up AWS DMS Replication Tasks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DMS, Database Migration, Data Replication, Infrastructure as Code

Description: Learn how to create AWS Database Migration Service replication instances, endpoints, and tasks for full-load and CDC migrations using OpenTofu.

## Introduction

AWS DMS migrates data between database engines or helps replicate data continuously using Change Data Capture (CDC). OpenTofu manages replication instances, source and target endpoints, and migration tasks as code.
Before applying this configuration, make sure the required AWS DMS service roles already exist in your AWS account, including `dms-vpc-role` and `dms-cloudwatch-logs-role`.

## Replication Subnet Group

```hcl
resource "aws_dms_replication_subnet_group" "main" {
  replication_subnet_group_id          = "${var.app_name}-dms-subnets"
  replication_subnet_group_description = "DMS subnet group for ${var.app_name}"
  subnet_ids                           = var.private_subnet_ids

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Replication Instance

```hcl
resource "aws_dms_replication_instance" "main" {
  replication_instance_id     = "${var.app_name}-dms-instance"
  replication_instance_class  = "dms.t3.medium"
  allocated_storage           = 50  # GB

  replication_subnet_group_id = aws_dms_replication_subnet_group.main.id
  vpc_security_group_ids      = [aws_security_group.dms.id]

  multi_az             = false  # set true for production
  publicly_accessible  = false
  auto_minor_version_upgrade = true

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Source Endpoint (PostgreSQL)

```hcl
resource "aws_dms_endpoint" "source" {
  endpoint_id   = "${var.app_name}-source"
  endpoint_type = "source"
  engine_name   = "postgres"

  server_name = var.source_db_host
  port        = 5432
  database_name = var.source_db_name
  username    = var.source_db_user
  password    = var.source_db_password

  ssl_mode = "require"

  # Enable CDC (logical replication must be configured on source)
  postgres_settings {
    capture_ddls                    = true
    execute_timeout                 = 60
    fail_tasks_on_lob_truncation    = false
    heartbeat_enable                = true
    heartbeat_frequency             = 5
    heartbeat_schema                = "dms_heartbeat"
    map_boolean_as_boolean          = false
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Target Endpoint (Aurora)

```hcl
resource "aws_dms_endpoint" "target" {
  endpoint_id   = "${var.app_name}-target"
  endpoint_type = "target"
  engine_name   = "aurora-postgresql"

  server_name   = var.target_db_host
  port          = 5432
  database_name = var.target_db_name
  username      = var.target_db_user
  password      = var.target_db_password

  ssl_mode = "require"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Replication Task

```hcl
resource "aws_dms_replication_task" "full_load_and_cdc" {
  replication_task_id      = "${var.app_name}-migration-task"
  replication_instance_arn = aws_dms_replication_instance.main.replication_instance_arn
  source_endpoint_arn      = aws_dms_endpoint.source.endpoint_arn
  target_endpoint_arn      = aws_dms_endpoint.target.endpoint_arn
  migration_type           = "full-load-and-cdc"  # or "full-load" or "cdc"
  table_mappings           = file("${path.module}/table-mappings.json")

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Table Mappings File

```json
{
  "rules": [
    {
      "rule-type": "selection",
      "rule-id": "1",
      "rule-name": "include-all-tables",
      "object-locator": {
        "schema-name": "public",
        "table-name": "%"
      },
      "rule-action": "include"
    }
  ]
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS DMS provides managed database migration with full-load and CDC replication. OpenTofu manages replication instances, source and target endpoints, and replication tasks - creating a reproducible migration pipeline for database moves and ongoing replication.
