# How to Build a Hot Standby Database Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Database, Hot Standby, RDS, Aurora, High Availability, Infrastructure as Code

Description: Learn how to build hot standby database infrastructure using Terraform with Aurora Global Database, RDS Multi-AZ, read replicas, and automated failover mechanisms.

---

Database downtime is one of the most painful kinds of outages. When your database goes down, everything that depends on it goes down too. A hot standby database is a fully synchronized replica that can take over immediately when the primary fails, keeping your application running with minimal or zero data loss.

In this guide, we will build hot standby database infrastructure on AWS using Terraform. We will cover RDS Multi-AZ for single-region high availability, Aurora Global Database for cross-region hot standby, and the monitoring and automation that keeps everything working smoothly.

## Hot Standby Strategies

There are several approaches to database hot standby, each with different trade-offs:

- **RDS Multi-AZ**: Synchronous replication within a region, automatic failover in ~60 seconds
- **Aurora Replicas**: Up to 15 read replicas with automatic failover in ~30 seconds
- **Aurora Global Database**: Cross-region replication with typically less than 1 second lag
- **RDS Read Replicas with promotion**: Asynchronous replication, manual promotion

## Aurora Multi-AZ Cluster

Aurora with multiple replicas across availability zones provides the fastest in-region failover.

```hcl
# aurora-cluster.tf - Aurora cluster with hot standby replicas
resource "aws_rds_cluster" "main" {
  cluster_identifier = "${var.project_name}-aurora-cluster"

  engine         = "aurora-postgresql"
  engine_version = "15.4"

  database_name   = var.database_name
  master_username = var.master_username
  master_password = var.master_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # Storage encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.database.arn

  # Backup configuration
  backup_retention_period      = 35
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "Mon:04:00-Mon:05:00"

  # Enable deletion protection in production
  deletion_protection = var.environment == "production"

  # Enable enhanced monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Enable Performance Insights
  # (set on instances below)

  tags = {
    Environment = var.environment
    Purpose     = "HotStandby"
  }
}

# Primary writer instance
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${var.project_name}-writer"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.writer_instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  # Place in the first AZ
  availability_zone = var.availability_zones[0]

  # Performance Insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.database.arn
  performance_insights_retention_period = 731 # 2 years

  # Enhanced monitoring
  monitoring_interval = 15
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Promotion tier (lower = higher priority for failover)
  promotion_tier = 0

  tags = {
    Role = "writer"
  }
}

# Hot standby reader instances across different AZs
resource "aws_rds_cluster_instance" "reader" {
  count = var.reader_count

  identifier         = "${var.project_name}-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.reader_instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  # Spread readers across AZs for high availability
  availability_zone = var.availability_zones[(count.index + 1) % length(var.availability_zones)]

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.database.arn

  monitoring_interval = 15
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Promotion priority - lower numbers get promoted first
  promotion_tier = count.index + 1

  tags = {
    Role = "reader-standby"
  }
}
```

## Aurora Global Database for Cross-Region Hot Standby

For protection against entire region failures, set up a global database.

```hcl
# global-database.tf - Cross-region hot standby
resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "${var.project_name}-global"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = var.database_name
  storage_encrypted         = true
}

# Primary cluster (in primary region)
resource "aws_rds_cluster" "primary" {
  provider = aws.primary

  cluster_identifier        = "${var.project_name}-primary"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version

  master_username = var.master_username
  master_password = var.master_password

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_db.id]

  backup_retention_period = 35
}

resource "aws_rds_cluster_instance" "primary" {
  provider = aws.primary
  count    = 2

  identifier         = "${var.project_name}-primary-${count.index}"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.r6g.xlarge"
  engine             = aws_rds_global_cluster.main.engine
  engine_version     = aws_rds_global_cluster.main.engine_version

  performance_insights_enabled = true
  monitoring_interval          = 15
  monitoring_role_arn          = aws_iam_role.rds_monitoring_primary.arn
}

# Secondary cluster in DR region (hot standby)
resource "aws_rds_cluster" "secondary" {
  provider = aws.dr

  cluster_identifier        = "${var.project_name}-secondary"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version

  db_subnet_group_name   = aws_db_subnet_group.dr.name
  vpc_security_group_ids = [aws_security_group.dr_db.id]

  # Secondary clusters do not need master credentials
  # They replicate from the primary

  depends_on = [aws_rds_cluster_instance.primary]
}

resource "aws_rds_cluster_instance" "secondary" {
  provider = aws.dr
  count    = 1 # Scale up during failover

  identifier         = "${var.project_name}-secondary-${count.index}"
  cluster_identifier = aws_rds_cluster.secondary.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_global_cluster.main.engine
  engine_version     = aws_rds_global_cluster.main.engine_version

  performance_insights_enabled = true
  monitoring_interval          = 15
  monitoring_role_arn          = aws_iam_role.rds_monitoring_dr.arn
}
```

