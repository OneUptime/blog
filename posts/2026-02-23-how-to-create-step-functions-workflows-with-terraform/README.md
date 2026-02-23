# How to Create Step Functions Workflows with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Step Functions, Serverless, Workflow, Orchestration

Description: Learn how to create AWS Step Functions state machines with Terraform to orchestrate complex serverless workflows, including error handling and parallel execution.

---

AWS Step Functions is a serverless orchestration service that lets you coordinate multiple AWS services into serverless workflows. These workflows are defined as state machines using the Amazon States Language (ASL). Managing Step Functions with Terraform brings the full power of infrastructure as code to your workflow definitions, making them versionable, testable, and reproducible.

This guide walks through creating Step Functions workflows with Terraform, covering everything from simple sequential flows to complex parallel processing patterns with error handling.

## Setting Up the Foundation

Start by creating the IAM role that Step Functions needs to invoke other AWS services:

```hcl
# IAM role for Step Functions state machine
resource "aws_iam_role" "step_functions_role" {
  name = "step-functions-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })
}

# Policy allowing Step Functions to invoke Lambda functions
resource "aws_iam_role_policy" "step_functions_lambda" {
  name = "step-functions-lambda-policy"
  role = aws_iam_role.step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "*"
      }
    ]
  })
}

# Policy for CloudWatch Logs
resource "aws_iam_role_policy" "step_functions_logs" {
  name = "step-functions-logs-policy"
  role = aws_iam_role.step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
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

## Creating Lambda Functions for the Workflow

Define the Lambda functions that the Step Functions workflow will orchestrate:

```hcl
# Lambda function for order validation
resource "aws_lambda_function" "validate_order" {
  filename         = data.archive_file.validate_order.output_path
  function_name    = "validate-order"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.validate_order.output_base64sha256
}

# Lambda function for payment processing
resource "aws_lambda_function" "process_payment" {
  filename         = data.archive_file.process_payment.output_path
  function_name    = "process-payment"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.process_payment.output_base64sha256
}

# Lambda function for sending notifications
resource "aws_lambda_function" "send_notification" {
  filename         = data.archive_file.send_notification.output_path
  function_name    = "send-notification"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.send_notification.output_base64sha256
}
```

## Creating a Basic State Machine

Define a Step Functions state machine for an order processing workflow:

```hcl
# Step Functions state machine for order processing
resource "aws_sfn_state_machine" "order_processing" {
  name     = "order-processing-workflow"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    Comment = "Order processing workflow"
    StartAt = "ValidateOrder"
    States = {
      # Step 1: Validate the order
      ValidateOrder = {
        Type     = "Task"
        Resource = aws_lambda_function.validate_order.arn
        Next     = "ProcessPayment"
        Catch = [
          {
            ErrorEquals = ["ValidationError"]
            Next        = "OrderFailed"
            ResultPath  = "$.error"
          }
        ]
      }

      # Step 2: Process payment
      ProcessPayment = {
        Type     = "Task"
        Resource = aws_lambda_function.process_payment.arn
        Next     = "SendConfirmation"
        Retry = [
          {
            ErrorEquals     = ["PaymentServiceUnavailable"]
            IntervalSeconds = 5
            MaxAttempts     = 3
            BackoffRate     = 2.0
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next        = "OrderFailed"
            ResultPath  = "$.error"
          }
        ]
      }

      # Step 3: Send confirmation notification
      SendConfirmation = {
        Type     = "Task"
        Resource = aws_lambda_function.send_notification.arn
        End      = true
      }

      # Failure handler
      OrderFailed = {
        Type  = "Fail"
        Error = "OrderProcessingFailed"
        Cause = "Order processing encountered an error"
      }
    }
  })

  # Enable logging
  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.step_functions.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }
}

