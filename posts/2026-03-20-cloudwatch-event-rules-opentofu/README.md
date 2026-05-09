# How to Create CloudWatch Event Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch Events, EventBridge, Event-Driven, Automation, Infrastructure as Code

Description: Learn how to create CloudWatch Event Rules with OpenTofu to trigger Lambda functions or other targets based on scheduled cron expressions or AWS service events.

## Introduction

CloudWatch Events (now Amazon EventBridge) routes events from AWS services, custom applications, and scheduled expressions to target services like Lambda, SQS, SNS, and Step Functions. Event rules are the foundation of event-driven automation in AWS-they enable scheduled jobs, infrastructure automation, and cross-service workflows without polling.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EventBridge and target-service permissions
- For CloudTrail-based rules, an AWS CloudTrail trail with management event logging enabled

## Step 1: Scheduled Event Rule (Cron)

```hcl
# Run a Lambda function on a schedule

resource "aws_cloudwatch_event_rule" "daily_cleanup" {
  name                = "${var.project_name}-daily-cleanup"
  description         = "Trigger cleanup Lambda every day at 2 AM UTC"
  schedule_expression = "cron(0 2 * * ? *)"  # Daily at 2:00 AM UTC

  # Alternative: rate expression
  # schedule_expression = "rate(1 day)"

  state = "ENABLED"

  tags = {
    Name = "${var.project_name}-daily-cleanup"
  }
}

resource "aws_cloudwatch_event_target" "cleanup_lambda" {
  rule      = aws_cloudwatch_event_rule.daily_cleanup.name
  target_id = "cleanup-lambda"
  arn       = var.cleanup_lambda_arn

  # Input to pass to the Lambda function
  input = jsonencode({
    action = "cleanup"
    dryRun = false
    maxAge = 30
  })
}

resource "aws_lambda_permission" "allow_eventbridge_cleanup" {
  statement_id  = "AllowEventBridgeCleanup"
  action        = "lambda:InvokeFunction"
  function_name = var.cleanup_lambda_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cleanup.arn
}
```

## Step 2: Event Pattern Rule (AWS Service Events)

```hcl
# Trigger on EC2 instance state changes
resource "aws_cloudwatch_event_rule" "ec2_state_change" {
  name        = "${var.project_name}-ec2-state-change"
  description = "Capture EC2 instance state change events"

  event_pattern = jsonencode({
    source        = ["aws.ec2"]
    "detail-type" = ["EC2 Instance State-change Notification"]
    detail = {
      state = ["stopped", "terminated"]
    }
  })

  state = "ENABLED"
}

resource "aws_cloudwatch_event_target" "ec2_state_sns" {
  rule      = aws_cloudwatch_event_rule.ec2_state_change.name
  target_id = "ec2-state-notification"
  arn       = var.sns_topic_arn

  # Transform the event before sending to SNS
  input_transformer {
    input_paths = {
      instance = "$.detail.instance-id"
      state    = "$.detail.state"
      time     = "$.time"
    }
    input_template = "\"EC2 instance <instance> transitioned to <state> at <time>\""
  }
}

data "aws_iam_policy_document" "allow_eventbridge_ec2_state" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions   = ["sns:Publish"]
    resources = [var.sns_topic_arn]
  }
}

resource "aws_sns_topic_policy" "ec2_state_sns" {
  arn    = var.sns_topic_arn
  policy = data.aws_iam_policy_document.allow_eventbridge_ec2_state.json
}
```

## Step 3: CloudTrail Event Rule for Security Monitoring

```hcl
# Alert on root account console login
resource "aws_cloudwatch_event_rule" "root_login" {
  name        = "${var.project_name}-root-login"
  description = "Alert on root account console login"
  state       = "ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS"

  event_pattern = jsonencode({
    source        = ["aws.signin"]
    "detail-type" = ["AWS Console Sign In via CloudTrail", "AWS Console Signin via CloudTrail"]
    detail = {
      eventSource = ["signin.amazonaws.com"]
      eventName   = ["ConsoleLogin"]
      userIdentity = {
        type = ["Root"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "root_login_alert" {
  rule      = aws_cloudwatch_event_rule.root_login.name
  target_id = "root-login-alert"
  arn       = var.security_sns_topic_arn
}

# Alert on unauthorized API calls
resource "aws_cloudwatch_event_rule" "unauthorized_api" {
  name        = "${var.project_name}-unauthorized-api"
  description = "Alert on unauthorized API calls"
  state       = "ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS"

  event_pattern = jsonencode({
    "detail-type" = ["AWS API Call via CloudTrail"]
    detail = {
      errorCode = ["AccessDenied", "UnauthorizedOperation"]
    }
  })
}

resource "aws_cloudwatch_event_target" "unauthorized_api_alert" {
  rule      = aws_cloudwatch_event_rule.unauthorized_api.name
  target_id = "unauthorized-api-alert"
  arn       = var.security_sns_topic_arn
}

data "aws_iam_policy_document" "allow_eventbridge_security_alerts" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions   = ["sns:Publish"]
    resources = [var.security_sns_topic_arn]
  }
}

resource "aws_sns_topic_policy" "security_alerts" {
  arn    = var.security_sns_topic_arn
  policy = data.aws_iam_policy_document.allow_eventbridge_security_alerts.json
}
```

## Step 4: ECS Task State Change

```hcl
# Monitor ECS task failures
resource "aws_cloudwatch_event_rule" "ecs_task_stopped" {
  name        = "${var.project_name}-ecs-task-stopped"
  description = "Alert when ECS tasks stop unexpectedly"

  event_pattern = jsonencode({
    source        = ["aws.ecs"]
    "detail-type" = ["ECS Task State Change"]
    detail = {
      clusterArn  = [var.ecs_cluster_arn]
      lastStatus  = ["STOPPED"]
      stopCode    = ["EssentialContainerExited", "TaskFailedToStart"]
    }
  })
}

resource "aws_cloudwatch_event_target" "ecs_task_stopped_alert" {
  rule      = aws_cloudwatch_event_rule.ecs_task_stopped.name
  target_id = "ecs-task-stopped-alert"
  arn       = var.security_sns_topic_arn
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Scheduled rules run on their cron or rate expression; verify the rule configuration
aws events describe-rule --name "my-project-daily-cleanup"
```

## Conclusion

CloudWatch Event Rules are the backbone of AWS automation, enabling reactions to both time-based schedules and infrastructure state changes. Use event patterns to filter on specific event sources and details, minimizing noise. The `input_transformer` feature allows you to reformat event data before it reaches the target, reducing the logic your Lambda functions need for event parsing.
