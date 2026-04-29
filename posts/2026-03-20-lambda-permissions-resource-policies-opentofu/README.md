# How to Set Up Lambda Permissions and Resource Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Resource Policy, IAM, Cross-Account, Infrastructure as Code

Description: Learn how to configure Lambda resource-based policies using OpenTofu to grant other AWS services, accounts, and organizations permission to invoke Lambda functions.

## Introduction

Lambda resource-based policies (function policies) control which principals can invoke a Lambda function. Unlike IAM identity policies attached to roles, resource policies are attached directly to the Lambda function and support cross-account and service-level permissions.

## Prerequisites

- OpenTofu v1.6+
- An existing Lambda function
- AWS credentials with Lambda permissions

## Step 1: Allow API Gateway to Invoke Lambda

```hcl
# Grant API Gateway permission to invoke the Lambda function

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"

  # Restrict to a specific API; narrow the suffix further if you want to
  # limit invocation to particular stages, methods, or resources
  # Format: arn:aws:execute-api:region:account-id:api-id/stage/method/resource
  source_arn = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
```

## Step 2: Allow S3 Event Notifications to Invoke Lambda

```hcl
# Grant S3 permission to trigger the Lambda function
resource "aws_lambda_permission" "s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.s3_processor.function_name
  principal     = "s3.amazonaws.com"

  # Restrict to a specific bucket to prevent confused deputy attacks
  source_arn     = aws_s3_bucket.data.arn
  source_account = data.aws_caller_identity.current.account_id
}

# Configure S3 to send event notifications to Lambda
resource "aws_s3_bucket_notification" "to_lambda" {
  bucket = aws_s3_bucket.data.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.s3_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".csv"
  }

  depends_on = [aws_lambda_permission.s3]
}
```

## Step 3: Allow CloudWatch Events (EventBridge) to Invoke Lambda

```hcl
resource "aws_lambda_permission" "events" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}
```

## Step 4: Allow Cross-Account Invocation

```hcl
# Grant another AWS account permission to invoke this function
resource "aws_lambda_permission" "cross_account" {
  statement_id  = "AllowCrossAccountInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.shared_service.function_name
  principal     = var.trusted_account_id  # The account ID to grant access

  # Optional: restrict to a specific principal in the other account
  # principal     = "arn:aws:iam::${var.trusted_account_id}:role/invoker-role"
}
```

## Step 5: Allow Organization-Wide Invocation

```hcl
# Grant all accounts in an AWS Organization permission to invoke
resource "aws_lambda_permission" "org_invoke" {
  statement_id  = "AllowOrgInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.shared_service.function_name
  principal     = "*"

  # Restrict to accounts within the organization
  principal_org_id = var.aws_organization_id
}
```

## Step 6: View and Manage the Resource Policy

The AWS provider's `aws_lambda_function` data source does not expose the full Lambda resource-based policy, so use the AWS CLI to retrieve it:

```bash
# Retrieve the function policy via AWS CLI
aws lambda get-policy \
  --function-name my-function \
  --region us-east-1
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Lambda resource-based policies enable fine-grained control over who can invoke your functions. Always use `source_arn` when granting S3 or EventBridge permissions to prevent confused deputy attacks where one service impersonates another. For cross-account access, resource policies must be combined with identity policies in the calling account; both must allow the invocation.
