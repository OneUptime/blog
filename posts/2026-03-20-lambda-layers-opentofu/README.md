# How to Create Lambda Layers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Layer, Dependencies, Serverless, Infrastructure as Code

Description: Learn how to create and manage AWS Lambda Layers with OpenTofu to share common dependencies, libraries, and configuration across multiple Lambda functions.

## Introduction

Lambda Layers let you package dependencies, libraries, and shared code separately from your function deployment package. A layer can be shared across multiple functions, and each function can use up to five layers, reducing deployment package sizes and enabling shared dependency management.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda permissions
- Dependencies pre-built for the Lambda runtime architecture

## Step 1: Build the Layer Package

```bash
# Build Python dependencies for the Lambda layer

mkdir -p dist layer/python
python3.12 -m pip install -r requirements.txt --platform manylinux2014_x86_64 --only-binary=:all: -t layer/python/

# Or for Node.js
mkdir -p layer/nodejs
cd layer/nodejs && npm install --production
```

## Step 2: Package and Create a Lambda Layer

```hcl
# Package the dependencies into a ZIP archive
data "archive_file" "dependencies_layer" {
  type        = "zip"
  source_dir  = "${path.module}/layer"
  output_path = "${path.module}/dist/dependencies-layer.zip"
}

# Create the Lambda layer version
resource "aws_lambda_layer_version" "dependencies" {
  layer_name          = "python-dependencies"
  filename            = data.archive_file.dependencies_layer.output_path
  source_code_hash    = data.archive_file.dependencies_layer.output_base64sha256
  description         = "Common Python dependencies: boto3, requests, pydantic"

  # Supported runtimes for this layer
  compatible_runtimes = ["python3.12"]

  # Specify the CPU architecture
  compatible_architectures = ["x86_64"]

  # Retain the previous layer version when publishing a replacement
  skip_destroy = true
}
```

## Step 3: Create a Shared Utilities Layer

```hcl
# Layer containing shared utility code
# shared-utils/ should contain a top-level python/ directory
data "archive_file" "utils_layer" {
  type        = "zip"
  source_dir  = "${path.module}/shared-utils"
  output_path = "${path.module}/dist/utils-layer.zip"
}

resource "aws_lambda_layer_version" "utils" {
  layer_name       = "shared-utils"
  filename         = data.archive_file.utils_layer.output_path
  source_code_hash = data.archive_file.utils_layer.output_base64sha256
  description      = "Shared utility functions: logging, config, database helpers"

  compatible_runtimes      = ["python3.12"]
  compatible_architectures = ["x86_64", "arm64"]
}
```

## Step 4: Attach Layers to Lambda Functions

```hcl
# Package the Lambda function code
data "archive_file" "function" {
  type        = "zip"
  source_dir  = "${path.module}/function"
  output_path = "${path.module}/dist/function.zip"
}

# Lambda function using multiple layers
resource "aws_lambda_function" "api" {
  function_name    = "api-function"
  role             = var.lambda_role_arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.function.output_path
  source_code_hash = data.archive_file.function.output_base64sha256

  # Attach both layers - up to 5 layers can be attached
  layers = [
    aws_lambda_layer_version.dependencies.arn,
    aws_lambda_layer_version.utils.arn,
    var.aws_powertools_layer_arn,  # Versioned public layer ARN, for example AWS Lambda Powertools
  ]
}
```

## Step 5: Share Layers Across Accounts

```hcl
# Grant another AWS account permission to use this layer
resource "aws_lambda_layer_version_permission" "share" {
  layer_name     = aws_lambda_layer_version.utils.layer_name
  version_number = aws_lambda_layer_version.utils.version
  statement_id   = "share-with-dev-account"
  action         = "lambda:GetLayerVersion"
  principal      = var.dev_account_id  # Account ID or "*" for all accounts
}
```

## Step 6: Use AWS-Managed Public Layers

```hcl
# Reference a public layer available in your region (for example, AWS Lambda Powertools)
data "aws_lambda_layer_version" "powertools" {
  layer_name = "AWSLambdaPowertoolsPythonV3-python312-x86_64"
}

resource "aws_lambda_function" "with_powertools" {
  function_name    = "powered-function"
  role             = var.lambda_role_arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.function.output_path
  source_code_hash = data.archive_file.function.output_base64sha256

  layers = [data.aws_lambda_layer_version.powertools.arn]
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Lambda Layers reduce deployment package sizes and enable consistent dependency management across functions. Layer contents are available at `/opt` inside the Lambda execution environment, with Python packages at `/opt/python/` and Node.js modules at `/opt/nodejs/node_modules/`. Use `skip_destroy = true` if you want OpenTofu to retain previously published layer versions instead of deleting them during replacement or destroy operations.
