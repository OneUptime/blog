# How to Automate DR Failover with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Automation, OpenTofu, Failover, EventBridge, Lambda

Description: Learn how to automate disaster recovery failover using OpenTofu with event-driven triggers, Lambda automation, and Route53 DNS switching for hands-free DR execution.

## Overview

Automated DR failover eliminates the need for manual intervention during a disaster. OpenTofu configures the monitoring, event-driven automation, and pre-tested runbooks that execute failover procedures when health checks fail.

## Step 1: CloudWatch Alarm and SNS Trigger for DR Failover

```hcl
# main.tf - Event-driven DR automation

resource "aws_cloudwatch_metric_alarm" "primary_unhealthy" {
  alarm_name          = "primary-region-unhealthy"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0  # Zero healthy hosts across the target group triggers alarm

  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.primary.arn_suffix
  }

  alarm_actions = [aws_sns_topic.dr_trigger.arn]
}

resource "aws_sns_topic" "dr_trigger" {
  name = "dr-failover-trigger"
}

# Lambda for automated DR actions
resource "aws_sns_topic_subscription" "dr_lambda" {
  topic_arn = aws_sns_topic.dr_trigger.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.dr_failover.arn

  depends_on = [aws_lambda_permission.sns_invoke]
}
```

## Step 2: DR Automation Lambda

```hcl
resource "aws_lambda_function" "dr_failover" {
  filename      = "dr_failover.zip"
  function_name = "dr-failover-automation"
  role          = aws_iam_role.dr_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.12"
  timeout       = 300

  environment {
    variables = {
      DR_DB_INSTANCE_ID       = aws_db_instance.dr_replica.id
      DR_ASG_NAME             = aws_autoscaling_group.dr.name
      ROUTE53_ZONE_ID         = aws_route53_zone.app.zone_id
      DR_ALB_DNS              = aws_lb.dr.dns_name
      DR_ALB_ZONE_ID          = aws_lb.dr.zone_id
      DR_TARGET_CAPACITY      = "8"
      PAGERDUTY_ALERT_KEY     = var.pagerduty_key
      SNS_NOTIFICATION_TOPIC  = aws_sns_topic.dr_notifications.arn
    }
  }
}

resource "aws_lambda_permission" "sns_invoke" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_failover.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.dr_trigger.arn
}
```

## Step 3: IAM Permissions for DR Lambda

```hcl
resource "aws_iam_role_policy" "dr_lambda_policy" {
  role = aws_iam_role.dr_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:PromoteReadReplica",
          "rds:DescribeDBInstances"
        ]
        Resource = [aws_db_instance.dr_replica.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:UpdateAutoScalingGroup"
        ]
        Resource = [aws_autoscaling_group.dr.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets"
        ]
        Resource = ["arn:aws:route53:::hostedzone/${aws_route53_zone.app.zone_id}"]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:GetChange"
        ]
        Resource = ["arn:aws:route53:::change/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [aws_sns_topic.dr_notifications.arn]
      }
    ]
  })
}
```

## Step 4: Optional DR Runbook (Step Functions)

If you want explicit sequencing and step-level visibility, model the same failover flow as a Step Functions state machine with task-specific Lambda functions.

```hcl
# Alternative: Step Functions state machine for ordered DR execution
resource "aws_sfn_state_machine" "dr_runbook" {
  name     = "dr-failover-runbook"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Automated DR Failover Runbook"
    StartAt = "NotifyStart"
    States = {
      NotifyStart = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.dr_notifications.arn
          Message  = "DR Failover initiated"
        }
        Next = "PromoteDatabase"
      }

      PromoteDatabase = {
        Type           = "Task"
        Resource       = aws_lambda_function.promote_db.arn
        TimeoutSeconds = 600
        Retry = [{
          ErrorEquals     = ["States.TaskFailed"]
          IntervalSeconds = 5
          MaxAttempts     = 3
          BackoffRate     = 2.0
        }]
        Next = "WaitForDatabasePromotion"
      }

      WaitForDatabasePromotion = {
        Type    = "Wait"
        Seconds = 120
        Next    = "ScaleApplicationTier"
      }

      ScaleApplicationTier = {
        Type     = "Task"
        Resource = aws_lambda_function.scale_asg.arn
        Retry = [{
          ErrorEquals     = ["States.TaskFailed"]
          IntervalSeconds = 5
          MaxAttempts     = 3
          BackoffRate     = 2.0
        }]
        Next = "SwitchDNS"
      }

      SwitchDNS = {
        Type     = "Task"
        Resource = aws_lambda_function.switch_dns.arn
        Retry = [{
          ErrorEquals     = ["States.TaskFailed"]
          IntervalSeconds = 5
          MaxAttempts     = 3
          BackoffRate     = 2.0
        }]
        Next = "NotifyComplete"
      }

      NotifyComplete = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.dr_notifications.arn
          Message  = "DR Failover COMPLETE. Traffic now routing to DR region."
        }
        End = true
      }
    }
  })
}
```

## Summary

Automated DR failover configured with OpenTofu uses CloudWatch alarms to detect failures and SNS to trigger Lambda automation. If you want ordered orchestration for database promotion, application tier scaling, and DNS switching, the same failover flow can also be modeled in Step Functions. With explicit `Retry` blocks on the task states, the Step Functions runbook provides visibility into each step's status and repeatable handling for transient failures.
