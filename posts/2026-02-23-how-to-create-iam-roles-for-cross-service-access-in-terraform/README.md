# How to Create IAM Roles for Cross-Service Access in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Cross-Service, Security, Infrastructure as Code

Description: Learn how to create IAM roles that enable AWS services to access other services on your behalf, with proper trust policies and scoped permissions.

---

Many AWS architectures require services to interact with each other. Lambda functions read from S3 and write to DynamoDB. ECS tasks pull images from ECR and send logs to CloudWatch. API Gateway invokes Lambda functions. EventBridge triggers Step Functions. Each of these interactions requires an IAM role that allows one service to access another service on your behalf.

This guide covers how to create IAM roles for cross-service access patterns in Terraform, including service-to-service trust policies, the PassRole permission, and common multi-service architectures.

## Understanding Cross-Service Access

When an AWS service needs to perform actions on your behalf, it assumes an IAM role. The role has:

1. **A trust policy** that allows the specific AWS service to assume it.
2. **Permission policies** that define what other services the role can access.

The service uses `sts:AssumeRole` internally to get temporary credentials, then uses those credentials to make API calls to other services.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- AWS CLI configured with valid credentials

## API Gateway to Lambda

API Gateway needs permission to invoke Lambda functions.

```hcl
# Trust policy for API Gateway
data "aws_iam_policy_document" "apigateway_trust" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

# Role for API Gateway
resource "aws_iam_role" "apigateway_role" {
  name               = "apigateway-lambda-invoke-role"
  assume_role_policy = data.aws_iam_policy_document.apigateway_trust.json
}

# Policy allowing API Gateway to invoke specific Lambda functions
resource "aws_iam_role_policy" "apigateway_lambda" {
  name = "invoke-lambda"
  role = aws_iam_role.apigateway_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = [
        "arn:aws:lambda:us-east-1:*:function:api-*",
      ]
    }]
  })
}
```

## EventBridge to Step Functions

EventBridge rules can trigger Step Functions state machines.

```hcl
# Trust policy for EventBridge
data "aws_iam_policy_document" "events_trust" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

# Role for EventBridge
resource "aws_iam_role" "events_sfn_role" {
  name               = "eventbridge-step-functions-role"
  assume_role_policy = data.aws_iam_policy_document.events_trust.json
}

# Policy allowing EventBridge to start Step Functions executions
resource "aws_iam_role_policy" "events_sfn" {
  name = "start-step-functions"
  role = aws_iam_role.events_sfn_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "states:StartExecution"
      Resource = "arn:aws:states:us-east-1:*:stateMachine:order-processing"
    }]
  })
}

# EventBridge rule using the role
resource "aws_cloudwatch_event_rule" "order_created" {
  name        = "order-created"
  description = "Trigger processing when a new order is created"

  event_pattern = jsonencode({
    source      = ["app.orders"]
    detail-type = ["OrderCreated"]
  })
}

resource "aws_cloudwatch_event_target" "sfn_target" {
  rule     = aws_cloudwatch_event_rule.order_created.name
  arn      = "arn:aws:states:us-east-1:123456789012:stateMachine:order-processing"
  role_arn = aws_iam_role.events_sfn_role.arn
}
```

## Step Functions to Multiple Services

Step Functions state machines often orchestrate multiple services.

```hcl
# Trust policy for Step Functions
data "aws_iam_policy_document" "sfn_trust" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

# Role for Step Functions
resource "aws_iam_role" "sfn_role" {
  name               = "step-functions-orchestrator"
  assume_role_policy = data.aws_iam_policy_document.sfn_trust.json
}

# Comprehensive policy for a Step Functions workflow
resource "aws_iam_policy" "sfn_policy" {
  name = "sfn-orchestrator-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Invoke Lambda functions
        Sid    = "InvokeLambda"
        Effect = "Allow"
        Action = "lambda:InvokeFunction"
        Resource = [
          "arn:aws:lambda:us-east-1:*:function:validate-order",
          "arn:aws:lambda:us-east-1:*:function:process-payment",
          "arn:aws:lambda:us-east-1:*:function:send-notification",
        ]
      },
      {
        # Write to DynamoDB
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/orders"
      },
      {
        # Send messages to SQS
        Sid    = "SQSSend"
        Effect = "Allow"
        Action = "sqs:SendMessage"
        Resource = "arn:aws:sqs:us-east-1:*:fulfillment-queue"
      },
      {
        # Publish to SNS
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = "sns:Publish"
        Resource = "arn:aws:sns:us-east-1:*:order-notifications"
      },
      {
        # CloudWatch Logs for execution history
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sfn_policy" {
  role       = aws_iam_role.sfn_role.name
  policy_arn = aws_iam_policy.sfn_policy.arn
}
```

