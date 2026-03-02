# How to Create Infrastructure Health Dashboards with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dashboard, CloudWatch, Monitoring, Observability, Infrastructure as Code

Description: Learn how to create comprehensive infrastructure health dashboards with Terraform using CloudWatch dashboards, custom widgets, and automated metric visualization.

---

Infrastructure health dashboards provide a single pane of glass for understanding the state of your systems. Without them, teams spend valuable time during incidents jumping between different monitoring tools trying to piece together what is happening. Terraform allows you to define dashboards as code, ensuring they are consistent across environments and evolve alongside your infrastructure.

In this guide, we will create comprehensive infrastructure health dashboards using Terraform and AWS CloudWatch. We will build dashboards that cover compute, database, networking, and application-level health metrics.

## Why Define Dashboards with Terraform

Manually created dashboards suffer from several problems. They are not version-controlled, so you cannot track changes or roll back mistakes. They are not replicated across environments, meaning your staging environment might lack the dashboards you rely on in production. And they tend to become stale as infrastructure evolves. Terraform solves all of these issues by treating dashboards as code.

## Provider and Variables

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster to monitor"
  type        = string
}

variable "rds_instances" {
  description = "List of RDS instance identifiers"
  type        = list(string)
  default     = ["primary-db", "replica-db"]
}

variable "load_balancer_arn_suffix" {
  description = "ALB ARN suffix for metrics"
  type        = string
}

