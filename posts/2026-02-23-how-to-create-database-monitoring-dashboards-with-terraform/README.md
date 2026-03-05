# How to Create Database Monitoring Dashboards with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Monitoring, CloudWatch, Dashboard, Infrastructure as Code

Description: Learn how to create comprehensive database monitoring dashboards using Terraform with CloudWatch to track performance, availability, and health metrics.

---

Monitoring your databases is essential for maintaining application performance and catching problems before they affect your users. AWS CloudWatch provides the metrics, and Terraform lets you define monitoring dashboards as code so they are consistent across environments and can be version-controlled. In this guide, we will cover how to create comprehensive database monitoring dashboards using Terraform.

## Understanding Database Metrics

Different AWS database services expose different CloudWatch metrics. For RDS and Aurora, the key metrics include CPUUtilization, FreeableMemory, ReadIOPS, WriteIOPS, DatabaseConnections, and ReplicaLag. For ElastiCache Redis, important metrics include CacheHitRate, EngineCPUUtilization, CurrConnections, and ReplicationLag. For DynamoDB, you should monitor ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits, ThrottledRequests, and SuccessfulRequestLatency.

## Setting Up the Provider

```hcl
# Configure Terraform
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
```

## Creating an RDS Monitoring Dashboard

```hcl
# Comprehensive RDS monitoring dashboard
resource "aws_cloudwatch_dashboard" "rds_monitoring" {
  dashboard_name = "RDS-Database-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: CPU and Memory
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "CPU Utilization"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Warning"
                value = 70
                color = "#ff9900"
              },
              {
                label = "Critical"
                value = 90
                color = "#d13212"
              }
            ]
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Freeable Memory"
          metrics = [
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      # Row 2: IOPS
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Read and Write IOPS"
          metrics = [
            ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", var.rds_instance_id],
            ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Read and Write Latency"
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", var.rds_instance_id],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      # Row 3: Connections and Throughput
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Database Connections"
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title = "Network Throughput"
          metrics = [
            ["AWS/RDS", "NetworkReceiveThroughput", "DBInstanceIdentifier", var.rds_instance_id],
            ["AWS/RDS", "NetworkTransmitThroughput", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      # Row 4: Storage
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6
        properties = {
          title   = "Free Storage Space"
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 18
        width  = 12
        height = 6
        properties = {
          title   = "Disk Queue Depth"
          metrics = [
            ["AWS/RDS", "DiskQueueDepth", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      }
    ]
  })
}

variable "rds_instance_id" {
  description = "RDS instance identifier"
  type        = string
}
```

## Creating an Aurora Cluster Dashboard

```hcl
# Aurora cluster monitoring dashboard
resource "aws_cloudwatch_dashboard" "aurora_monitoring" {
  dashboard_name = "Aurora-Cluster-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      # Cluster-level metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "Aurora Replica Lag"
          metrics = [
            for instance in var.aurora_instance_ids :
            ["AWS/RDS", "AuroraReplicaLag", "DBInstanceIdentifier", instance]
          ]
          period = 60
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "CPU Utilization by Instance"
          metrics = [
            for instance in var.aurora_instance_ids :
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", instance]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Volume Bytes Used"
          metrics = [
            ["AWS/RDS", "VolumeBytesUsed", "DBClusterIdentifier", var.aurora_cluster_id]
          ]
          period = 3600
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Connections by Instance"
          metrics = [
            for instance in var.aurora_instance_ids :
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", instance]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      # Buffer cache and deadlocks
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Buffer Cache Hit Ratio"
          metrics = [
            ["AWS/RDS", "BufferCacheHitRatio", "DBClusterIdentifier", var.aurora_cluster_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Deadlocks"
          metrics = [
            ["AWS/RDS", "Deadlocks", "DBClusterIdentifier", var.aurora_cluster_id]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
        }
      }
    ]
  })
}

variable "aurora_cluster_id" {
  description = "Aurora cluster identifier"
  type        = string
}

variable "aurora_instance_ids" {
  description = "List of Aurora instance identifiers"
  type        = list(string)
}
```

## Creating an ElastiCache Redis Dashboard

```hcl
# ElastiCache Redis monitoring dashboard
resource "aws_cloudwatch_dashboard" "redis_monitoring" {
  dashboard_name = "Redis-Cache-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "Cache Hit Rate"
          metrics = [
            ["AWS/ElastiCache", "CacheHitRate", "ReplicationGroupId", var.redis_replication_group_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "Engine CPU Utilization"
          metrics = [
            ["AWS/ElastiCache", "EngineCPUUtilization", "ReplicationGroupId", var.redis_replication_group_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Current Connections"
          metrics = [
            ["AWS/ElastiCache", "CurrConnections", "ReplicationGroupId", var.redis_replication_group_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Memory Usage"
          metrics = [
            ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "ReplicationGroupId", var.redis_replication_group_id]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title = "Evictions"
          metrics = [
            ["AWS/ElastiCache", "Evictions", "ReplicationGroupId", var.redis_replication_group_id]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title = "Replication Lag"
          metrics = [
            ["AWS/ElastiCache", "ReplicationLag", "ReplicationGroupId", var.redis_replication_group_id]
          ]
          period = 60
          stat   = "Maximum"
          region = "us-east-1"
        }
      }
    ]
  })
}

variable "redis_replication_group_id" {
  description = "ElastiCache replication group ID"
  type        = string
}
```

