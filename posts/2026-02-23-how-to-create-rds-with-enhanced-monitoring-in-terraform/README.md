# How to Create RDS with Enhanced Monitoring in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Enhanced Monitoring, CloudWatch, Database, Infrastructure as Code

Description: Learn how to create RDS instances with Enhanced Monitoring in Terraform for real-time OS-level metrics, process monitoring, and deeper database performance visibility.

---

Standard RDS monitoring through CloudWatch provides hypervisor-level metrics at 1-minute intervals. Enhanced Monitoring goes deeper, providing real-time OS-level metrics at intervals as frequent as 1 second. This includes CPU usage per process, memory breakdown, file system usage, and network I/O details. This guide covers enabling and configuring Enhanced Monitoring for RDS using Terraform.

## Standard vs Enhanced Monitoring

Standard CloudWatch metrics for RDS include CPUUtilization, FreeableMemory, ReadIOPS, and WriteIOPS at the hypervisor level. Enhanced Monitoring adds OS-level metrics like per-process CPU and memory usage, swap usage, file system details, and detailed network metrics. The data is sent to CloudWatch Logs and can be viewed in the RDS console or queried programmatically.

Enhanced Monitoring is especially valuable for diagnosing performance issues where standard metrics do not tell the full story. For example, high CPU might be caused by a single runaway process, which only Enhanced Monitoring can reveal.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with private subnets. Enhanced Monitoring requires an IAM role that allows the RDS service to publish metrics to CloudWatch Logs.

## IAM Role for Enhanced Monitoring

```hcl
provider "aws" {
  region = "us-east-1"
}

# IAM role that allows RDS to publish Enhanced Monitoring metrics
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

# Attach the AWS-managed policy for Enhanced Monitoring
resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## RDS Instance with Enhanced Monitoring

```hcl
# Subnet group for RDS
resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "main-db-subnet-group"
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for RDS instances"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "rds-sg"
  }
}

# RDS instance with Enhanced Monitoring enabled
resource "aws_db_instance" "monitored" {
  identifier     = "monitored-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "appdb"
  username = "admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  # Enhanced Monitoring configuration
  monitoring_interval = 10  # Seconds between metric collections (1, 5, 10, 15, 30, or 60)
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  # Also enable Performance Insights for complementary monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 731  # 2 years (free tier is 7 days)

  backup_retention_period = 14
  skip_final_snapshot     = false
  final_snapshot_identifier = "monitored-postgres-final"

  tags = {
    Name        = "monitored-postgres"
    Environment = "production"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Multiple Instances Sharing the Same Monitoring Role

```hcl
# Production database with 1-second monitoring
resource "aws_db_instance" "production" {
  identifier     = "prod-db"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.r6g.2xlarge"

  allocated_storage = 200
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "proddb"
  username = "admin"
  password = var.prod_db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az = true

  # 1-second monitoring for production - most granular
  monitoring_interval = 1
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  tags = {
    Name        = "production-db"
    Environment = "production"
  }
}

# Staging database with 30-second monitoring (cost-effective)
resource "aws_db_instance" "staging" {
  identifier     = "staging-db"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.r6g.large"

  allocated_storage = 50
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "stagingdb"
  username = "admin"
  password = var.staging_db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az = false

  # 30-second monitoring for staging - good balance of cost and detail
  monitoring_interval = 30
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  tags = {
    Name        = "staging-db"
    Environment = "staging"
  }
}

variable "prod_db_password" {
  type      = string
  sensitive = true
}

variable "staging_db_password" {
  type      = string
  sensitive = true
}
```

## CloudWatch Alarms Based on Enhanced Monitoring Data

Enhanced Monitoring metrics are published to CloudWatch Logs under the `RDSOSMetrics` log group. You can create metric filters and alarms based on this data.

```hcl
# Metric filter for high swap usage (from Enhanced Monitoring logs)
resource "aws_cloudwatch_log_metric_filter" "rds_swap_usage" {
  name           = "rds-high-swap-usage"
  log_group_name = "RDSOSMetrics"
  pattern        = "{ $.swap.total > 0 }"

  metric_transformation {
    name      = "RDSSwapUsage"
    namespace = "CustomRDSMetrics"
    value     = "$.swap.used"
  }
}

# Alarm when swap usage is high
resource "aws_cloudwatch_metric_alarm" "rds_swap" {
  alarm_name          = "rds-high-swap-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "RDSSwapUsage"
  namespace           = "CustomRDSMetrics"
  period              = 60
  statistic           = "Average"
  threshold           = 100000000  # 100 MB of swap used
  alarm_description   = "RDS instance using significant swap memory"

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# Standard CloudWatch alarms that complement Enhanced Monitoring
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization above 80%"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.monitored.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "rds_memory" {
  alarm_name          = "rds-low-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 500000000  # 500 MB
  alarm_description   = "RDS freeable memory below 500 MB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.monitored.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10000000000  # 10 GB
  alarm_description   = "RDS free storage below 10 GB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.monitored.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# SNS topic for database alerts
resource "aws_sns_topic" "db_alerts" {
  name = "rds-monitoring-alerts"
}

resource "aws_sns_topic_subscription" "db_email" {
  topic_arn = aws_sns_topic.db_alerts.arn
  protocol  = "email"
  endpoint  = "dba-team@example.com"
}
```

## CloudWatch Dashboard for RDS Monitoring

```hcl
resource "aws_cloudwatch_dashboard" "rds" {
  dashboard_name = "rds-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.monitored.identifier]
          ]
          period = 60
          stat   = "Average"
          title  = "CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", aws_db_instance.monitored.identifier]
          ]
          period = 60
          stat   = "Average"
          title  = "Freeable Memory"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", aws_db_instance.monitored.identifier],
            ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", aws_db_instance.monitored.identifier]
          ]
          period = 60
          stat   = "Average"
          title  = "IOPS"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.monitored.identifier]
          ]
          period = 60
          stat   = "Average"
          title  = "Database Connections"
        }
      }
    ]
  })
}
```

## Outputs

```hcl
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.monitored.endpoint
}

output "monitoring_role_arn" {
  description = "IAM role ARN for Enhanced Monitoring"
  value       = aws_iam_role.rds_enhanced_monitoring.arn
}

output "enhanced_monitoring_log_group" {
  description = "CloudWatch Log Group for Enhanced Monitoring data"
  value       = "RDSOSMetrics"
}
```

## Conclusion

Enhanced Monitoring provides OS-level visibility that standard CloudWatch metrics cannot match. With Terraform, you can consistently enable and configure monitoring across your entire RDS fleet. The combination of Enhanced Monitoring, Performance Insights, and CloudWatch alarms gives you comprehensive database observability for proactive performance management.

For complementary monitoring features, check out our guide on [How to Create RDS with Performance Insights in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rds-with-performance-insights-in-terraform/view).
