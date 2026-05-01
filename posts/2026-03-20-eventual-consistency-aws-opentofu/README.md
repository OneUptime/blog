# How to Handle Eventual Consistency with AWS Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Eventual Consistency, AWS, IAM, Best Practice, Infrastructure as Code

Description: Learn how to handle AWS eventual consistency issues in OpenTofu where resources appear created but aren't immediately available for subsequent operations.

## Introduction

Some AWS control plane APIs are eventually consistent. IAM changes are not always immediately visible across AWS endpoints, and the Amazon EC2 API documents eventual consistency for resources such as security groups. OpenTofu may receive success from the creation API but then fail on subsequent operations that depend on the resource being fully available.

## IAM Propagation Delay

IAM changes are not always immediately visible across AWS endpoints.

```hcl
resource "aws_iam_role" "lambda" {
  name = "${var.app_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Add explicit sleep to allow IAM to propagate before Lambda creation

resource "time_sleep" "iam_propagation" {
  depends_on = [aws_iam_role_policy_attachment.lambda_basic]

  create_duration = "10s"
}

resource "aws_lambda_function" "app" {
  depends_on    = [time_sleep.iam_propagation]
  function_name = "${var.app_name}-function"
  filename      = "build/function.zip"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda.arn
}
```

## S3 Object Consistency

Amazon S3 object operations are strongly consistent. For normal object PUT, GET, and LIST workflows, adding `time_sleep` to work around a read-after-write delay is unnecessary.

## Using the time Provider

```hcl
terraform {
  required_providers {
    time = {
      source  = "hashicorp/time"
      version = "~> 0.13"
    }
  }
}
```

## Retry Logic with terraform_data

For critical operations, prefer polling until the resource is actually available.

```hcl
resource "terraform_data" "verify_iam_ready" {
  depends_on = [aws_iam_role.app]

  triggers_replace = [aws_iam_role.app.arn]

  provisioner "local-exec" {
    command = "aws iam wait role-exists --role-name ${aws_iam_role.app.name}"
  }
}
```

## CloudFront Deployment

```hcl
# CloudFront distributions can take several minutes to deploy
resource "aws_cloudfront_distribution" "main" {
  # ...
  wait_for_deployment = true
}
```

Route 53 record propagation is a separate step. If a downstream operation depends on the DNS change itself, verify that change with Route 53 rather than adding an arbitrary sleep after the CloudFront distribution resource.

## Addressing Race Conditions in Parallel Creates

```hcl
# When creating many resources that all need the same IAM role,
# use depends_on to avoid race conditions
locals {
  iam_role_arn = aws_iam_role.shared.arn
}

resource "time_sleep" "shared_iam_ready" {
  depends_on      = [aws_iam_role.shared]
  create_duration = "15s"
}

# All Lambda functions wait for IAM to be ready
resource "aws_lambda_function" "functions" {
  for_each      = var.functions
  depends_on    = [time_sleep.shared_iam_ready]
  function_name = "${var.app_name}-${each.key}"
  filename      = each.value.filename
  handler       = each.value.handler
  runtime       = each.value.runtime
  role          = local.iam_role_arn
}
```

## Summary

AWS eventual consistency shows up most often in control plane operations such as IAM and parts of EC2. The `time_sleep` resource from the HashiCorp time provider adds deterministic waits when a provider does not model the dependency, while `terraform_data` with polling or CLI waiters can verify that a resource is actually visible before downstream operations depend on it. Not every AWS service fits this pattern: Amazon S3 object operations are strongly consistent.