## Creating Comprehensive Alarms

Dashboards show you what is happening; alarms tell you when something goes wrong:

```hcl
# Module for standard database alarms
locals {
  alarm_configs = {
    cpu_high = {
      metric    = "CPUUtilization"
      threshold = 80
      period    = 300
      evaluations = 3
      comparison = "GreaterThanThreshold"
      description = "CPU utilization exceeds 80 percent"
    }
    memory_low = {
      metric    = "FreeableMemory"
      threshold = 536870912  # 512 MB in bytes
      period    = 300
      evaluations = 3
      comparison = "LessThanThreshold"
      description = "Freeable memory is below 512 MB"
    }
    connections_high = {
      metric    = "DatabaseConnections"
      threshold = 100
      period    = 300
      evaluations = 2
      comparison = "GreaterThanThreshold"
      description = "Database connections exceed 100"
    }
    storage_low = {
      metric    = "FreeStorageSpace"
      threshold = 10737418240  # 10 GB in bytes
      period    = 300
      evaluations = 1
      comparison = "LessThanThreshold"
      description = "Free storage space is below 10 GB"
    }
    read_latency_high = {
      metric    = "ReadLatency"
      threshold = 0.02  # 20 milliseconds
      period    = 300
      evaluations = 3
      comparison = "GreaterThanThreshold"
      description = "Read latency exceeds 20 milliseconds"
    }
    write_latency_high = {
      metric    = "WriteLatency"
      threshold = 0.05  # 50 milliseconds
      period    = 300
      evaluations = 3
      comparison = "GreaterThanThreshold"
      description = "Write latency exceeds 50 milliseconds"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_alarms" {
  for_each = local.alarm_configs

  alarm_name          = "rds-${var.rds_instance_id}-${each.key}"
  comparison_operator = each.value.comparison
  evaluation_periods  = each.value.evaluations
  metric_name         = each.value.metric
  namespace           = "AWS/RDS"
  period              = each.value.period
  statistic           = "Average"
  threshold           = each.value.threshold
  alarm_description   = each.value.description

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.database_alerts.arn]
  ok_actions    = [aws_sns_topic.database_alerts.arn]
}

resource "aws_sns_topic" "database_alerts" {
  name = "database-monitoring-alerts"
}
```

## Creating a DynamoDB Dashboard

```hcl
# DynamoDB monitoring dashboard
resource "aws_cloudwatch_dashboard" "dynamodb_monitoring" {
  dashboard_name = "DynamoDB-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "Consumed Read/Write Capacity"
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.dynamodb_table_name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", var.dynamodb_table_name]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "Throttled Requests"
          metrics = [
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", var.dynamodb_table_name],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", var.dynamodb_table_name]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "Successful Request Latency"
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", var.dynamodb_table_name, "Operation", "GetItem"],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", var.dynamodb_table_name, "Operation", "PutItem"],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", var.dynamodb_table_name, "Operation", "Query"]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title = "System Errors"
          metrics = [
            ["AWS/DynamoDB", "SystemErrors", "TableName", var.dynamodb_table_name]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
        }
      }
    ]
  })
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
}
```

## Outputs

```hcl
output "rds_dashboard_url" {
  description = "URL for the RDS monitoring dashboard"
  value       = "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${aws_cloudwatch_dashboard.rds_monitoring.dashboard_name}"
}

output "aurora_dashboard_url" {
  description = "URL for the Aurora monitoring dashboard"
  value       = "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${aws_cloudwatch_dashboard.aurora_monitoring.dashboard_name}"
}

output "redis_dashboard_url" {
  description = "URL for the Redis monitoring dashboard"
  value       = "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${aws_cloudwatch_dashboard.redis_monitoring.dashboard_name}"
}
```

For even more comprehensive monitoring beyond CloudWatch, [OneUptime](https://oneuptime.com) provides unified dashboards that combine database metrics with application performance data, giving you end-to-end visibility into your entire stack.

## Best Practices

Create dashboards for every database service in your infrastructure. Include both performance metrics (CPU, memory, IOPS) and application-level metrics (connections, latency). Set up alarms for critical thresholds so you are notified before problems affect users. Use consistent naming conventions for dashboards and alarms. Define dashboards as Terraform code so they are version-controlled and consistent across environments. Review and update thresholds regularly as your workload changes. Include annotation lines on dashboards to mark warning and critical thresholds visually.

## Conclusion

Database monitoring dashboards defined in Terraform give you consistent, version-controlled visibility into your database infrastructure. By combining CloudWatch dashboards with metric alarms and SNS notifications, you build a comprehensive monitoring system that catches problems early and gives you the data you need to optimize performance. Start with the essential metrics for each database service and expand your dashboards as you learn more about your workload patterns.
