# How to Deploy AWS Step Functions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Step Functions, Serverless, Workflow

Description: Learn how to define and deploy AWS Step Functions state machines with OpenTofu for orchestrating serverless workflows and Lambda function chains.

## Introduction

AWS Step Functions orchestrates Lambda functions, ECS tasks, and other AWS services into visual workflows. OpenTofu manages the state machine definition, IAM roles, logging, and CloudWatch integration as code.

## IAM Role for State Machine

```hcl
resource "aws_iam_role" "step_functions" {
  name = "${var.name}-sfn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "step_functions" {
  name = "${var.name}-sfn-policy"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = [
          aws_lambda_function.validate.arn,
          aws_lambda_function.payment.arn,
          aws_lambda_function.notify.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogDelivery",
          "logs:CreateLogStream",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutLogEvents",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## State Machine Definition

```hcl
resource "aws_cloudwatch_log_group" "sfn" {
  name              = "/aws/states/${var.name}"
  retention_in_days = 30
}

resource "aws_sfn_state_machine" "order_processing" {
  name     = "${var.name}-order-processing"
  role_arn = aws_iam_role.step_functions.arn
  type     = "STANDARD"  # or "EXPRESS" for high-volume, short-duration workflows

  # State machine definition in Amazon States Language (ASL)
  definition = jsonencode({
    Comment = "Order processing workflow"
    StartAt = "ValidateOrder"
    States = {
      ValidateOrder = {
        Type     = "Task"
        Resource = aws_lambda_function.validate.arn
        Next     = "ProcessPayment"
        Catch = [{
          ErrorEquals = ["ValidationError"]
          Next        = "HandleValidationError"
        }]
      }
      ProcessPayment = {
        Type     = "Task"
        Resource = aws_lambda_function.payment.arn
        Next     = "SendConfirmation"
        Retry = [{
          ErrorEquals  = ["States.TaskFailed"]
          IntervalSeconds = 2
          MaxAttempts  = 3
          BackoffRate  = 2
        }]
      }
      SendConfirmation = {
        Type     = "Task"
        Resource = aws_lambda_function.notify.arn
        End      = true
      }
      HandleValidationError = {
        Type = "Fail"
        Error = "ValidationFailed"
        Cause = "Order failed validation"
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  tags = { Name = "${var.name}-order-processing" }
}
```

## EventBridge Trigger

```hcl
resource "aws_cloudwatch_event_rule" "start_workflow" {
  name           = "${var.name}-trigger"
  event_bus_name = "default"

  event_pattern = jsonencode({
    source      = ["myapp.orders"]
    detail-type = ["OrderCreated"]
  })
}

resource "aws_iam_role" "eventbridge_sfn" {
  name = "${var.name}-eventbridge-sfn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "eventbridge_sfn" {
  name = "${var.name}-eventbridge-sfn-policy"
  role = aws_iam_role.eventbridge_sfn.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["states:StartExecution"]
      Resource = aws_sfn_state_machine.order_processing.arn
    }]
  })
}

resource "aws_cloudwatch_event_target" "sfn" {
  rule      = aws_cloudwatch_event_rule.start_workflow.name
  arn       = aws_sfn_state_machine.order_processing.arn
  role_arn  = aws_iam_role.eventbridge_sfn.arn
}
```

## Outputs

```hcl
output "state_machine_arn" { value = aws_sfn_state_machine.order_processing.arn }
output "state_machine_name" { value = aws_sfn_state_machine.order_processing.name }
```

## Conclusion

Step Functions defined in OpenTofu give you a reproducible, version-controlled workflow orchestration layer. Use `STANDARD` workflows for long-running processes with audit history, and `EXPRESS` workflows for high-volume, short-duration event processing.
