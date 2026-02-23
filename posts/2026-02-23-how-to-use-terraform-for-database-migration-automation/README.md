# How to Use Terraform for Database Migration Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Database Migration, DMS, RDS, Infrastructure as Code

Description: Learn how to automate database migrations using Terraform, including AWS DMS configuration, schema migration management, blue-green database deployments, and zero-downtime migration strategies.

---

Database migrations are among the most critical and risky infrastructure operations. Moving data between database engines, upgrading versions, or migrating to the cloud requires careful planning and execution. Terraform automates the infrastructure side of database migrations by managing migration services, replication instances, and database configurations as code.

In this guide, we will cover how to use Terraform to automate database migration workflows.

## AWS Database Migration Service Setup

```hcl
# database-migration/dms.tf
# AWS DMS infrastructure for database migration

resource "aws_dms_replication_subnet_group" "migration" {
  replication_subnet_group_id          = "migration-subnet-group"
  replication_subnet_group_description = "Subnet group for DMS replication"
  subnet_ids                           = var.private_subnet_ids
}

resource "aws_dms_replication_instance" "migration" {
  replication_instance_id    = "db-migration-${var.environment}"
  replication_instance_class = "dms.r5.xlarge"
  allocated_storage          = 200
  multi_az                   = var.environment == "production"

  vpc_security_group_ids      = [aws_security_group.dms.id]
  replication_subnet_group_id = aws_dms_replication_subnet_group.migration.id

  # Enable CloudWatch logging
  apply_immediately = true

  tags = {
    Environment = var.environment
    Purpose     = "database-migration"
  }
}

# Source endpoint
resource "aws_dms_endpoint" "source" {
  endpoint_id   = "source-${var.source_engine}"
  endpoint_type = "source"
  engine_name   = var.source_engine
  server_name   = var.source_host
  port          = var.source_port
  database_name = var.source_database
  username      = var.source_username
  password      = var.source_password
  ssl_mode      = "require"
}

# Target endpoint
resource "aws_dms_endpoint" "target" {
  endpoint_id   = "target-${var.target_engine}"
  endpoint_type = "target"
  engine_name   = var.target_engine
  server_name   = aws_db_instance.target.address
  port          = aws_db_instance.target.port
  database_name = var.target_database
  username      = var.target_username
  password      = var.target_password
  ssl_mode      = "require"
}

# Migration task
resource "aws_dms_replication_task" "migration" {
  replication_task_id      = "migration-${var.environment}"
  migration_type           = "full-load-and-cdc"
  replication_instance_arn = aws_dms_replication_instance.migration.replication_instance_arn
  source_endpoint_arn      = aws_dms_endpoint.source.endpoint_arn
  target_endpoint_arn      = aws_dms_endpoint.target.endpoint_arn

  table_mappings = jsonencode({
    rules = [
      {
        rule-type   = "selection"
        rule-id     = "1"
        rule-name   = "all-tables"
        rule-action = "include"
        object-locator = {
          schema-name = var.source_schema
          table-name  = "%"
        }
      }
    ]
  })

  replication_task_settings = jsonencode({
    TargetMetadata = {
      TargetSchema = var.target_schema
    }
    Logging = {
      EnableLogging = true
      LogComponents = [
        { Id = "SOURCE_UNLOAD", Severity = "LOGGER_SEVERITY_DEFAULT" },
        { Id = "TARGET_LOAD", Severity = "LOGGER_SEVERITY_DEFAULT" }
      ]
    }
  })
}
```

## RDS Blue-Green Deployment

```hcl
# database-migration/blue-green.tf
# Blue-green deployment for RDS version upgrades

resource "aws_db_instance" "primary" {
  identifier     = "app-${var.environment}"
  engine         = "postgres"
  engine_version = var.db_version
  instance_class = var.db_instance_class

  allocated_storage     = var.storage_size
  storage_encrypted     = true
  multi_az              = true
  deletion_protection   = true

  # Blue-green deployment for major upgrades
  blue_green_update {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Read replica for migration validation
resource "aws_db_instance" "read_replica" {
  count = var.enable_migration_validation ? 1 : 0

  identifier          = "app-${var.environment}-validation"
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = var.db_instance_class

  # Use the new engine version for validation
  engine_version = var.target_db_version
}
```

## Migration Monitoring

