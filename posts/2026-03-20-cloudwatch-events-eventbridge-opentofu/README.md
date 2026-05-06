# How to Configure CloudWatch Events and EventBridge with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EventBridge, CloudWatch Events, Infrastructure as Code, Serverless

Description: Learn how to create EventBridge rules and targets using OpenTofu to trigger Lambda functions and other services on a schedule or event pattern.

---

Amazon EventBridge (formerly CloudWatch Events) provides event-driven automation. OpenTofu lets you define rules, targets, and permissions as code, enabling reproducible event-driven architectures.

---

## Create a Scheduled Rule

Scheduled EventBridge rules still work, but AWS treats them as a legacy feature, recommends EventBridge Scheduler for new scheduled workloads, and only supports scheduled rules on the default event bus.

```hcl
resource "aws_cloudwatch_event_rule" "daily_cleanup" {
  name                = "daily-cleanup"
  description         = "Trigger cleanup Lambda every day at midnight UTC"
  schedule_expression = "cron(0 0 * * ? *)"
}
```

---

## Create an Event Pattern Rule

```hcl
resource "aws_cloudwatch_event_rule" "ec2_state_change" {
  name        = "ec2-state-change"
  description = "Trigger on EC2 instance state changes"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Instance State-change Notification"]
    detail = {
      state = ["stopped", "terminated"]
    }
  })
}
```

---

## Set a Lambda Function as the Target

```hcl
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_cleanup.name
  target_id = "CleanupLambda"
  arn       = aws_lambda_function.cleanup.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cleanup.arn
}
```

---

## Target an SQS Queue

```hcl
resource "aws_cloudwatch_event_target" "sqs_target" {
  rule      = aws_cloudwatch_event_rule.ec2_state_change.name
  target_id = "EC2EventsQueue"
  arn       = aws_sqs_queue.ec2_events.arn
}

resource "aws_sqs_queue_policy" "eventbridge" {
  queue_url = aws_sqs_queue.ec2_events.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.ec2_events.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_cloudwatch_event_rule.ec2_state_change.arn
        }
      }
    }]
  })
}
```

---

## Custom EventBridge Bus

```hcl
resource "aws_cloudwatch_event_bus" "app" {
  name = "my-app-events"
}

resource "aws_cloudwatch_event_rule" "app_order" {
  name           = "app-order-created"
  event_bus_name = aws_cloudwatch_event_bus.app.name

  event_pattern = jsonencode({
    source      = ["my-app"]
    detail-type = ["OrderCreated"]
  })
}
```

---

## Summary

Create `aws_cloudwatch_event_rule` resources with either a `schedule_expression` for legacy cron/rate triggers on the default event bus or an `event_pattern` for service events. For new scheduled workloads, AWS recommends EventBridge Scheduler. Attach targets with `aws_cloudwatch_event_target` and grant invocation permissions with `aws_lambda_permission` or queue policies. Use custom event buses to decouple application event routing from AWS service events.
