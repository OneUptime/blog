# How to Implement Auto-Shutdown for Dev Resources with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Optimization, Auto Shutdown, Development, Scheduling

Description: Learn how to implement automatic shutdown schedules for development and testing resources using Terraform to eliminate waste from idle non-production environments.

---

Development and testing environments that run 24/7 waste money during nights, weekends, and holidays when no one is using them. Implementing auto-shutdown schedules can reduce non-production compute costs by 60-70%. This guide covers how to build auto-shutdown infrastructure with Terraform.

## The Cost of Always-On Dev Environments

A typical development environment with 10 EC2 instances, 2 RDS databases, and supporting infrastructure can cost over $3,000 per month. If developers only work 10 hours per day on weekdays, that is only 50 out of 168 hours per week, meaning 70% of the cost is wasted.

## AWS Instance Scheduler with Terraform

Use AWS Instance Scheduler to automate start/stop schedules:

```hcl
# Tag-based scheduling: instances with these tags will be managed
resource "aws_instance" "dev_server" {
  ami           = var.ami_id
  instance_type = "t3.large"

  tags = {
    Name     = "dev-server"
    Schedule = "office-hours"  # Tag that Instance Scheduler reads
  }
}

# CloudFormation for Instance Scheduler (AWS Solution)
resource "aws_cloudformation_stack" "instance_scheduler" {
  name = "instance-scheduler"

  template_url = "https://s3.amazonaws.com/solutions-reference/instance-scheduler-on-aws/latest/instance-scheduler-on-aws.template"

  parameters = {
    TagName          = "Schedule"
    DefaultTimezone  = "US/Eastern"
    Regions          = var.region
    CrossAccountRoles = ""
    ScheduleLambdaAccount = "Yes"
  }

  capabilities = ["CAPABILITY_IAM"]
}
```

## Custom Lambda-Based Auto-Shutdown

Build a custom shutdown solution:

```hcl
# Lambda function to stop instances
resource "aws_lambda_function" "stop_instances" {
  function_name = "auto-stop-dev-instances"
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 120
  role          = aws_iam_role.scheduler.arn

  filename         = data.archive_file.stop_function.output_path
  source_code_hash = data.archive_file.stop_function.output_base64sha256

  environment {
    variables = {
      TAG_KEY   = "AutoShutdown"
      TAG_VALUE = "true"
      REGION    = var.region
    }
  }
}

# Lambda function to start instances
resource "aws_lambda_function" "start_instances" {
  function_name = "auto-start-dev-instances"
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 120
  role          = aws_iam_role.scheduler.arn

  filename         = data.archive_file.start_function.output_path
  source_code_hash = data.archive_file.start_function.output_base64sha256

  environment {
    variables = {
      TAG_KEY   = "AutoShutdown"
      TAG_VALUE = "true"
      REGION    = var.region
    }
  }
}

# Schedule: Stop at 7 PM weekdays
resource "aws_cloudwatch_event_rule" "stop_schedule" {
  name                = "stop-dev-instances"
  description         = "Stop development instances at 7 PM EST"
  schedule_expression = "cron(0 0 ? * MON-FRI *)"  # 7 PM EST = midnight UTC
}

resource "aws_cloudwatch_event_target" "stop" {
  rule = aws_cloudwatch_event_rule.stop_schedule.name
  arn  = aws_lambda_function.stop_instances.arn
}

# Schedule: Start at 7 AM weekdays
resource "aws_cloudwatch_event_rule" "start_schedule" {
  name                = "start-dev-instances"
  description         = "Start development instances at 7 AM EST"
  schedule_expression = "cron(0 12 ? * MON-FRI *)"  # 7 AM EST = noon UTC
}

resource "aws_cloudwatch_event_target" "start" {
  rule = aws_cloudwatch_event_rule.start_schedule.name
  arn  = aws_lambda_function.start_instances.arn
}

# IAM role for the scheduler Lambda
resource "aws_iam_role" "scheduler" {
  name = "instance-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler" {
  name = "instance-scheduler-policy"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StopInstances",
          "ec2:StartInstances",
          "rds:DescribeDBInstances",
          "rds:StopDBInstance",
          "rds:StartDBInstance",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda permissions for EventBridge
resource "aws_lambda_permission" "allow_stop" {
  statement_id  = "AllowStopSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_schedule.arn
}

resource "aws_lambda_permission" "allow_start" {
  statement_id  = "AllowStartSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_schedule.arn
}
```

## RDS Auto-Shutdown

Stop RDS instances during off-hours:

```hcl
resource "aws_db_instance" "dev" {
  identifier     = "dev-database"
  engine         = "postgres"
  instance_class = "db.t3.medium"

  tags = {
    AutoShutdown = "true"
    Environment  = "development"
  }
}
```

## Azure Auto-Shutdown

Azure VMs have built-in auto-shutdown:

```hcl
resource "azurerm_dev_test_global_vm_shutdown_schedule" "dev_vms" {
  for_each = toset(var.dev_vm_ids)

  virtual_machine_id = each.key
  location           = var.location
  enabled            = true

  daily_recurrence_time = "1900"  # 7 PM
  timezone              = "Eastern Standard Time"

  notification_settings {
    enabled         = true
    time_in_minutes = 30
    email           = "dev-team@company.com"
  }
}
```

## Tagging for Auto-Shutdown

Tag all development resources for auto-shutdown:

```hcl
locals {
  dev_tags = {
    Environment  = "development"
    AutoShutdown = "true"
    Schedule     = "office-hours"
    ShutdownTime = "19:00"
    StartupTime  = "07:00"
    Timezone     = "US/Eastern"
  }
}

resource "aws_instance" "dev" {
  count         = 5
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = merge(local.dev_tags, {
    Name = "dev-server-${count.index}"
  })
}
```

## Override Mechanism

Allow developers to temporarily prevent shutdown:

```hcl
# Tag to override auto-shutdown
# Developers can add KeepRunning=true tag via console or CLI
# The Lambda function checks for this tag before stopping

# CloudWatch alarm to detect instances running past shutdown time
resource "aws_cloudwatch_metric_alarm" "override_alert" {
  alarm_name          = "dev-instances-running-overtime"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0

  metric_query {
    id          = "running_count"
    return_data = true
    metric {
      metric_name = "RunningInstances"
      namespace   = "Custom/DevScheduler"
      period      = 3600
      stat        = "Maximum"
    }
  }

  alarm_description = "Dev instances are still running past scheduled shutdown"
  alarm_actions     = [aws_sns_topic.dev_alerts.arn]
}
```

## Best Practices

Tag all non-production resources with auto-shutdown markers. Provide a mechanism for developers to override shutdown when needed. Send notifications before shutting down resources. Include RDS, EKS, and other expensive services in shutdown schedules. Use separate schedules for different time zones. Track cost savings from auto-shutdown in dashboards. Exclude production and shared services from auto-shutdown.

## Conclusion

Auto-shutdown for development resources is one of the easiest and highest-impact cost optimization strategies. By using Terraform to deploy scheduling infrastructure and tag-based management, you can automate the shutdown of idle resources and save 60-70% on non-production compute costs. The key is consistent tagging, reliable scheduling, and providing developers with override capabilities for when they need extended access.

For related guides, see [How to Right-Size EC2 Instances with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-right-size-ec2-instances-with-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
