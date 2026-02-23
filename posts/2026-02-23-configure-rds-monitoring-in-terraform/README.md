# How to Configure RDS Monitoring in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Monitoring, CloudWatch, Performance Insights

Description: A comprehensive guide to setting up RDS monitoring with Terraform, including Enhanced Monitoring, Performance Insights, CloudWatch alarms, and custom dashboards.

---

Running a database without monitoring is like driving with your eyes closed. You might be fine for a while, but when something goes wrong, you will not see it coming. Amazon RDS provides several monitoring layers, from basic CloudWatch metrics to Enhanced Monitoring with OS-level stats and Performance Insights for query-level analysis. Setting all of these up in Terraform ensures monitoring is consistent and deployed automatically with your database.

This guide covers every monitoring option RDS offers and how to configure each one in Terraform.

## The Monitoring Layers

RDS monitoring comes in three tiers, each providing progressively more detail:

1. **CloudWatch Metrics** - enabled by default, basic database metrics at 1-minute or 5-minute intervals
2. **Enhanced Monitoring** - OS-level metrics (CPU, memory, disk, network) at up to 1-second granularity
3. **Performance Insights** - query-level performance analysis, wait events, top SQL statements

You probably want all three for production databases.

## CloudWatch Metrics (Default)

These are available without any additional configuration. RDS automatically publishes metrics like `CPUUtilization`, `FreeableMemory`, `ReadIOPS`, `WriteIOPS`, `DatabaseConnections`, and `FreeStorageSpace`.

The value comes from setting up alarms on these metrics:

```hcl
# SNS topic for database alerts
resource "aws_sns_topic" "db_alerts" {
  name = "rds-alerts"
}

# CPU utilization alarm
resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "${var.db_identifier}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is above 80% for 15 minutes"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
  ok_actions    = [aws_sns_topic.db_alerts.arn]
}

# Freeable memory alarm
resource "aws_cloudwatch_metric_alarm" "memory" {
  alarm_name          = "${var.db_identifier}-memory-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 536870912  # 512MB in bytes
  alarm_description   = "RDS freeable memory is below 512MB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# Free storage space alarm
resource "aws_cloudwatch_metric_alarm" "storage" {
  alarm_name          = "${var.db_identifier}-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10GB in bytes
  alarm_description   = "RDS free storage space is below 10GB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# Database connections alarm
resource "aws_cloudwatch_metric_alarm" "connections" {
  alarm_name          = "${var.db_identifier}-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 180  # Assuming max_connections is 200
  alarm_description   = "RDS database connections are above 180"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# Read and write latency alarms
resource "aws_cloudwatch_metric_alarm" "read_latency" {
  alarm_name          = "${var.db_identifier}-read-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0.02  # 20ms
  alarm_description   = "RDS read latency is above 20ms"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "write_latency" {
  alarm_name          = "${var.db_identifier}-write-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0.05  # 50ms
  alarm_description   = "RDS write latency is above 50ms"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}
```

## Enhanced Monitoring

Enhanced Monitoring provides OS-level metrics with granularity down to 1 second. It requires an IAM role that RDS assumes to push metrics to CloudWatch Logs:

```hcl
# IAM role for Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "rds-enhanced-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "rds-enhanced-monitoring"
  }
}

# Attach the AWS managed policy for Enhanced Monitoring
resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS instance with Enhanced Monitoring enabled
resource "aws_db_instance" "main" {
  identifier = "myapp-db"

  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.large"

  # ... other configuration ...

  # Enhanced Monitoring settings
  monitoring_interval = 60  # Seconds: 0, 1, 5, 10, 15, 30, 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  # 0 disables Enhanced Monitoring
  # 1 second gives the most detail but generates the most data

  tags = {
    Name = "myapp-db"
  }
}
```

Enhanced Monitoring data is sent to CloudWatch Logs under the `/aws/rds/enhanced-monitoring` log group. The metrics include CPU usage per process, memory breakdown (active, inactive, buffers, cached), disk I/O per device, and network throughput.

