# How to Build a Cost Management Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Cost Management, FinOps, AWS, Cloud Optimization

Description: Learn how to build a cost management infrastructure with Terraform that includes budgets, alerts, resource scheduling, and automated cost optimization.

---

Cloud costs have a way of sneaking up on you. One forgotten instance here, an oversized database there, and suddenly your monthly bill looks like a phone number. The problem is that cost management is usually an afterthought. Teams spin up resources but rarely think about tracking and optimizing spend until someone in finance starts asking questions. In this post, we will build a cost management infrastructure with Terraform that puts guardrails in place from day one.

## Why Terraform for Cost Management?

When your cost controls are defined as code, they get deployed alongside your infrastructure. Every new environment gets the same budgets, alerts, and optimization rules. There is no gap between resource creation and cost monitoring because they happen together.

## Architecture Overview

Our cost management setup will include:

- AWS Budgets for spend tracking and alerts
- Cost anomaly detection
- Resource scheduling for non-production environments
- S3 lifecycle policies for storage optimization
- Auto-scaling policies based on utilization
- Tagging enforcement for cost allocation

## AWS Budgets

Start with budgets that alert you before costs get out of hand.

```hcl
# Monthly account-level budget
resource "aws_budgets_budget" "monthly_total" {
  name         = "monthly-total-budget"
  budget_type  = "COST"
  limit_amount = "10000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Alert at 50% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com", "engineering-leads@company.com"]
  }

  # Forecasted to exceed budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["finops@company.com", "cto@company.com"]
  }
}

# Per-service budgets for top spend categories
resource "aws_budgets_budget" "ec2_budget" {
  name         = "ec2-monthly-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }
}

resource "aws_budgets_budget" "rds_budget" {
  name         = "rds-monthly-budget"
  budget_type  = "COST"
  limit_amount = "3000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }
}
```

## Cost Anomaly Detection

AWS Cost Anomaly Detection catches unexpected spikes before they become big problems.

```hcl
# Cost anomaly monitor for the entire account
resource "aws_ce_anomaly_monitor" "account" {
  name              = "account-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

# SNS topic for anomaly alerts
resource "aws_sns_topic" "cost_anomaly" {
  name = "cost-anomaly-alerts"
}

resource "aws_sns_topic_subscription" "finops" {
  topic_arn = aws_sns_topic.cost_anomaly.arn
  protocol  = "email"
  endpoint  = "finops@company.com"
}

# Anomaly subscription - alert when anomaly exceeds $100
resource "aws_ce_anomaly_subscription" "alerts" {
  name = "cost-anomaly-alerts"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.account.arn,
  ]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  frequency = "IMMEDIATE"
}
```

## Resource Scheduling for Non-Production

Dev and staging environments do not need to run 24/7. Schedule them to turn off outside business hours.

```hcl
# Lambda function to stop/start instances on schedule
resource "aws_lambda_function" "instance_scheduler" {
  filename         = "instance_scheduler.zip"
  function_name    = "instance-scheduler"
  role             = aws_iam_role.scheduler_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      TAG_KEY   = "Schedule"
      TAG_VALUE = "business-hours"
      ACTION    = "auto"  # Will be overridden by EventBridge input
    }
  }
}

# Stop instances at 7 PM (Monday - Friday)
resource "aws_cloudwatch_event_rule" "stop_instances" {
  name                = "stop-dev-instances"
  schedule_expression = "cron(0 19 ? * MON-FRI *)"
}

resource "aws_cloudwatch_event_target" "stop" {
  rule      = aws_cloudwatch_event_rule.stop_instances.name
  target_id = "stop-instances"
  arn       = aws_lambda_function.instance_scheduler.arn

  input = jsonencode({
    action = "stop"
  })
}

# Start instances at 7 AM (Monday - Friday)
resource "aws_cloudwatch_event_rule" "start_instances" {
  name                = "start-dev-instances"
  schedule_expression = "cron(0 7 ? * MON-FRI *)"
}

resource "aws_cloudwatch_event_target" "start" {
  rule      = aws_cloudwatch_event_rule.start_instances.name
  target_id = "start-instances"
  arn       = aws_lambda_function.instance_scheduler.arn

  input = jsonencode({
    action = "start"
  })
}

# Lambda permission for EventBridge
resource "aws_lambda_permission" "stop_permission" {
  statement_id  = "AllowEventBridgeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instance_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_instances.arn
}

resource "aws_lambda_permission" "start_permission" {
  statement_id  = "AllowEventBridgeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instance_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_instances.arn
}
```

