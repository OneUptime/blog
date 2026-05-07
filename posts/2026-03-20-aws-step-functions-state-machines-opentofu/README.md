# How to Create AWS Step Functions State Machines with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Step Functions, Workflow, Serverless, Infrastructure as Code

Description: Learn how to create AWS Step Functions state machines for orchestrating Lambda functions and other services using OpenTofu.

## Introduction

AWS Step Functions orchestrate distributed applications and microservices as visual workflows. State machines define the steps, transitions, error handling, and retries. OpenTofu manages state machine definitions, IAM roles, and logging configuration as code.

## IAM Role for Step Functions

```hcl
resource "aws_iam_role" "step_functions" {
  name = "${var.app_name}-sfn-role-${var.environment}"

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
  role = aws_iam_role.step_functions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["lambda:InvokeFunction"]
        Resource = [
          aws_lambda_function.validate_order.arn,
          aws_lambda_function.process_payment.arn,
          aws_lambda_function.send_confirmation.arn
        ]
      },
      {
        Effect   = "Allow"
        Action = [
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

## Standard State Machine

```hcl
resource "aws_sfn_state_machine" "order_processing" {
  name     = "${var.app_name}-order-processing-${var.environment}"
  role_arn = aws_iam_role.step_functions.arn
  type     = "STANDARD"  # or "EXPRESS" for high-throughput short-lived workflows

  # Amazon States Language (ASL) definition
  definition = jsonencode({
    Comment = "Order processing workflow"
    StartAt = "ValidateOrder"

    States = {
      ValidateOrder = {
        Type     = "Task"
        Resource = aws_lambda_function.validate_order.arn
        Next     = "ProcessPayment"
        Retry = [{
          ErrorEquals     = ["Lambda.ServiceException", "Lambda.TooManyRequestsException"]
          IntervalSeconds = 2
          MaxAttempts     = 3
          BackoffRate     = 2
        }]
        Catch = [{
          ErrorEquals = ["ValidationError"]
          Next        = "OrderFailed"
          ResultPath  = "$.error"
        }]
      }

      ProcessPayment = {
        Type     = "Task"
        Resource = aws_lambda_function.process_payment.arn
        Next     = "SendConfirmation"
      }

      SendConfirmation = {
        Type     = "Task"
        Resource = aws_lambda_function.send_confirmation.arn
        End      = true
      }

      OrderFailed = {
        Type  = "Fail"
        Error = "OrderFailed"
        Cause = "Order validation or payment failed"
      }
    }
  })

  logging_configuration {
    level                  = "ERROR"
    include_execution_data = true

    log_destination = "${aws_cloudwatch_log_group.sfn.arn}:*"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Parallel State Example

```hcl
# Snippet for a parallel execution state

# Add this as a state in the States object above
locals {
  parallel_state = {
    ParallelProcessing = {
      Type = "Parallel"
      Next = "AggregateResults"
      Branches = [
        {
          StartAt = "ProcessRegionA"
          States = {
            ProcessRegionA = {
              Type     = "Task"
              Resource = aws_lambda_function.process_region.arn
              End      = true
              Parameters = { "region.$" = "$.regionA" }
            }
          }
        },
        {
          StartAt = "ProcessRegionB"
          States = {
            ProcessRegionB = {
              Type     = "Task"
              Resource = aws_lambda_function.process_region.arn
              End      = true
              Parameters = { "region.$" = "$.regionB" }
            }
          }
        }
      ]
    }
  }
}
```

## Outputs

```hcl
output "state_machine_arn" {
  value = aws_sfn_state_machine.order_processing.arn
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS Step Functions provide visual, orchestrated workflows for distributed applications. OpenTofu manages state machine definitions, IAM roles, and logging configuration as code - making complex multi-step workflows reproducible and version controlled.
