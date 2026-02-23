# How to Create RDS with Performance Insights in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Performance Insights, Database Monitoring, Infrastructure as Code

Description: Learn how to create RDS instances with Performance Insights in Terraform for database load analysis, wait event monitoring, and SQL-level performance diagnostics.

---

Performance Insights is a database performance tuning and monitoring feature that helps you quickly assess the load on your database and determine when and where to take action. Unlike standard CloudWatch metrics that show resource utilization, Performance Insights visualizes database load in terms of waits, SQL statements, hosts, and users. This guide covers enabling and using Performance Insights with Terraform.

## What Performance Insights Shows

Performance Insights displays your database load as the Average Active Sessions (AAS) metric, broken down by wait events. A wait event represents what the database is waiting on - disk I/O, locks, network, CPU, or other resources. By seeing which wait events dominate, you can quickly identify whether your database is CPU-bound, I/O-bound, or experiencing lock contention.

The tool also shows the top SQL statements contributing to load, which hosts and users generate the most load, and how load patterns change over time.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with private subnets. Performance Insights is available for most RDS engines and instance classes.

## Basic Performance Insights Configuration

```hcl
provider "aws" {
  region = "us-east-1"
}

# RDS instance with Performance Insights enabled
resource "aws_db_instance" "with_pi" {
  identifier     = "pi-enabled-postgres"
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

  # Performance Insights configuration
  performance_insights_enabled          = true
  performance_insights_retention_period = 731  # Days: 7 (free), 31, 62, 93, ..., 731

  # Optional: Use a custom KMS key for Performance Insights data encryption
  performance_insights_kms_key_id = aws_kms_key.pi.arn

  # Also enable Enhanced Monitoring for comprehensive visibility
  monitoring_interval = 10
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  backup_retention_period = 14

  tags = {
    Name        = "pi-postgres"
    Environment = "production"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## KMS Key for Performance Insights Encryption

```hcl
# KMS key for encrypting Performance Insights data
resource "aws_kms_key" "pi" {
  description             = "KMS key for RDS Performance Insights"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowRDSPerformanceInsights"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "rds.us-east-1.amazonaws.com"
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = {
    Name = "rds-performance-insights-key"
  }
}

resource "aws_kms_alias" "pi" {
  name          = "alias/rds-performance-insights"
  target_key_id = aws_kms_key.pi.key_id
}

data "aws_caller_identity" "current" {}
```

## Multiple Database Instances with Performance Insights

```hcl
locals {
  databases = {
    users = {
      engine         = "postgres"
      engine_version = "15"
      instance_class = "db.r6g.xlarge"
      storage        = 100
      pi_retention   = 731  # Long retention for production
      monitoring_interval = 10
    }
    orders = {
      engine         = "mysql"
      engine_version = "8.0"
      instance_class = "db.r6g.large"
      storage        = 200
      pi_retention   = 731
      monitoring_interval = 10
    }
    analytics = {
      engine         = "postgres"
      engine_version = "15"
      instance_class = "db.r6g.2xlarge"
      storage        = 500
      pi_retention   = 731
      monitoring_interval = 1  # 1-second monitoring for analytics DB
    }
  }
}

resource "aws_db_instance" "databases" {
  for_each = local.databases

  identifier     = "${each.key}-db"
  engine         = each.value.engine
  engine_version = each.value.engine_version
  instance_class = each.value.instance_class

  allocated_storage     = each.value.storage
  max_allocated_storage = each.value.storage * 5
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = each.key
  username = "admin"
  password = var.db_passwords[each.key]

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  # Performance Insights for all databases
  performance_insights_enabled          = true
  performance_insights_retention_period = each.value.pi_retention
  performance_insights_kms_key_id       = aws_kms_key.pi.arn

  # Enhanced Monitoring
  monitoring_interval = each.value.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  backup_retention_period = 14

  tags = {
    Name        = "${each.key}-db"
    Environment = "production"
    Service     = each.key
  }
}

variable "db_passwords" {
  type      = map(string)
  sensitive = true
}
```

## IAM Role for Enhanced Monitoring

```hcl
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Querying Performance Insights Data Programmatically

You can use the Performance Insights API via AWS CLI or SDK to extract data for custom dashboards.

```hcl
# IAM policy for accessing Performance Insights data
resource "aws_iam_policy" "pi_reader" {
  name        = "performance-insights-reader"
  description = "Allow reading Performance Insights data"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "pi:DescribeDimensionKeys",
          "pi:GetDimensionKeyDetails",
          "pi:GetResourceMetadata",
          "pi:GetResourceMetrics",
          "pi:ListAvailableResourceDimensions",
          "pi:ListAvailableResourceMetrics"
        ]
        Resource = "arn:aws:pi:us-east-1:${data.aws_caller_identity.current.account_id}:metrics/rds/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.pi.arn
      }
    ]
  })
}
```

## CloudWatch Alarms with Performance Insights Metrics

```hcl
# Alarm on database load (Average Active Sessions)
resource "aws_cloudwatch_metric_alarm" "db_load" {
  alarm_name          = "rds-high-db-load"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DBLoad"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  # Threshold should be based on vCPUs - if instance has 4 vCPUs,
  # a DBLoad > 4 means more sessions are active than CPUs available
  threshold           = 4
  alarm_description   = "Database load exceeds available vCPUs"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.with_pi.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# Alarm on non-CPU database load (indicates I/O or lock waits)
resource "aws_cloudwatch_metric_alarm" "db_load_non_cpu" {
  alarm_name          = "rds-high-non-cpu-load"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DBLoadNonCPU"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2
  alarm_description   = "High non-CPU database load (possible I/O or lock contention)"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.with_pi.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

resource "aws_sns_topic" "db_alerts" {
  name = "rds-performance-alerts"
}
```

## Network and Subnet Configuration

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "rds-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "main-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = aws_vpc.main.id
  description = "RDS security group"

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
```

## Outputs

```hcl
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.with_pi.endpoint
}

output "performance_insights_enabled" {
  description = "Performance Insights status"
  value       = aws_db_instance.with_pi.performance_insights_enabled
}

output "pi_retention_period" {
  description = "Performance Insights data retention period in days"
  value       = aws_db_instance.with_pi.performance_insights_retention_period
}
```

## Conclusion

Performance Insights transforms database monitoring from resource-level metrics to workload-level understanding. By visualizing database load in terms of wait events and SQL statements, you can quickly identify and resolve performance bottlenecks. With Terraform, Performance Insights can be consistently enabled across your entire database fleet, with proper encryption and retention settings.

For more RDS features, check out our guide on [How to Create RDS with IAM Authentication in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rds-with-iam-authentication-in-terraform/view).