```hcl
# database-migration/monitoring.tf
# Monitoring for database migration progress

resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "dms-replication-lag-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CDCLatencyTarget"
  namespace           = "AWS/DMS"
  period              = 300
  statistic           = "Average"
  threshold           = 60
  alarm_description   = "DMS replication lag exceeds 60 seconds"

  alarm_actions = [aws_sns_topic.migration_alerts.arn]

  dimensions = {
    ReplicationInstanceIdentifier = aws_dms_replication_instance.migration.replication_instance_id
    ReplicationTaskIdentifier     = aws_dms_replication_task.migration.replication_task_id
  }
}

resource "aws_cloudwatch_dashboard" "migration" {
  dashboard_name = "database-migration-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/DMS", "CDCLatencyTarget",
             "ReplicationInstanceIdentifier",
             aws_dms_replication_instance.migration.replication_instance_id]
          ]
          title  = "Replication Lag"
          period = 60
        }
      }
    ]
  })
}
```

## Data Validation Infrastructure

Set up automated validation to verify migration integrity:

```hcl
# database-migration/validation.tf
# Automated data validation after migration

resource "aws_lambda_function" "data_validator" {
  function_name = "migration-data-validator-${var.environment}"
  runtime       = "python3.11"
  handler       = "validator.handler"
  role          = aws_iam_role.validator.arn
  timeout       = 300
  memory_size   = 512

  filename = "validator.zip"

  environment {
    variables = {
      SOURCE_HOST     = var.source_host
      TARGET_HOST     = aws_db_instance.target.address
      VALIDATION_MODE = "row_count_and_checksum"
    }
  }
}

# Schedule validation runs during migration
resource "aws_cloudwatch_event_rule" "validation_schedule" {
  name                = "migration-validation-${var.environment}"
  description         = "Run data validation every 30 minutes during migration"
  schedule_expression = "rate(30 minutes)"
  is_enabled          = var.migration_active
}

resource "aws_cloudwatch_event_target" "validation" {
  rule      = aws_cloudwatch_event_rule.validation_schedule.name
  target_id = "data-validation"
  arn       = aws_lambda_function.data_validator.arn
}
```

## Cutover Automation

Automate the cutover process for reliability:

```hcl
# database-migration/cutover.tf
# Automated cutover infrastructure

resource "aws_ssm_document" "cutover" {
  name          = "database-migration-cutover"
  document_type = "Automation"
  document_format = "YAML"

  content = yamlencode({
    schemaVersion = "0.3"
    description   = "Automated database migration cutover"
    mainSteps = [
      {
        name   = "StopReplication"
        action = "aws:executeAwsApi"
        inputs = {
          Service = "dms"
          Api     = "StopReplicationTask"
          ReplicationTaskArn = aws_dms_replication_task.migration.replication_task_arn
        }
      },
      {
        name   = "ValidateData"
        action = "aws:invokeLambdaFunction"
        inputs = {
          FunctionName = aws_lambda_function.data_validator.function_name
        }
      },
      {
        name   = "UpdateDNS"
        action = "aws:executeAwsApi"
        inputs = {
          Service = "route53"
          Api     = "ChangeResourceRecordSets"
        }
      }
    ]
  })
}
```

## Best Practices

Always run a full migration test in staging before production. Database migrations are too critical to test only in production. Use the same DMS task configuration in staging to validate behavior.

Use change data capture (CDC) for zero-downtime migrations. Full-load-and-CDC keeps the target in sync with the source during cutover, ensuring no data is lost during the transition.

Monitor replication lag continuously. The cutover should only happen when replication lag is near zero. Set up alarms that alert when lag exceeds acceptable thresholds.

Keep the rollback path open. Maintain the source database and the ability to switch back until the migration is confirmed successful. This typically means keeping the source database running for at least a week after cutover.

Validate data integrity after migration. Compare row counts, checksums, and sample queries between source and target databases. Automated validation gives you confidence that the migration was complete and accurate.

Plan for schema differences between engines. When migrating between different database engines (such as Oracle to PostgreSQL), schema translation requires careful attention to data types, constraints, and stored procedures.

## Conclusion

Database migration automation with Terraform provides a structured, repeatable approach to one of the most challenging infrastructure operations. By managing DMS instances, replication tasks, validation infrastructure, and target databases as code, you create a migration process that can be tested, reviewed, and executed with confidence. The key is thorough testing, continuous monitoring, automated validation, and maintaining rollback capability throughout the migration.