## Performance Insights

Performance Insights is the most powerful RDS monitoring feature. It shows you exactly which queries are consuming resources and what they are waiting on:

```hcl
resource "aws_db_instance" "main" {
  identifier = "myapp-db"

  # ... other configuration ...

  # Performance Insights settings
  performance_insights_enabled          = true
  performance_insights_retention_period = 731  # Days: 7 (free) or 731 (2 years, paid)
  performance_insights_kms_key_id      = var.kms_key_arn  # Optional, uses default key if not set

  tags = {
    Name = "myapp-db"
  }
}
```

The free tier gives you 7 days of Performance Insights data. The paid tier extends to 2 years (731 days), which is worth it for production databases because it lets you compare performance across deployments and spot long-term trends.

## CloudWatch Log Exports

RDS can export engine logs to CloudWatch Logs for centralized analysis:

```hcl
resource "aws_db_instance" "main" {
  identifier = "myapp-db"

  # ... other configuration ...

  # Export database logs to CloudWatch
  # Available options depend on the engine:
  # PostgreSQL: ["postgresql", "upgrade"]
  # MySQL: ["audit", "error", "general", "slowquery"]
  # MariaDB: ["audit", "error", "general", "slowquery"]
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "myapp-db"
  }
}

# Set retention on the log groups (they auto-create but with no retention)
resource "aws_cloudwatch_log_group" "rds_postgresql" {
  name              = "/aws/rds/instance/myapp-db/postgresql"
  retention_in_days = 30

  tags = {
    Name = "rds-postgresql-logs"
  }
}

resource "aws_cloudwatch_log_group" "rds_upgrade" {
  name              = "/aws/rds/instance/myapp-db/upgrade"
  retention_in_days = 90

  tags = {
    Name = "rds-upgrade-logs"
  }
}
```

## CloudWatch Dashboard

Pull all your RDS metrics into a single dashboard:

```hcl
resource "aws_cloudwatch_dashboard" "rds" {
  dashboard_name = "RDS-${var.db_identifier}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "CPU Utilization"
          metrics = [["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.identifier]]
          period  = 300
          stat    = "Average"
          region  = var.aws_region
          view    = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Database Connections"
          metrics = [["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.identifier]]
          period  = 300
          stat    = "Average"
          region  = var.aws_region
          view    = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Read/Write IOPS"
          metrics = [
            ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", aws_db_instance.main.identifier],
            ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", aws_db_instance.main.identifier]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Read/Write Latency"
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", aws_db_instance.main.identifier],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", aws_db_instance.main.identifier]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Freeable Memory"
          metrics = [["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", aws_db_instance.main.identifier]]
          period  = 300
          stat    = "Average"
          region  = var.aws_region
          view    = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Free Storage Space"
          metrics = [["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.main.identifier]]
          period  = 300
          stat    = "Average"
          region  = var.aws_region
          view    = "timeSeries"
        }
      }
    ]
  })
}
```

## Putting It All Together

Here is the complete RDS instance with all monitoring enabled:

```hcl
resource "aws_db_instance" "main" {
  identifier = var.db_identifier

  engine         = "postgres"
  engine_version = "16.2"
  instance_class = var.instance_class

  allocated_storage     = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "myapp"
  username = "app_admin"
  password = var.db_password

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.security_group_ids

  # All monitoring features enabled
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_enhanced_monitoring.arn
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]

  backup_retention_period = 14
  multi_az                = true
  deletion_protection     = true

  tags = {
    Name        = var.db_identifier
    Environment = var.environment
  }
}
```

## Summary

RDS monitoring in Terraform involves three layers: CloudWatch metrics with alarms for alerting, Enhanced Monitoring for OS-level visibility, and Performance Insights for query-level analysis. Enable all three for production databases. Set up CloudWatch alarms for CPU, memory, storage, connections, and latency. Export database logs to CloudWatch for centralized analysis. Build dashboards that give your team a single view of database health. All of this is defined in Terraform, so every database you create gets the same monitoring treatment automatically.