# CloudWatch Log Group for Step Functions
resource "aws_cloudwatch_log_group" "step_functions" {
  name              = "/aws/stepfunctions/order-processing"
  retention_in_days = 30
}
```

## Parallel Execution Pattern

Create workflows with parallel branches for tasks that can run simultaneously:

```hcl
# State machine with parallel execution
resource "aws_sfn_state_machine" "parallel_processing" {
  name     = "parallel-processing-workflow"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    Comment = "Parallel processing workflow"
    StartAt = "ProcessInParallel"
    States = {
      ProcessInParallel = {
        Type = "Parallel"
        Branches = [
          {
            # Branch 1: Generate report
            StartAt = "GenerateReport"
            States = {
              GenerateReport = {
                Type     = "Task"
                Resource = aws_lambda_function.generate_report.arn
                End      = true
              }
            }
          },
          {
            # Branch 2: Update analytics
            StartAt = "UpdateAnalytics"
            States = {
              UpdateAnalytics = {
                Type     = "Task"
                Resource = aws_lambda_function.update_analytics.arn
                End      = true
              }
            }
          },
          {
            # Branch 3: Send notifications
            StartAt = "NotifyStakeholders"
            States = {
              NotifyStakeholders = {
                Type     = "Task"
                Resource = aws_lambda_function.send_notification.arn
                End      = true
              }
            }
          }
        ]
        Next = "AggregateResults"
      }

      AggregateResults = {
        Type     = "Task"
        Resource = aws_lambda_function.aggregate.arn
        End      = true
      }
    }
  })
}
```

## Map State for Dynamic Iteration

Use the Map state to process items in a collection:

```hcl
# State machine using Map state for batch processing
resource "aws_sfn_state_machine" "batch_processor" {
  name     = "batch-processor-workflow"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    Comment = "Batch processing with Map state"
    StartAt = "GetItems"
    States = {
      GetItems = {
        Type     = "Task"
        Resource = aws_lambda_function.get_items.arn
        Next     = "ProcessItems"
      }

      # Map state processes each item independently
      ProcessItems = {
        Type           = "Map"
        ItemsPath      = "$.items"
        MaxConcurrency = 10  # Process up to 10 items at a time
        Iterator = {
          StartAt = "ProcessSingleItem"
          States = {
            ProcessSingleItem = {
              Type     = "Task"
              Resource = aws_lambda_function.process_item.arn
              Next     = "ValidateResult"
              Retry = [
                {
                  ErrorEquals     = ["States.TaskFailed"]
                  IntervalSeconds = 2
                  MaxAttempts     = 2
                  BackoffRate     = 2.0
                }
              ]
            }
            ValidateResult = {
              Type     = "Task"
              Resource = aws_lambda_function.validate_result.arn
              End      = true
            }
          }
        }
        Next = "Summarize"
      }

      Summarize = {
        Type     = "Task"
        Resource = aws_lambda_function.summarize.arn
        End      = true
      }
    }
  })
}
```

## Express Workflows for High-Volume Processing

For high-volume, short-duration workflows, use Express type:

```hcl
# Express workflow for real-time data processing
resource "aws_sfn_state_machine" "express_workflow" {
  name     = "real-time-processor"
  role_arn = aws_iam_role.step_functions_role.arn
  type     = "EXPRESS"  # Express workflows for high volume

  definition = jsonencode({
    Comment = "Express workflow for real-time event processing"
    StartAt = "TransformData"
    States = {
      TransformData = {
        Type     = "Task"
        Resource = aws_lambda_function.transform.arn
        Next     = "RouteEvent"
      }

      RouteEvent = {
        Type = "Choice"
        Choices = [
          {
            Variable     = "$.eventType"
            StringEquals = "critical"
            Next         = "ProcessCritical"
          },
          {
            Variable     = "$.eventType"
            StringEquals = "standard"
            Next         = "ProcessStandard"
          }
        ]
        Default = "ProcessStandard"
      }

      ProcessCritical = {
        Type     = "Task"
        Resource = aws_lambda_function.process_critical.arn
        End      = true
      }

      ProcessStandard = {
        Type     = "Task"
        Resource = aws_lambda_function.process_standard.arn
        End      = true
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.express_workflow.arn}:*"
    include_execution_data = true
    level                  = "ERROR"  # Only log errors for Express workflows
  }
}
```

## Triggering State Machines

Set up triggers to start your workflows:

```hcl
# API Gateway trigger for the state machine
resource "aws_api_gateway_rest_api" "workflow_api" {
  name = "workflow-trigger-api"
}

# EventBridge rule to trigger the workflow
resource "aws_cloudwatch_event_rule" "trigger_workflow" {
  name        = "trigger-order-processing"
  description = "Trigger order processing on new orders"

  event_pattern = jsonencode({
    source      = ["custom.orders"]
    detail-type = ["NewOrder"]
  })
}

resource "aws_cloudwatch_event_target" "step_function" {
  rule      = aws_cloudwatch_event_rule.trigger_workflow.name
  target_id = "TriggerStepFunction"
  arn       = aws_sfn_state_machine.order_processing.arn
  role_arn  = aws_iam_role.eventbridge_sfn_role.arn
}
```

## Monitoring with OneUptime

Step Functions workflows can involve many moving parts. OneUptime helps you monitor the overall health of your workflows, track execution times, and alert on failures. With OneUptime, you can set up dashboards that show workflow success rates, step-level latency, and error patterns. Visit [OneUptime](https://oneuptime.com) to monitor your Step Functions deployments.

## Conclusion

AWS Step Functions with Terraform provides a robust framework for building complex serverless workflows. By defining your state machines in Terraform, you get version control, code review, and reproducible deployments. The key patterns to master are sequential task chaining with error handling, parallel execution for independent tasks, Map state for dynamic iteration, and Choice state for conditional routing. Express workflows handle high-volume scenarios, while Standard workflows are ideal for long-running processes. Combining these patterns gives you the flexibility to orchestrate virtually any workflow in a fully serverless manner.

For more serverless patterns, check out [How to Create Serverless Data Processing Pipeline with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-data-processing-pipeline-with-terraform/view) and [How to Create EventBridge Pipes with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-eventbridge-pipes-with-terraform/view).
