# How to Configure CloudWatch Dashboards with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Terraform, Dashboards, Infrastructure as Code

Description: Learn how to create and manage CloudWatch dashboards using Terraform for consistent, version-controlled monitoring views across your AWS infrastructure.

---

Manually building CloudWatch dashboards through the console works for a quick one-off, but it doesn't scale. When you need the same dashboard across multiple environments, or you want to version-control your monitoring views alongside your infrastructure, Terraform is the way to go.

CloudWatch dashboards in Terraform are defined as JSON inside the `aws_cloudwatch_dashboard` resource. The JSON structure matches what CloudWatch expects, so you can design a dashboard in the console, export the JSON, and drop it into your Terraform code as a starting point.

## Basic Dashboard Structure

```hcl
# Basic CloudWatch dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-infrastructure"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "EC2 CPU Utilization"
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", "i-0123456789abcdef0"]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          view   = "timeSeries"
        }
      }
    ]
  })
}
```

The `x`, `y`, `width`, and `height` values control the layout. The dashboard grid is 24 columns wide, and widgets can be positioned anywhere on it.

## Widget Types

CloudWatch supports several widget types. Here's each one in Terraform:

### Time Series (Line Chart)

```hcl
# Time series widget showing multiple metrics
{
  type   = "metric"
  x      = 0
  y      = 0
  width  = 12
  height = 6
  properties = {
    title   = "Request Metrics"
    metrics = [
      ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${aws_lb.main.arn_suffix}", { stat = "Sum", label = "Requests" }],
      ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "${aws_lb.main.arn_suffix}", { stat = "Sum", label = "5xx Errors", color = "#d62728" }]
    ]
    period = 300
    region = var.region
    view   = "timeSeries"
    yAxis = {
      left = { min = 0 }
    }
  }
}
```

### Single Value (Number)

```hcl
# Single value widget showing current metric value
{
  type   = "metric"
  x      = 0
  y      = 0
  width  = 6
  height = 3
  properties = {
    title   = "Active Connections"
    metrics = [
      ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "${aws_db_instance.main.id}"]
    ]
    period = 300
    stat   = "Average"
    region = var.region
    view   = "singleValue"
  }
}
```

### Text Widget

```hcl
# Text widget for section headers or documentation
{
  type   = "text"
  x      = 0
  y      = 0
  width  = 24
  height = 1
  properties = {
    markdown = "## Production Infrastructure Dashboard\nLast updated: auto-refreshes every 5 minutes"
  }
}
```

### Log Widget

```hcl
# CloudWatch Logs Insights query widget
{
  type   = "log"
  x      = 0
  y      = 12
  width  = 24
  height = 6
  properties = {
    title  = "Recent Application Errors"
    region = var.region
    query  = "SOURCE '/app/production' | filter @message like /ERROR/ | fields @timestamp, @message | sort @timestamp desc | limit 20"
    view   = "table"
  }
}
```

### Alarm Status Widget

```hcl
# Widget showing alarm status
{
  type   = "alarm"
  x      = 0
  y      = 0
  width  = 24
  height = 3
  properties = {
    title  = "Alarm Status"
    alarms = [
      "${aws_cloudwatch_metric_alarm.cpu.arn}",
      "${aws_cloudwatch_metric_alarm.memory.arn}",
      "${aws_cloudwatch_metric_alarm.errors.arn}"
    ]
  }
}
```

## Complete Dashboard Example

Here's a full production dashboard with multiple sections:

```hcl
# Complete production dashboard
resource "aws_cloudwatch_dashboard" "production" {
  dashboard_name = "${var.environment}-production-overview"

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
          markdown = "## Production Overview Dashboard"
        }
      },

      # Alarm status bar
      {
        type   = "alarm"
        x      = 0
        y      = 1
        width  = 24
        height = 2
        properties = {
          title  = "Current Alarm Status"
          alarms = [
            aws_cloudwatch_metric_alarm.alb_5xx.arn,
            aws_cloudwatch_metric_alarm.rds_cpu.arn,
            aws_cloudwatch_metric_alarm.ec2_cpu.arn
          ]
        }
      },

      # ALB section header
      {
        type   = "text"
        x      = 0
        y      = 3
        width  = 24
        height = 1
        properties = {
          markdown = "### Load Balancer"
        }
      },

      # ALB request count
      {
        type   = "metric"
        x      = 0
        y      = 4
        width  = 8
        height = 6
        properties = {
          title   = "Request Count"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Sum" }]
          ]
          period = 60
          region = var.region
          view   = "timeSeries"
        }
      },

      # ALB response time
      {
        type   = "metric"
        x      = 8
        y      = 4
        width  = 8
        height = 6
        properties = {
          title   = "Response Time"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Average", label = "Average" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "p99", label = "P99" }]
          ]
          period = 300
          region = var.region
          view   = "timeSeries"
          yAxis = {
            left = { label = "Seconds", min = 0 }
          }
        }
      },

      # ALB error codes
      {
        type   = "metric"
        x      = 16
        y      = 4
        width  = 8
        height = 6
        properties = {
          title   = "Error Codes"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Sum", label = "4xx" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Sum", label = "5xx", color = "#d62728" }]
          ]
          period = 300
          region = var.region
          view   = "timeSeries"
        }
      },

      # Database section
      {
        type   = "text"
        x      = 0
        y      = 10
        width  = 24
        height = 1
        properties = {
          markdown = "### Database"
        }
      },

      # RDS CPU
      {
        type   = "metric"
        x      = 0
        y      = 11
        width  = 8
        height = 6
        properties = {
          title   = "RDS CPU"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          view   = "timeSeries"
          yAxis = {
            left = { max = 100, min = 0, label = "%" }
          }
        }
      },

      # RDS Connections
      {
        type   = "metric"
        x      = 8
        y      = 11
        width  = 8
        height = 6
        properties = {
          title   = "RDS Connections"
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.id]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          view   = "timeSeries"
        }
      },

      # RDS Free Storage
      {
        type   = "metric"
        x      = 16
        y      = 11
        width  = 8
        height = 6
        properties = {
          title   = "RDS Free Storage (GB)"
          metrics = [
            [{ expression = "m1 / 1073741824", label = "Free Storage GB", id = "e1" }],
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.main.id, { id = "m1", visible = false }]
          ]
          period = 300
          region = var.region
          view   = "timeSeries"
        }
      }
    ]
  })
}
```

