# How to Create Step Functions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Step Functions, Serverless

Description: Learn how to create AWS Step Functions state machines using Terraform, with practical examples of workflows, error handling, parallel execution, and service integrations.

---

AWS Step Functions lets you coordinate multiple AWS services into serverless workflows. Instead of writing complex orchestration logic in your application code, you define it as a state machine. Each step can call a Lambda function, interact with DynamoDB, send an SQS message, or use dozens of other AWS services directly.

Terraform manages Step Functions state machines as code, making your workflows version-controlled and reproducible. Let's build some real workflows.

## Basic State Machine

A state machine needs an IAM role and a definition written in Amazon States Language (ASL). Let's start simple.

First, the IAM role that Step Functions assumes when executing your workflow:

```hcl
# IAM role for Step Functions
resource "aws_iam_role" "step_functions" {
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

# Allow Step Functions to invoke Lambda
resource "aws_iam_role_policy" "invoke_lambda" {
  name = "invoke-lambda"
  role = aws_iam_role.step_functions.id

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
```

Now create the state machine itself:

```hcl
# Simple state machine that processes an order
resource "aws_sfn_state_machine" "order_processor" {
  name     = "order-processor"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Order processing workflow"
    StartAt = "ValidateOrder"
    States = {
      ValidateOrder = {
        Type     = "Task"
        Resource = aws_lambda_function.validate_order.arn
        Next     = "ProcessPayment"
        Catch = [
          {
            ErrorEquals = ["ValidationError"]
            Next        = "OrderFailed"
          }
        ]
      }
      ProcessPayment = {
        Type     = "Task"
        Resource = aws_lambda_function.process_payment.arn
        Next     = "SendConfirmation"
        Retry = [
          {
            ErrorEquals     = ["PaymentServiceError"]
            IntervalSeconds = 5
            MaxAttempts     = 3
            BackoffRate     = 2.0
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next        = "OrderFailed"
          }
        ]
      }
      SendConfirmation = {
        Type     = "Task"
        Resource = aws_lambda_function.send_confirmation.arn
        End      = true
      }
      OrderFailed = {
        Type  = "Fail"
        Error = "OrderProcessingFailed"
        Cause = "Order could not be processed"
      }
    }
  })

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

This workflow validates an order, processes payment (with retries), and sends a confirmation. If anything goes wrong, it catches the error and transitions to a failure state.

## Express vs Standard Workflows

Step Functions offers two types:

- **Standard** - for long-running workflows (up to a year). Charges per state transition.
- **Express** - for high-volume, short-duration workflows (up to 5 minutes). Charges per execution.

Choose Express for high-throughput, short-lived workflows:

```hcl
# Express state machine for high-volume processing
resource "aws_sfn_state_machine" "data_transform" {
  name     = "data-transform-express"
  role_arn = aws_iam_role.step_functions.arn
  type     = "EXPRESS"  # Default is STANDARD

  definition = jsonencode({
    Comment = "Quick data transformation"
    StartAt = "Transform"
    States = {
      Transform = {
        Type     = "Task"
        Resource = aws_lambda_function.transform.arn
        End      = true
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn_logs.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }
}

resource "aws_cloudwatch_log_group" "sfn_logs" {
  name              = "/aws/stepfunctions/data-transform"
  retention_in_days = 14
}
```

Express workflows don't have the visual execution history that Standard workflows offer, so logging is essential for debugging.

## Parallel Execution

Step Functions can run multiple branches in parallel and wait for all of them to complete:

```hcl
# State machine with parallel branches
resource "aws_sfn_state_machine" "parallel_processing" {
  name     = "parallel-enrichment"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Enrich data from multiple sources in parallel"
    StartAt = "EnrichInParallel"
    States = {
      EnrichInParallel = {
        Type = "Parallel"
        Branches = [
          {
            StartAt = "FetchUserProfile"
            States = {
              FetchUserProfile = {
                Type     = "Task"
                Resource = aws_lambda_function.fetch_profile.arn
                End      = true
              }
            }
          },
          {
            StartAt = "FetchOrderHistory"
            States = {
              FetchOrderHistory = {
                Type     = "Task"
                Resource = aws_lambda_function.fetch_orders.arn
                End      = true
              }
            }
          },
          {
            StartAt = "CheckCreditScore"
            States = {
              CheckCreditScore = {
                Type     = "Task"
                Resource = aws_lambda_function.check_credit.arn
                End      = true
              }
            }
          }
        ]
        Next = "MergeResults"
      }
      MergeResults = {
        Type     = "Task"
        Resource = aws_lambda_function.merge_results.arn
        End      = true
      }
    }
  })
}
```

The parallel state runs all three branches simultaneously and collects the results into an array before passing them to `MergeResults`.

## Direct Service Integrations

Step Functions can call AWS services directly without going through Lambda. This reduces latency and cost.

This workflow writes to DynamoDB and sends an SQS message without any Lambda functions:

```hcl
# State machine using direct service integrations
resource "aws_sfn_state_machine" "direct_integration" {
  name     = "direct-service-workflow"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Workflow using direct AWS service integrations"
    StartAt = "SaveToDynamoDB"
    States = {
      SaveToDynamoDB = {
        Type     = "Task"
        Resource = "arn:aws:states:::dynamodb:putItem"
        Parameters = {
          TableName = "orders"
          Item = {
            "order_id"  = { "S.$" = "$.orderId" }
            "status"    = { "S" = "processing" }
            "timestamp" = { "S.$" = "$$.State.EnteredTime" }
          }
        }
        Next = "NotifyQueue"
      }
      NotifyQueue = {
        Type     = "Task"
        Resource = "arn:aws:states:::sqs:sendMessage"
        Parameters = {
          QueueUrl    = aws_sqs_queue.notifications.url
          MessageBody = {
            "orderId.$" = "$.orderId"
            "status"    = "processing"
          }
        }
        End = true
      }
    }
  })
}
```

You'll need to add the appropriate IAM permissions for DynamoDB and SQS to the Step Functions role.

## Map State for Dynamic Iteration

The Map state processes an array of items, either sequentially or in parallel:

```hcl
# State machine with Map state for batch processing
resource "aws_sfn_state_machine" "batch_processor" {
  name     = "batch-processor"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Process a batch of items"
    StartAt = "ProcessBatch"
    States = {
      ProcessBatch = {
        Type           = "Map"
        ItemsPath      = "$.items"
        MaxConcurrency = 10  # Process up to 10 items at once

        ItemProcessor = {
          ProcessorConfig = {
            Mode = "INLINE"
          }
          StartAt = "ProcessItem"
          States = {
            ProcessItem = {
              Type     = "Task"
              Resource = aws_lambda_function.process_item.arn
              End      = true
            }
          }
        }
        End = true
      }
    }
  })
}
```

## Wait States and Choice States

Wait states pause execution, and choice states branch based on conditions:

```hcl
# Workflow with wait and choice logic
resource "aws_sfn_state_machine" "approval_workflow" {
  name     = "approval-workflow"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Approval workflow with timeout"
    StartAt = "SubmitForApproval"
    States = {
      SubmitForApproval = {
        Type     = "Task"
        Resource = aws_lambda_function.submit_approval.arn
        Next     = "WaitForApproval"
      }
      WaitForApproval = {
        Type    = "Wait"
        Seconds = 3600  # Wait 1 hour
        Next    = "CheckApprovalStatus"
      }
      CheckApprovalStatus = {
        Type     = "Task"
        Resource = aws_lambda_function.check_status.arn
        Next     = "IsApproved"
      }
      IsApproved = {
        Type = "Choice"
        Choices = [
          {
            Variable     = "$.status"
            StringEquals = "approved"
            Next         = "ExecuteAction"
          },
          {
            Variable     = "$.status"
            StringEquals = "rejected"
            Next         = "NotifyRejection"
          }
        ]
        Default = "WaitForApproval"  # Still pending, wait again
      }
      ExecuteAction = {
        Type     = "Task"
        Resource = aws_lambda_function.execute_action.arn
        End      = true
      }
      NotifyRejection = {
        Type     = "Task"
        Resource = aws_lambda_function.notify_rejection.arn
        End      = true
      }
    }
  })
}
```

## EventBridge Trigger

Start a state machine automatically from EventBridge events:

```hcl
# Trigger state machine from EventBridge
resource "aws_cloudwatch_event_rule" "trigger" {
  name        = "trigger-order-processor"
  description = "Start order processing workflow"

  event_pattern = jsonencode({
    source      = ["custom.orders"]
    detail-type = ["OrderCreated"]
  })
}

resource "aws_cloudwatch_event_target" "sfn" {
  rule     = aws_cloudwatch_event_rule.trigger.name
  arn      = aws_sfn_state_machine.order_processor.arn
  role_arn = aws_iam_role.eventbridge_sfn.arn
}
```

## Wrapping Up

Step Functions brings order to complex workflows. Instead of building orchestration logic into your application, you declare it in a state machine. Terraform makes these workflows reproducible and reviewable. Start with a simple sequence of Lambda calls, then add error handling, parallel execution, and direct service integrations as your workflow grows. The visual debugging in the AWS console is also incredibly helpful - you can see exactly where each execution succeeded or failed.