variable "target_group_arn_suffixes" {
  description = "Map of service names to target group ARN suffixes"
  type        = map(string)
}
```

## Creating the Executive Overview Dashboard

Start with a high-level dashboard that gives leadership a quick view of system health:

```hcl
# executive-dashboard.tf - High-level overview dashboard
resource "aws_cloudwatch_dashboard" "executive" {
  dashboard_name = "Executive-Overview-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # Header
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Infrastructure Health - ${var.environment} | Updated every 5 minutes"
        }
      },

      # Overall Health Score
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 6
        height = 6
        properties = {
          title  = "Healthy Hosts"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", var.load_balancer_arn_suffix]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          view   = "singleValue"
        }
      },

      # Request Rate
      {
        type   = "metric"
        x      = 6
        y      = 1
        width  = 6
        height = 6
        properties = {
          title  = "Requests per Minute"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.load_balancer_arn_suffix, { stat = "Sum" }]
          ]
          period = 60
          region = var.aws_region
          view   = "singleValue"
        }
      },

      # Error Rate
      {
        type   = "metric"
        x      = 12
        y      = 1
        width  = 6
        height = 6
        properties = {
          title = "Error Rate %"
          metrics = [
            [{
              expression = "(m2 / m1) * 100"
              label      = "5XX Error Rate"
              id         = "e1"
            }],
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.load_balancer_arn_suffix, { id = "m1", visible = false, stat = "Sum" }],
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.load_balancer_arn_suffix, { id = "m2", visible = false, stat = "Sum" }]
          ]
          period = 300
          region = var.aws_region
          view   = "singleValue"
        }
      },

      # Average Latency
      {
        type   = "metric"
        x      = 18
        y      = 1
        width  = 6
        height = 6
        properties = {
          title  = "Avg Response Time (ms)"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.load_balancer_arn_suffix, { stat = "Average" }]
          ]
          period = 300
          region = var.aws_region
          view   = "singleValue"
        }
      }
    ]
  })
}
```

## Creating the Compute Health Dashboard

Monitor ECS services and EC2 instances:

```hcl
# compute-dashboard.tf - Compute resources health
resource "aws_cloudwatch_dashboard" "compute" {
  dashboard_name = "Compute-Health-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Compute Health - ${var.environment}"
        }
      },

      # ECS CPU Utilization
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "ECS CPU Utilization"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, { stat = "Average" }],
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, { stat = "p99", label = "P99" }]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          yAxis  = { left = { min = 0, max = 100 } }
          annotations = {
            horizontal = [{
              label = "Warning"
              value = 80
              color = "#ff9900"
            }, {
              label = "Critical"
              value = 95
              color = "#d13212"
            }]
          }
        }
      },

      # ECS Memory Utilization
      {
        type   = "metric"
        x      = 12
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "ECS Memory Utilization"
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name, { stat = "Average" }],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name, { stat = "p99", label = "P99" }]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          yAxis  = { left = { min = 0, max = 100 } }
        }
      },

      # Running Tasks Count
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "Running Tasks"
          metrics = [
            ["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", var.ecs_cluster_name]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
        }
      },

      # Pending Tasks Count
      {
        type   = "metric"
        x      = 12
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "Pending Tasks"
          metrics = [
            ["ECS/ContainerInsights", "PendingTaskCount", "ClusterName", var.ecs_cluster_name]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
        }
      }
    ]
  })
}
```

## Creating the Database Health Dashboard

```hcl
# database-dashboard.tf - Database health monitoring
resource "aws_cloudwatch_dashboard" "database" {
  dashboard_name = "Database-Health-${var.environment}"

  dashboard_body = jsonencode({
    widgets = concat(
      [{
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Database Health - ${var.environment}"
        }
      }],

      # Generate widgets for each RDS instance
      flatten([
        for idx, db in var.rds_instances : [
          # CPU Utilization
          {
            type   = "metric"
            x      = 0
            y      = 1 + idx * 7
            width  = 8
            height = 6
            properties = {
              title  = "${db} - CPU"
              metrics = [
                ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", db]
              ]
              period = 300
              region = var.aws_region
              view   = "timeSeries"
              yAxis  = { left = { min = 0, max = 100 } }
            }
          },
          # Database Connections
          {
            type   = "metric"
            x      = 8
            y      = 1 + idx * 7
            width  = 8
            height = 6
            properties = {
              title  = "${db} - Connections"
              metrics = [
                ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", db]
              ]
              period = 300
              region = var.aws_region
              view   = "timeSeries"
            }
          },
          # Read/Write Latency
          {
            type   = "metric"
            x      = 16
            y      = 1 + idx * 7
            width  = 8
            height = 6
            properties = {
              title  = "${db} - Latency"
              metrics = [
                ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", db, { label = "Read" }],
                ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", db, { label = "Write" }]
              ]
              period = 300
              region = var.aws_region
              view   = "timeSeries"
            }
          }
        ]
      ])
    )
  })
}
```

## Creating the Networking Dashboard

```hcl
# network-dashboard.tf - Network health monitoring
resource "aws_cloudwatch_dashboard" "network" {
  dashboard_name = "Network-Health-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Network Health - ${var.environment}"
        }
      },

      # ALB Request Count
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "Request Count by Status Code"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", var.load_balancer_arn_suffix, { label = "2XX", color = "#2ca02c" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.load_balancer_arn_suffix, { label = "4XX", color = "#ff7f0e" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.load_balancer_arn_suffix, { label = "5XX", color = "#d62728" }]
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          view   = "timeSeries"
        }
      },

      # Target Response Time
      {
        type   = "metric"
        x      = 12
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "Response Time (ms)"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.load_balancer_arn_suffix, { stat = "p99", label = "P99" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.load_balancer_arn_suffix, { stat = "p95", label = "P95" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.load_balancer_arn_suffix, { stat = "Average", label = "Average" }]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
        }
      },

      # Active Connections
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "Active Connections"
          metrics = [
            ["AWS/ApplicationELB", "ActiveConnectionCount", "LoadBalancer", var.load_balancer_arn_suffix]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
        }
      }
    ]
  })
}
```

## Outputs

```hcl
# outputs.tf - Export dashboard URLs
output "dashboard_urls" {
  description = "URLs for all infrastructure dashboards"
  value = {
    executive = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=Executive-Overview-${var.environment}"
    compute   = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=Compute-Health-${var.environment}"
    database  = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=Database-Health-${var.environment}"
    network   = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=Network-Health-${var.environment}"
  }
}
```

## Conclusion

Infrastructure health dashboards defined in Terraform evolve alongside your infrastructure. When you add a new database or service, the dashboards update automatically through your Terraform pipeline. This approach eliminates the common problem of stale or missing dashboards during incidents. Combined with [cost monitoring alerts](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cost-monitoring-alerts-with-terraform/view) and [custom metrics collection](https://oneuptime.com/blog/post/2026-02-23-how-to-create-custom-metrics-collection-with-terraform/view), you can build a complete observability platform managed entirely as code.