## Using Metrics Math in Dashboard Widgets

Metrics Math works in dashboard widgets too:

```hcl
# Widget with error rate calculation using Metrics Math
{
  type   = "metric"
  x      = 0
  y      = 0
  width  = 12
  height = 6
  properties = {
    title   = "Error Rate (%)"
    metrics = [
      [{ expression = "IF(requests > 0, errors / requests * 100, 0)", label = "Error Rate %", id = "e1" }],
      ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "${aws_lb.main.arn_suffix}", { id = "errors", visible = false, stat = "Sum" }],
      ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${aws_lb.main.arn_suffix}", { id = "requests", visible = false, stat = "Sum" }]
    ]
    period = 300
    region = var.region
    view   = "timeSeries"
    yAxis = {
      left = { min = 0, max = 100, label = "%" }
    }
  }
}
```

For more on Metrics Math, see our guide on [CloudWatch Metrics Math expressions](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-metrics-math-expressions/view).

## Dynamic Dashboards with Template Variables

While CloudWatch doesn't have template variables like Grafana, you can use Terraform variables to make dashboards dynamic:

```hcl
# Variables for dashboard configuration
variable "ec2_instances" {
  type = map(object({
    instance_id = string
    name        = string
  }))
}

# Dynamically generate EC2 metric widgets
locals {
  ec2_widgets = [
    for idx, instance in values(var.ec2_instances) : {
      type   = "metric"
      x      = (idx % 3) * 8
      y      = 4 + floor(idx / 3) * 6
      width  = 8
      height = 6
      properties = {
        title   = "CPU - ${instance.name}"
        metrics = [
          ["AWS/EC2", "CPUUtilization", "InstanceId", instance.instance_id]
        ]
        period = 300
        stat   = "Average"
        region = var.region
        view   = "timeSeries"
      }
    }
  ]
}

resource "aws_cloudwatch_dashboard" "dynamic" {
  dashboard_name = "${var.environment}-ec2-fleet"
  dashboard_body = jsonencode({
    widgets = local.ec2_widgets
  })
}
```

## Dashboard Module

Create a reusable module for common dashboard patterns:

```hcl
# modules/service-dashboard/main.tf
resource "aws_cloudwatch_dashboard" "service" {
  dashboard_name = "${var.environment}-${var.service_name}"

  dashboard_body = jsonencode({
    widgets = concat(
      [
        {
          type   = "text"
          x      = 0
          y      = 0
          width  = 24
          height = 1
          properties = {
            markdown = "## ${var.service_name} - ${var.environment}"
          }
        }
      ],
      var.custom_widgets
    )
  })
}

# modules/service-dashboard/variables.tf
variable "environment" { type = string }
variable "service_name" { type = string }
variable "custom_widgets" {
  type    = list(any)
  default = []
}
```

## Multi-Environment Strategy

Deploy the same dashboard to multiple environments:

```hcl
# Deploy dashboards per environment
module "dashboard" {
  source   = "./modules/service-dashboard"
  for_each = toset(["dev", "staging", "production"])

  environment = each.key
  service_name = "web-api"
  custom_widgets = [
    # Widgets referencing environment-specific resources
  ]
}
```

## Best Practices

**Start from the console, codify later.** Design your dashboard visually in the CloudWatch console, then export the JSON and convert it to Terraform.

**Use consistent layouts.** Keep widget sizes and positions consistent across dashboards. A standard layout makes it easier for on-call to find information quickly.

**Include alarm status at the top.** The alarm widget gives an instant at-a-glance view of system health.

**Add text headers between sections.** Organize dashboards into logical groups with markdown text widgets.

**Use Metrics Math for derived metrics.** Show error rates as percentages, convert bytes to gigabytes, and calculate request rates directly in the dashboard.

**Keep dashboards focused.** One dashboard per service or application layer. A dashboard that shows everything shows nothing useful.

For the alarm definitions that complement these dashboards, see our guide on [CloudWatch alarms with Terraform](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-alarms-terraform/view).

## Wrapping Up

Terraform-managed CloudWatch dashboards bring the same benefits as any infrastructure-as-code approach: consistency, version control, and reproducibility. The JSON widget format takes some getting used to, but once you have a few templates, creating new dashboards is fast. Combine dynamic widget generation with Terraform modules, and you can monitor an entire fleet of services with minimal code duplication.
