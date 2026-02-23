# How to Use the base64sha256 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Hashing, Base64, SHA256, AWS Lambda, Infrastructure as Code

Description: Learn how to use Terraform's base64sha256 function to generate base64-encoded SHA-256 hashes, commonly required by AWS Lambda and other cloud services.

---

Several cloud services expect hash values in base64 encoding rather than hexadecimal. AWS Lambda's `source_code_hash`, for example, requires a base64-encoded SHA-256 hash to detect code changes. Terraform's `base64sha256` function produces exactly this format, saving you from manually chaining `sha256` and `base64encode` together.

## What Does base64sha256 Do?

The `base64sha256` function computes the SHA-256 hash of a string and returns the result as a base64-encoded string, rather than the hexadecimal format that `sha256` produces.

```hcl
# Compare the two formats
output "hex_format" {
  value = sha256("hello world")
  # Result: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
}

output "base64_format" {
  value = base64sha256("hello world")
  # Result: "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek="
}
```

## Syntax

```hcl
base64sha256(string)
```

Takes a string, returns a base64-encoded SHA-256 hash.

## Why Base64 Instead of Hex?

Base64 encoding is more compact than hexadecimal. A SHA-256 hash is 32 bytes. In hex, that takes 64 characters. In base64, it takes only 44 characters. Some APIs and cloud services chose base64 for this compactness. AWS Lambda is the most prominent example.

## Practical Examples

### AWS Lambda Source Code Hash

This is the most common use case. AWS Lambda uses a base64-encoded SHA-256 hash to determine if the function code has changed:

```hcl
# Method 1: Using a zip file created outside Terraform
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/lambda/api.zip"

  # Lambda expects base64-encoded SHA-256
  source_code_hash = filebase64sha256("${path.module}/lambda/api.zip")
}
```

```hcl
# Method 2: Using the archive_file data source
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-src"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "processor" {
  function_name    = "data-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "main.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.lambda.output_path

  # The archive_file data source provides this directly
  source_code_hash = data.archive_file.lambda.output_base64sha256
}
```

### Lambda Layers

Lambda layers also use base64sha256 for change detection:

```hcl
resource "aws_lambda_layer_version" "dependencies" {
  layer_name          = "python-dependencies"
  filename            = "${path.module}/layers/dependencies.zip"
  compatible_runtimes = ["python3.12"]

  # Detect when the layer contents change
  source_code_hash = filebase64sha256("${path.module}/layers/dependencies.zip")
}

resource "aws_lambda_function" "app" {
  function_name    = "my-app"
  role             = aws_iam_role.lambda.arn
  handler          = "app.handler"
  runtime          = "python3.12"
  filename         = "${path.module}/lambda/app.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/app.zip")

  layers = [aws_lambda_layer_version.dependencies.arn]
}
```

### Multiple Lambda Functions

When managing several Lambda functions:

```hcl
locals {
  lambda_functions = {
    api = {
      handler = "api.handler"
      runtime = "python3.12"
      source  = "${path.module}/functions/api.zip"
    }
    worker = {
      handler = "worker.handler"
      runtime = "python3.12"
      source  = "${path.module}/functions/worker.zip"
    }
    authorizer = {
      handler = "auth.handler"
      runtime = "nodejs20.x"
      source  = "${path.module}/functions/authorizer.zip"
    }
  }
}

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_functions

  function_name    = each.key
  role             = aws_iam_role.lambda.arn
  handler          = each.value.handler
  runtime          = each.value.runtime
  filename         = each.value.source

  # Each function gets its own source code hash
  source_code_hash = filebase64sha256(each.value.source)

  tags = {
    Function = each.key
  }
}
```

### Content-Based Cache Keys

Some caching systems accept base64-encoded hashes:

```hcl
locals {
  # Configuration content
  config_content = jsonencode({
    database_url = var.database_url
    cache_ttl    = var.cache_ttl
    features     = var.feature_flags
  })

  # Generate a base64 hash for use as a cache key
  config_cache_key = base64sha256(local.config_content)
}

resource "aws_ssm_parameter" "config" {
  name  = "/${var.environment}/app-config"
  type  = "SecureString"
  value = local.config_content

  tags = {
    # Use the hash to track the configuration version
    Version = local.config_cache_key
  }
}
```

### Cloud Functions on GCP

Google Cloud Functions also use base64sha256 for source code change detection:

```hcl
resource "google_storage_bucket_object" "function_zip" {
  name   = "function-source-${filebase64sha256("${path.module}/function.zip")}.zip"
  bucket = google_storage_bucket.functions.name
  source = "${path.module}/function.zip"
}

resource "google_cloudfunctions_function" "processor" {
  name        = "data-processor"
  runtime     = "python312"
  entry_point = "main"

  source_archive_bucket = google_storage_bucket.functions.name
  source_archive_object = google_storage_bucket_object.function_zip.name

  trigger_http = true
}
```

## base64sha256 vs sha256 + base64encode

You might wonder if `base64sha256` is the same as chaining `base64encode(sha256(...))`. It is not:

```hcl
# base64sha256 computes the hash and encodes the raw bytes to base64
output "correct" {
  value = base64sha256("hello")
  # Encodes the 32-byte hash directly to base64
}

# base64encode(sha256(...)) encodes the hex string to base64
output "wrong" {
  value = base64encode(sha256("hello"))
  # Encodes the 64-character hex string to base64 - different result!
}
```

The difference is that `base64sha256` encodes the raw 32-byte hash to base64, while `base64encode(sha256(...))` encodes the 64-character hexadecimal string representation to base64. Always use `base64sha256` when a service expects a base64-encoded hash.

## filebase64sha256 for Files

Terraform also provides `filebase64sha256` for directly hashing files:

```hcl
# More efficient - reads and hashes the file in one step
output "file_hash" {
  value = filebase64sha256("${path.module}/artifact.zip")
}

# Less efficient - reads the file into memory, then hashes the string
output "file_hash_manual" {
  value = base64sha256(file("${path.module}/artifact.zip"))
}
```

Use `filebase64sha256` for file hashing since it is more memory-efficient, especially with large files.

## A Complete Lambda Deployment Example

Here is a full working example showing a typical Lambda deployment workflow:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

# Package the Lambda source code
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/function.zip"
}

# IAM role for the Lambda function
resource "aws_iam_role" "lambda" {
  name = "lambda-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Attach basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Deploy the Lambda function
resource "aws_lambda_function" "main" {
  function_name    = "my-function"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.lambda.output_path

  # The key piece: base64sha256 hash for change detection
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}

output "function_arn" {
  value = aws_lambda_function.main.arn
}
```

## Summary

The `base64sha256` function is essential for anyone deploying serverless functions or working with APIs that expect base64-encoded hashes. Its primary use case is AWS Lambda's `source_code_hash` attribute, but it appears in other cloud services as well. Remember to use `filebase64sha256` for file hashing, and be aware that `base64sha256` is not the same as `base64encode(sha256(...))`. For the hex-encoded variant, see [sha256](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sha256-function-in-terraform/view), and for an even stronger hash, see [base64sha512](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-base64sha512-function-in-terraform/view).