## S3 Event Notifications to Lambda

S3 can trigger Lambda functions on object events.

```hcl
# Lambda execution role with S3 read access
resource "aws_iam_role" "s3_trigger_lambda" {
  name = "s3-trigger-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "s3_lambda_policy" {
  name = "s3-triggered-lambda-permissions"
  role = aws_iam_role.s3_trigger_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Read the uploaded object
        Effect = "Allow"
        Action = [
          "s3:GetObject",
        ]
        Resource = "arn:aws:s3:::uploads-bucket/*"
      },
      {
        # Write processed results
        Effect = "Allow"
        Action = [
          "s3:PutObject",
        ]
        Resource = "arn:aws:s3:::processed-bucket/*"
      },
      {
        # Write logs
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
```

## Understanding iam:PassRole

The `iam:PassRole` permission is required when you configure a service to use a role. For example, when you create a Lambda function and specify its execution role, you need `iam:PassRole` on that role.

```hcl
# Policy that allows passing roles to specific services
resource "aws_iam_policy" "pass_role" {
  name = "pass-role-to-services"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PassRoleToLambda"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "arn:aws:iam::*:role/lambda-*"
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "lambda.amazonaws.com"
          }
        }
      },
      {
        Sid    = "PassRoleToECS"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "arn:aws:iam::*:role/ecs-*"
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
      {
        Sid    = "PassRoleToStepFunctions"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "arn:aws:iam::*:role/sfn-*"
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "states.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

## Multi-Service Architecture Module

For complex architectures, create a module that sets up cross-service roles.

```hcl
variable "service_integrations" {
  type = map(object({
    source_service = string
    target_actions = map(list(string))  # service -> actions
    target_resources = map(list(string))  # service -> resources
  }))
  default = {
    event_processor = {
      source_service = "events.amazonaws.com"
      target_actions = {
        lambda = ["lambda:InvokeFunction"]
        sqs    = ["sqs:SendMessage"]
      }
      target_resources = {
        lambda = ["arn:aws:lambda:us-east-1:*:function:event-*"]
        sqs    = ["arn:aws:sqs:us-east-1:*:event-*"]
      }
    }
  }
}

# Create trust policies
data "aws_iam_policy_document" "service_trusts" {
  for_each = var.service_integrations

  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = [each.value.source_service]
    }
    actions = ["sts:AssumeRole"]
  }
}

# Create roles
resource "aws_iam_role" "service_roles" {
  for_each = var.service_integrations

  name               = "${each.key}-service-role"
  assume_role_policy = data.aws_iam_policy_document.service_trusts[each.key].json
}

# Create permission policies
resource "aws_iam_role_policy" "service_permissions" {
  for_each = var.service_integrations

  name = "${each.key}-permissions"
  role = aws_iam_role.service_roles[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      for service, actions in each.value.target_actions : {
        Sid      = "Allow${title(service)}"
        Effect   = "Allow"
        Action   = actions
        Resource = each.value.target_resources[service]
      }
    ]
  })
}
```

## Best Practices

1. **Scope trust to specific services.** Never use a wildcard service principal.
2. **Limit resource access.** Only grant access to the specific resources the service integration needs.
3. **Use iam:PassRole conditions.** Restrict which services a role can be passed to.
4. **Document the integration flow.** Add comments or tags explaining which services interact.
5. **Test thoroughly.** Cross-service access failures can be hard to diagnose. Test each integration individually.

For related topics, see [How to Create IAM Roles for Lambda Functions in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-lambda-functions-in-terraform/view) and [How to Create IAM Roles for ECS Tasks in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-ecs-tasks-in-terraform/view).

## Conclusion

Cross-service IAM roles are the glue that holds AWS architectures together. Every service-to-service interaction requires a properly configured role with the right trust policy and scoped permissions. Terraform lets you manage all of these roles in one place, making it easy to see the complete picture of how your services interact. By following the principle of least privilege and using the `iam:PassRole` condition to restrict service associations, you can build secure, well-organized architectures that scale with your application needs.
