# How to Configure Resource Scheduling with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Cost Optimization, Resource Scheduling, Infrastructure as Code

Description: Learn how to configure resource scheduling with OpenTofu using AWS Instance Scheduler and Lambda-based automation to stop non-production resources outside business hours.

Resource scheduling stops development and staging resources outside business hours, reducing compute costs by roughly 60-70% for non-production environments. Managing schedules in OpenTofu ensures consistent application across all non-production resources.

## EventBridge Schedule Tags + Lambda

```hcl
# Lambda function to start/stop EC2 instances on schedule

resource "aws_lambda_function" "scheduler" {
  function_name = "resource-scheduler"
  runtime       = "python3.12"
  handler       = "scheduler.lambda_handler"
  filename      = "scheduler.zip"
  role          = aws_iam_role.scheduler.arn
  timeout       = 300

  environment {
    variables = {
      REGION              = var.region
      SCHEDULE_TAG_KEY    = "Schedule"
      SCHEDULE_TAG_VALUE  = "business-hours"
      START_TIME_HOUR     = "7"   # 7 AM UTC
      STOP_TIME_HOUR      = "19"  # 7 PM UTC
      TIMEZONE            = "Etc/UTC"
    }
  }
}

# Start instances at 7 AM UTC on weekdays
resource "aws_cloudwatch_event_rule" "start" {
  name                = "start-instances"
  schedule_expression = "cron(0 7 ? * MON-FRI *)"  # 7 AM UTC
}

resource "aws_cloudwatch_event_target" "start" {
  rule      = aws_cloudwatch_event_rule.start.name
  target_id = "StartInstances"
  arn       = aws_lambda_function.scheduler.arn

  input = jsonencode({ action = "start" })
}

resource "aws_lambda_permission" "allow_start_rule" {
  statement_id  = "AllowExecutionFromStartRule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start.arn
}

# Stop instances at 7 PM UTC on weekdays
resource "aws_cloudwatch_event_rule" "stop" {
  name                = "stop-instances"
  schedule_expression = "cron(0 19 ? * MON-FRI *)"  # 7 PM UTC
}

resource "aws_cloudwatch_event_target" "stop" {
  rule      = aws_cloudwatch_event_rule.stop.name
  target_id = "StopInstances"
  arn       = aws_lambda_function.scheduler.arn

  input = jsonencode({ action = "stop" })
}

resource "aws_lambda_permission" "allow_stop_rule" {
  statement_id  = "AllowExecutionFromStopRule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop.arn
}
```

## IAM Role for Scheduler Lambda

```hcl
resource "aws_iam_role" "scheduler" {
  name = "resource-scheduler-role"

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
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "rds:DescribeDBInstances",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "rds:StartDBInstance",
          "rds:StopDBInstance",
        ]
        Resource = "*"
        # Restrict mutating actions to tagged resources via condition
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = ["development", "staging"]
          }
        }
      }
    ]
  })
}
```

## Tag Non-Production Resources for Scheduling

```hcl
# Tag dev instances for scheduling
resource "aws_instance" "dev" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  subnet_id     = var.dev_subnet_id

  tags = {
    Name        = "dev-server"
    Environment = "development"
    Schedule    = "business-hours"  # Picked up by scheduler
  }
}

# Tag dev RDS for scheduling
resource "aws_db_instance" "dev" {
  identifier     = "dev-database"
  engine         = "postgres"
  instance_class = "db.t3.medium"
  # ... other settings ...

  tags = {
    Environment = "development"
    Schedule    = "business-hours"
  }
}
```

## Auto Scaling Group Scheduled Scaling

```hcl
# Scale ASG to 0 outside business hours
resource "aws_autoscaling_schedule" "scale_down" {
  scheduled_action_name  = "scale-down-after-hours"
  autoscaling_group_name = aws_autoscaling_group.dev.name

  min_size         = 0
  max_size         = 0
  desired_capacity = 0

  recurrence = "0 19 * * 1-5"  # 7 PM UTC, weekdays
  time_zone  = "Etc/UTC"
}

resource "aws_autoscaling_schedule" "scale_up" {
  scheduled_action_name  = "scale-up-business-hours"
  autoscaling_group_name = aws_autoscaling_group.dev.name

  min_size         = 1
  max_size         = 5
  desired_capacity = 2

  recurrence = "0 7 * * 1-5"  # 7 AM UTC, weekdays
  time_zone  = "Etc/UTC"
}
```

## Conclusion

Resource scheduling in OpenTofu reduces non-production costs by stopping instances outside business hours. Use EventBridge scheduled rules with Lambda for EC2 and RDS scheduling, Auto Scaling scheduled actions for ASGs, and consistent Environment and Schedule tags to identify schedulable resources. Schedule dev and staging environments to run only during business hours and save 60-70% on non-production compute costs.