## Connection Management with RDS Proxy

RDS Proxy handles connection pooling and makes failover transparent to your application.

```hcl
# proxy.tf - RDS Proxy for connection management
resource "aws_db_proxy" "main" {
  name                   = "${var.project_name}-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.proxy.arn
  vpc_security_group_ids = [aws_security_group.proxy.id]
  vpc_subnet_ids         = var.private_subnet_ids

  auth {
    auth_scheme = "SECRETS"
    description = "Database credentials"
    iam_auth    = "REQUIRED"
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  tags = {
    Purpose = "ConnectionPooling"
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "main" {
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
  db_cluster_identifier  = aws_rds_cluster.main.id
}

# Read-only endpoint proxy
resource "aws_db_proxy_endpoint" "read_only" {
  db_proxy_name          = aws_db_proxy.main.name
  db_proxy_endpoint_name = "${var.project_name}-read-only"
  vpc_subnet_ids         = var.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.proxy.id]
  target_role            = "READ_ONLY"
}
```

## Monitoring and Alerting

Database monitoring is critical for hot standby setups. You need to know about replication lag, failover events, and performance issues.

```hcl
# monitoring.tf - Database health monitoring
# Replication lag alarm
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "${var.project_name}-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "AuroraGlobalDBReplicationLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1000 # 1 second in milliseconds
  alarm_description   = "Global database replication lag exceeds 1 second"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.secondary.cluster_identifier
  }

  alarm_actions = [var.alert_sns_topic_arn]
}

# CPU utilization alarm for writer
resource "aws_cloudwatch_metric_alarm" "writer_cpu" {
  alarm_name          = "${var.project_name}-writer-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database writer CPU above 80%"

  dimensions = {
    DBInstanceIdentifier = aws_rds_cluster_instance.writer.identifier
  }

  alarm_actions = [var.alert_sns_topic_arn]
}

# Free storage space alarm
resource "aws_cloudwatch_metric_alarm" "storage_space" {
  alarm_name          = "${var.project_name}-storage-space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeLocalStorage"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Minimum"
  threshold           = 5368709120 # 5 GB in bytes
  alarm_description   = "Database free storage below 5 GB"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier
  }

  alarm_actions = [var.alert_sns_topic_arn]
}

# Failover event notification
resource "aws_db_event_subscription" "failover" {
  name      = "${var.project_name}-failover-events"
  sns_topic = var.alert_sns_topic_arn

  source_type = "db-cluster"
  source_ids  = [aws_rds_cluster.main.id]

  event_categories = [
    "failover",
    "failure",
    "notification"
  ]
}
```

## Automated Failover Testing

Regularly test failover to make sure it works when you actually need it.

```hcl
# failover-test.tf - Scheduled failover testing
resource "aws_lambda_function" "failover_test" {
  filename      = "failover_test.zip"
  function_name = "${var.project_name}-failover-test"
  role          = aws_iam_role.failover_test.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 600

  environment {
    variables = {
      CLUSTER_ID = aws_rds_cluster.main.id
      SNS_TOPIC  = var.alert_sns_topic_arn
    }
  }
}

# Run failover test monthly (during maintenance window)
resource "aws_cloudwatch_event_rule" "monthly_failover_test" {
  name                = "${var.project_name}-monthly-failover-test"
  schedule_expression = "cron(0 3 1 * ? *)" # First day of each month at 3 AM

  description = "Monthly database failover test"
}

resource "aws_cloudwatch_event_target" "failover_test" {
  rule      = aws_cloudwatch_event_rule.monthly_failover_test.name
  target_id = "failover-test"
  arn       = aws_lambda_function.failover_test.arn
}
```

## Summary

A hot standby database infrastructure built with Terraform provides protection against both instance-level and region-level failures. Aurora replicas handle in-region failover in about 30 seconds. Aurora Global Database handles cross-region failover with typically under 1 second of replication lag. And RDS Proxy makes failover transparent to your application by managing connections.

The most critical monitoring points are replication lag (which tells you how much data you could lose during failover), failover events, and overall database health metrics. Set up alerts for all of these from the start.

For comprehensive monitoring of your database infrastructure including uptime, replication lag, and failover events, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can help you track database health and alert your team when issues arise.
