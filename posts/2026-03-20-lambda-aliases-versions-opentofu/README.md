# How to Set Up Lambda Aliases and Versions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Version, Alias, Blue-Green Deployment, Infrastructure as Code

Description: Learn how to manage Lambda function versions and aliases with OpenTofu to enable blue-green deployments, canary releases, and stable API endpoints for Lambda functions.

## Introduction

Lambda versions are immutable snapshots of a function's code and configuration. Aliases are named pointers to specific versions that can be updated without changing the calling code. Together they enable deployment patterns like blue-green, canary releases, and traffic shifting.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured for OpenTofu

## Step 1: Create a Lambda Function with Publishing Enabled

```hcl
resource "aws_lambda_function" "app" {
  function_name    = "versioned-app"
  role             = var.lambda_role_arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  memory_size      = 512

  # publish = true publishes a new immutable version when code or
  # versioned configuration changes
  publish = true

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}
```

## Step 2: Create Stable Aliases

```hcl
# Production alias pointing to a specific stable version

resource "aws_lambda_alias" "production" {
  name             = "production"
  function_name    = aws_lambda_function.app.function_name
  function_version = var.production_version  # e.g., "5"
  description      = "Stable production traffic"
}

# Staging alias always pointing to the latest version
resource "aws_lambda_alias" "staging" {
  name             = "staging"
  function_name    = aws_lambda_function.app.function_name
  function_version = aws_lambda_function.app.version  # Latest published
  description      = "Staging environment - latest version"
}
```

## Step 3: Configure Traffic Shifting for Canary Deployments

```hcl
# Add this block inside aws_lambda_alias.production to route
# 10% of traffic to the new published version
routing_config {
  additional_version_weights = {
    "${var.new_version}" = 0.1  # 10% to new version
  }
  # The remaining 90% goes to function_version
}
```

## Step 4: Lock Down Alias with Permissions

```hcl
# Grant API Gateway permission to invoke the production alias only
resource "aws_lambda_permission" "production_invoke" {
  statement_id  = "AllowAPIGatewayProductionAlias"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app.function_name
  qualifier     = aws_lambda_alias.production.name  # Restrict to alias
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
```

## Step 5: Reference Alias in API Gateway Integration

```hcl
# API Gateway integrates with the alias, not the function directly
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.api.id
  http_method             = "POST"
  integration_http_method = "POST"
  type                    = "AWS_PROXY"

  # Use the alias ARN to always invoke the correct version
  uri = aws_lambda_alias.production.invoke_arn
}
```

## Step 6: Implement a Blue-Green Cutover

```hcl
# Variable to control which version is "live"
variable "production_version" {
  description = "Published Lambda version to point production alias to"
  type        = string
  default     = "1"
}

# To promote a new version to production:
# 1. Set production_version = "new-version-number"
# 2. Run tofu apply
# The production alias updates instantly with zero downtime
```

## Step 7: Deploy

```bash
# Initial deployment
tofu init && tofu apply

# Deploy updated code or versioned config and test in staging first
tofu apply  # New version published, staging alias updates automatically

# Promote to production after validation
tofu apply -var="production_version=6"
```

## Conclusion

Lambda versions and aliases enable safe, controlled deployments. Use aliases for stable endpoint identifiers in API Gateway and event source mappings, then update the alias target to shift traffic. The traffic weighting in routing_config enables gradual canary deployments-increase the new version's weight incrementally while monitoring error rates before completing the cutover.
