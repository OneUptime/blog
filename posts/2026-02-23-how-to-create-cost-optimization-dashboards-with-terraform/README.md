# How to Create Cost Optimization Dashboards with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Optimization, Dashboard, CloudWatch, Monitoring

Description: Learn how to create cloud cost optimization dashboards with Terraform using CloudWatch, Grafana, and custom metrics to visualize spending and savings opportunities.

---

Cost visibility is the first step toward optimization. Without dashboards that show real-time spending, trends, and anomalies, teams fly blind when making infrastructure decisions. Terraform can provision the entire cost dashboard infrastructure, from data collection to visualization. This guide covers building cost optimization dashboards across major cloud providers.

## CloudWatch Dashboard for AWS Costs

Create a CloudWatch dashboard showing key cost metrics:

```hcl
resource "aws_cloudwatch_dashboard" "cost_optimization" {
  dashboard_name = "CostOptimization"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "EC2 Instance CPU Utilization (Underutilized < 10%)"
          metrics = [
            for id in var.monitored_instance_ids :
            ["AWS/EC2", "CPUUtilization", "InstanceId", id]
          ]
          period = 3600
          stat   = "Average"
          region = var.region
          yAxis  = { left = { min = 0, max = 100 } }
          annotations = {
            horizontal = [{
              label = "Underutilized threshold"
              value = 10
              color = "#ff0000"
            }]
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
          title   = "EBS Volume Read/Write IOPS"
          metrics = [
            for id in var.monitored_volume_ids :
            ["AWS/EBS", "VolumeReadOps", "VolumeId", id]
          ]
          period = 3600
          stat   = "Sum"
          region = var.region
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "RDS CPU Utilization"
          metrics = [
            for id in var.rds_identifiers :
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", id]
          ]
          period = 3600
          stat   = "Average"
          region = var.region
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "NAT Gateway Data Transfer"
          metrics = [
            ["AWS/NATGateway", "BytesOutToDestination", "NatGatewayId", var.nat_gateway_id],
            ["AWS/NATGateway", "BytesInFromDestination", "NatGatewayId", var.nat_gateway_id],
          ]
          period = 86400
          stat   = "Sum"
          region = var.region
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 12
        width  = 24
        height = 2
        properties = {
          markdown = "## Cost Optimization Actions\n- **Underutilized instances** (CPU < 10%): Consider right-sizing or terminating\n- **Idle EBS volumes** (zero IOPS): Consider deleting or snapshotting\n- **High NAT Gateway costs**: Consider VPC endpoints for S3/DynamoDB"
        }
      }
    ]
  })
}
```

## Custom Cost Metrics

Push custom cost metrics for dashboard consumption:

```hcl
# Lambda to calculate and push custom cost metrics
resource "aws_lambda_function" "cost_metrics" {
  function_name = "push-cost-metrics"
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 120
  role          = aws_iam_role.cost_metrics.arn

  filename         = data.archive_file.cost_metrics.output_path
  source_code_hash = data.archive_file.cost_metrics.output_base64sha256

  environment {
    variables = {
      METRIC_NAMESPACE = "Custom/CostOptimization"
    }
  }
}

# Run daily
resource "aws_cloudwatch_event_rule" "daily_cost_metrics" {
  name                = "daily-cost-metrics"
  schedule_expression = "cron(0 6 * * ? *)"
}

resource "aws_cloudwatch_event_target" "cost_metrics" {
  rule = aws_cloudwatch_event_rule.daily_cost_metrics.name
  arn  = aws_lambda_function.cost_metrics.arn
}
```

## Grafana Dashboard with Terraform

Deploy Grafana for advanced cost visualization:

```hcl
# Grafana on ECS for cost dashboards
resource "aws_ecs_task_definition" "grafana" {
  family                   = "grafana"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name  = "grafana"
    image = "grafana/grafana:latest"
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    environment = [
      { name = "GF_SECURITY_ADMIN_PASSWORD", value = var.grafana_admin_password },
      { name = "GF_INSTALL_PLUGINS", value = "grafana-athena-datasource" },
    ]
  }])
}

resource "aws_ecs_service" "grafana" {
  name            = "grafana"
  cluster         = aws_ecs_cluster.monitoring.id
  task_definition = aws_ecs_task_definition.grafana.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.grafana.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.grafana.arn
    container_name   = "grafana"
    container_port   = 3000
  }
}
```

## Azure Cost Dashboard

Create an Azure dashboard for cost monitoring:

```hcl
resource "azurerm_dashboard" "cost" {
  name                = "cost-optimization-dashboard"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location

  dashboard_properties = jsonencode({
    lenses = {
      "0" = {
        order = 0
        parts = {
          "0" = {
            position = { x = 0, y = 0, colSpan = 6, rowSpan = 4 }
            metadata = {
              type = "Extension/HubsExtension/PartType/MonitorChartPart"
              inputs = [{
                name  = "options"
                value = {
                  chart = {
                    title = "VM CPU Utilization"
                    metrics = [{
                      resourceMetadata = { id = "/subscriptions/${var.subscription_id}" }
                      name             = "Percentage CPU"
                      aggregationType  = 4
                    }]
                  }
                }
              }]
            }
          }
        }
      }
    }
  })
}
```

## Cost Savings Tracker

Track and display cost savings over time:

```hcl
# CloudWatch metric for tracking savings
resource "aws_cloudwatch_metric_alarm" "savings_tracker" {
  alarm_name = "monthly-savings-goal"

  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  threshold           = var.monthly_savings_goal

  metric_query {
    id          = "savings"
    return_data = true
    expression  = "baseline - current"
    label       = "Monthly Savings"
  }

  metric_query {
    id = "baseline"
    metric {
      metric_name = "EstimatedCharges"
      namespace   = "AWS/Billing"
      period      = 2592000  # 30 days
      stat        = "Maximum"
      dimensions = { Currency = "USD" }
    }
  }

  metric_query {
    id = "current"
    metric {
      metric_name = "ActualSpend"
      namespace   = "Custom/CostOptimization"
      period      = 2592000
      stat        = "Maximum"
    }
  }
}
```

## Best Practices

Include both current spending and optimization opportunities in dashboards. Show trends over time, not just point-in-time data. Make dashboards accessible to both engineering and finance teams. Include actionable recommendations alongside metrics. Update dashboards as new services are added. Use alerts alongside dashboards for proactive notifications. Review dashboard effectiveness monthly and refine.

## Conclusion

Cost optimization dashboards built with Terraform provide consistent, automated visibility into cloud spending. By combining CloudWatch metrics, custom cost calculations, and visualization tools like Grafana, you can identify optimization opportunities and track savings over time. The dashboards serve as a central point of truth for FinOps decisions across the organization.

For related guides, see [How to Create Cost Reports Infrastructure with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cost-reports-infrastructure-with-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
