# How to Create CloudWatch Alarms for RDS in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, RDS, Monitoring, Database, Infrastructure as Code

Description: Learn how to create CloudWatch alarms for RDS databases using Terraform to monitor CPU, storage, connections, and replication health.

---

Amazon RDS databases are critical components of most application architectures. When a database has issues, the impact cascades through your entire stack. CloudWatch alarms for RDS help you detect problems like high CPU usage, storage exhaustion, connection spikes, and replication lag before they cause outages. This guide shows you how to set up comprehensive RDS monitoring with Terraform.

## Setting Up the Foundation

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Create an SNS topic for RDS alarm notifications
resource "aws_sns_topic" "rds_alarms" {
  name = "rds-alarm-notifications"
}

variable "db_instance_identifier" {
  type        = string
  description = "RDS instance identifier to monitor"
}
```

## CPU Utilization Alarms

```hcl
# High CPU alarm - indicates query performance issues
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "rds-high-cpu-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization has exceeded 80% for 15 minutes"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]
  ok_actions          = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

# Critical CPU alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu_critical" {
  alarm_name          = "rds-critical-cpu-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 95
  alarm_description   = "RDS CPU utilization has exceeded 95% - critical"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}
```

## Storage Space Alarms

```hcl
# Free storage space alarm - warn before running out
resource "aws_cloudwatch_metric_alarm" "rds_free_storage" {
  alarm_name          = "rds-low-storage-${var.db_instance_identifier}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  # Alert when less than 10 GB free
  threshold           = 10737418240
  alarm_description   = "RDS free storage space is below 10 GB"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]
  ok_actions          = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

# Critical storage alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage_critical" {
  alarm_name          = "rds-critical-storage-${var.db_instance_identifier}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  # Alert when less than 2 GB free
  threshold           = 2147483648
  alarm_description   = "RDS free storage space is below 2 GB - critical"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}
```

## Database Connection Alarms

```hcl
# High connection count alarm
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "rds-high-connections-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.max_connections_threshold
  alarm_description   = "RDS database connections have exceeded the warning threshold"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]
  ok_actions          = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

variable "max_connections_threshold" {
  type        = number
  description = "Maximum number of connections before alerting"
  default     = 100
}
```

## Memory and Swap Alarms

```hcl
# Freeable memory alarm
resource "aws_cloudwatch_metric_alarm" "rds_memory" {
  alarm_name          = "rds-low-memory-${var.db_instance_identifier}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  # Alert when less than 256 MB free
  threshold           = 268435456
  alarm_description   = "RDS freeable memory is below 256 MB"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

# Swap usage alarm - indicates memory pressure
resource "aws_cloudwatch_metric_alarm" "rds_swap" {
  alarm_name          = "rds-high-swap-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SwapUsage"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  # Alert when swap exceeds 256 MB
  threshold           = 268435456
  alarm_description   = "RDS swap usage exceeds 256 MB - memory pressure detected"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}
```

## Replication Lag Alarm

```hcl
# Replication lag alarm for read replicas
resource "aws_cloudwatch_metric_alarm" "rds_replica_lag" {
  alarm_name          = "rds-replica-lag-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  # Alert when lag exceeds 30 seconds
  threshold           = 30
  alarm_description   = "RDS read replica lag exceeds 30 seconds"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]
  ok_actions          = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}
```

## I/O Performance Alarms

```hcl
# Read latency alarm
resource "aws_cloudwatch_metric_alarm" "rds_read_latency" {
  alarm_name          = "rds-read-latency-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  # Alert when read latency exceeds 20ms
  threshold           = 0.02
  alarm_description   = "RDS read latency exceeds 20ms"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

# Write latency alarm
resource "aws_cloudwatch_metric_alarm" "rds_write_latency" {
  alarm_name          = "rds-write-latency-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  # Alert when write latency exceeds 20ms
  threshold           = 0.02
  alarm_description   = "RDS write latency exceeds 20ms"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

# IOPS alarm
resource "aws_cloudwatch_metric_alarm" "rds_read_iops" {
  alarm_name          = "rds-high-read-iops-${var.db_instance_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReadIOPS"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.max_iops_threshold
  alarm_description   = "RDS read IOPS approaching provisioned limit"
  alarm_actions       = [aws_sns_topic.rds_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

variable "max_iops_threshold" {
  type    = number
  default = 3000
}
```

## Reusable RDS Monitoring Module

```hcl
# modules/rds-alarms/main.tf
variable "db_identifier" { type = string }
variable "sns_topic_arn" { type = string }
variable "cpu_threshold" { type = number; default = 80 }
variable "storage_threshold_gb" { type = number; default = 10 }
variable "connection_threshold" { type = number; default = 100 }

resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "rds-cpu-${var.db_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "RDS CPU above ${var.cpu_threshold}%"
  alarm_actions       = [var.sns_topic_arn]
  ok_actions          = [var.sns_topic_arn]
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
}

resource "aws_cloudwatch_metric_alarm" "storage" {
  alarm_name          = "rds-storage-${var.db_identifier}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.storage_threshold_gb * 1073741824
  alarm_description   = "RDS storage below ${var.storage_threshold_gb} GB"
  alarm_actions       = [var.sns_topic_arn]
  ok_actions          = [var.sns_topic_arn]
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
}

resource "aws_cloudwatch_metric_alarm" "connections" {
  alarm_name          = "rds-connections-${var.db_identifier}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.connection_threshold
  alarm_description   = "RDS connections above ${var.connection_threshold}"
  alarm_actions       = [var.sns_topic_arn]
  ok_actions          = [var.sns_topic_arn]
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
}
```

## Best Practices

Set storage alarms well before you run out of space since RDS instances become read-only when storage is exhausted. Monitor both read and write latency to catch I/O bottlenecks early. Adjust connection thresholds based on your instance class since smaller instances have lower maximum connections. Use multiple evaluation periods for CPU alarms to avoid alerting on brief query spikes. For read replicas, always monitor replication lag to ensure data consistency.

For complementary monitoring, see our guides on [CloudWatch alarms for Lambda](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-lambda-in-terraform/view) and [CloudWatch metric filters](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-metric-filters-in-terraform/view).

## Conclusion

Comprehensive RDS monitoring through CloudWatch alarms and Terraform gives you the visibility needed to keep your databases healthy. By monitoring CPU, storage, connections, memory, I/O, and replication, you cover the most common failure modes. The reusable module pattern makes it easy to apply consistent monitoring across all your RDS instances.
