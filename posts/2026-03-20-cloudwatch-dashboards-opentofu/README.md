# How to Set Up CloudWatch Dashboards with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Dashboard, Monitoring, Observability, Infrastructure as Code

Description: Learn how to create CloudWatch dashboards with OpenTofu to visualize key metrics from Lambda, RDS, API Gateway, and ECS in a centralized operational view.

## Introduction

CloudWatch Dashboards provide a customizable home page for monitoring AWS resources in a single view. Dashboards can contain metric graphs, alarm statuses, log query widgets, and text panels. Creating dashboards as code ensures every environment has consistent monitoring views and dashboards are recreated automatically during infrastructure deployment.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with CloudWatch permissions
- Existing AWS resources to monitor
- If creating the cost dashboard, CloudWatch billing alerts enabled in the AWS Billing console (billing metrics are published in `us-east-1`)

## Step 1: Create a Service Health Dashboard

```hcl
data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_dashboard" "service_health" {
  dashboard_name = "${var.project_name}-service-health"

  dashboard_body = jsonencode({
    widgets = [
      # Lambda Invocations and Errors
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Lambda - Invocations & Errors"
          view    = "timeSeries"
          stacked = false
          region  = var.region
          period  = 60
          stat    = "Sum"
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name,
             { label = "Invocations", color = "#2196F3" }],
            ["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name,
             { label = "Errors", color = "#F44336" }]
          ]
        }
      },
      # Lambda P99 Duration
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda - P99 Duration (ms)"
          view   = "timeSeries"
          region = var.region
          period = 60
          stat   = "p99"
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name]
          ]
        }
      },
      # API Gateway Request Count and 5XX Errors
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway - Requests & 5XX Errors"
          view   = "timeSeries"
          region = var.region
          period = 60
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiName", var.api_name, { stat = "SampleCount", label = "Total Requests" }],
            ["AWS/ApiGateway", "5XXError", "ApiName", var.api_name, { stat = "Sum", label = "5XX Errors" }]
          ]
        }
      },
      # RDS CPU and Connections
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "RDS - CPU & Connections"
          view   = "timeSeries"
          region = var.region
          period = 300
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id,
             { stat = "Average", label = "CPU %", yAxis = "left" }],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id,
             { stat = "Average", label = "Connections", yAxis = "right" }]
          ]
          yAxis = {
            left  = { label = "CPU %", min = 0, max = 100 }
            right = { label = "Connections" }
          }
        }
      },
      # Alarm Status Widget
      {
        type   = "alarm"
        x      = 0
        y      = 12
        width  = 24
        height = 4
        properties = {
          title  = "Service Health Alarms"
          alarms = [
            "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:${var.project_name}-lambda-errors",
            "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:${var.project_name}-api-5xx-errors"
          ]
        }
      },
      # Log Insights Widget
      {
        type   = "log"
        x      = 0
        y      = 16
        width  = 24
        height = 6
        properties = {
          title   = "Recent Lambda Errors"
          query   = "SOURCE '/aws/lambda/${var.lambda_function_name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region  = var.region
          view    = "table"
        }
      }
    ]
  })
}
```

## Step 2: Create a Cost Dashboard

```hcl
resource "aws_cloudwatch_dashboard" "cost_overview" {
  dashboard_name = "${var.project_name}-cost-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          title  = "AWS Billing - Estimated Charges (USD)"
          view   = "timeSeries"
          region = "us-east-1"
          period = 21600
          stat   = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD"]
          ]
        }
      }
    ]
  })
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Get the dashboard URL

echo "https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION:-<aws-region>}#dashboards:name=<project-name>-service-health"
```

## Conclusion

CloudWatch dashboards as code ensure monitoring visibility is consistently deployed alongside infrastructure. Use the JSON dashboard body to compose widgets for metric graphs, alarm status panels, and Log Insights queries in a single operational view. With CloudWatch cross-account observability, dashboards can aggregate metrics from multiple AWS accounts by specifying `accountId` in metric widget configurations.