## Tagging Enforcement for Cost Allocation

You cannot allocate costs if resources are not tagged properly. Enforce tagging with AWS Config.

```hcl
# Config rule to check for required cost allocation tags
resource "aws_config_config_rule" "required_tags" {
  name = "required-cost-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag2Key   = "CostCenter"
    tag3Key   = "Team"
    tag4Key   = "Project"
  })

  scope {
    compliance_resource_types = [
      "AWS::EC2::Instance",
      "AWS::RDS::DBInstance",
      "AWS::S3::Bucket",
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
    ]
  }
}

# SCP to prevent creating resources without required tags
resource "aws_organizations_policy" "tag_policy" {
  name = "require-cost-tags"
  type = "TAG_POLICY"

  content = jsonencode({
    tags = {
      CostCenter = {
        tag_key = {
          "@@assign" = "CostCenter"
        }
        enforced_for = {
          "@@assign" = [
            "ec2:instance",
            "rds:db",
            "s3:bucket"
          ]
        }
      }
    }
  })
}
```

## S3 Lifecycle Policies for Storage Cost Optimization

Storage costs add up fast. Lifecycle policies move data to cheaper tiers automatically.

```hcl
# S3 bucket with intelligent tiering and lifecycle rules
resource "aws_s3_bucket" "data" {
  bucket = "company-application-data"
}

resource "aws_s3_bucket_intelligent_tiering_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  name   = "full-bucket-tiering"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  # Move infrequently accessed data to cheaper storage
  rule {
    id     = "archive-old-data"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }

  # Clean up incomplete multipart uploads
  rule {
    id     = "cleanup-multipart"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

## Right-Sizing with Auto Scaling

Set up auto-scaling so you are not paying for idle capacity.

```hcl
# Auto-scaling group with target tracking
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = 2
  max_size            = 20
  desired_capacity    = 2
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "CostCenter"
    value               = "engineering"
    propagate_at_launch = true
  }
}

# Scale based on CPU - keeps utilization between 40-70%
resource "aws_autoscaling_policy" "cpu_target" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
  }
}

# Scheduled scaling for predictable load patterns
resource "aws_autoscaling_schedule" "scale_down_night" {
  scheduled_action_name  = "scale-down-night"
  min_size               = 2
  max_size               = 5
  desired_capacity       = 2
  recurrence             = "0 22 * * *"
  autoscaling_group_name = aws_autoscaling_group.app.name
}

resource "aws_autoscaling_schedule" "scale_up_morning" {
  scheduled_action_name  = "scale-up-morning"
  min_size               = 4
  max_size               = 20
  desired_capacity       = 4
  recurrence             = "0 7 * * MON-FRI"
  autoscaling_group_name = aws_autoscaling_group.app.name
}
```

## Cost Reporting

Set up a Cost and Usage Report for detailed analysis.

```hcl
# Cost and Usage Report delivered to S3
resource "aws_cur_report_definition" "daily" {
  report_name                = "daily-cost-report"
  time_unit                  = "DAILY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cost_reports.id
  s3_prefix                  = "cur"
  s3_region                  = "us-east-1"
  report_versioning          = "OVERWRITE_REPORT"
}

resource "aws_s3_bucket" "cost_reports" {
  bucket = "company-cost-reports-${data.aws_caller_identity.current.account_id}"
}
```

## Wrapping Up

Building cost management infrastructure with Terraform means every environment gets the same financial guardrails from the start. Budgets alert you before overspending happens. Anomaly detection catches unexpected spikes. Scheduling turns off dev resources at night. Tagging enforcement ensures you can always attribute costs to the right team.

The key takeaway is that cost optimization should not be a separate initiative. It should be baked into your infrastructure code, deployed alongside your applications, and monitored continuously.

For real-time monitoring of your cloud costs alongside application performance, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-cost-management-infrastructure-with-terraform/view) for unified observability that helps you correlate cost changes with infrastructure events.
