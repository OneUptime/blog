# How to Use the filebase64sha256 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, filebase64sha256 Function, File Systems, HCL, Infrastructure as Code, Hashing, SHA256

Description: Learn how to use the filebase64sha256 function in Terraform to compute base64-encoded SHA256 hashes of files for change detection and integrity verification.

---

The `filebase64sha256` function computes the SHA256 hash of a file's contents and returns it as a base64-encoded string. This is one of the most commonly used hashing functions in Terraform because AWS Lambda and several other services specifically require this format for detecting code changes and verifying file integrity.

## What Is the filebase64sha256 Function?

The `filebase64sha256` function reads a file, computes its SHA256 hash, and returns the hash encoded in base64:

```hcl
# filebase64sha256(path)
# Returns the base64-encoded SHA256 hash of a file
filebase64sha256("${path.module}/lambda/function.zip")
# Returns something like: "n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg="
```

This is equivalent to `base64sha256(file(path))` but works correctly with binary files and is more concise.

## Why base64-encoded SHA256?

AWS Lambda's `source_code_hash` attribute specifically requires a base64-encoded SHA256 hash. This hash tells Terraform whether the function code has changed since the last deployment. Without it, Terraform would not know to update the Lambda function when you rebuild your code package.

## The Most Common Use Case - Lambda Deployments

This is the primary reason `filebase64sha256` exists in most Terraform codebases:

```hcl
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  # The zip file containing the function code
  filename = "${path.module}/lambda/api.zip"

  # This hash triggers an update when the zip file changes
  source_code_hash = filebase64sha256("${path.module}/lambda/api.zip")
}
```

When the contents of `api.zip` change, the hash changes, and Terraform knows to update the Lambda function. Without `source_code_hash`, Terraform would see the same filename and skip the update even though the code inside changed.

## Multiple Lambda Functions

When managing several Lambda functions, the pattern stays the same:

```hcl
variable "lambda_functions" {
  type = map(object({
    handler = string
    runtime = string
    timeout = number
  }))
  default = {
    api = {
      handler = "api.handler"
      runtime = "python3.9"
      timeout = 30
    }
    processor = {
      handler = "processor.handler"
      runtime = "python3.9"
      timeout = 300
    }
    notifier = {
      handler = "notifier.handler"
      runtime = "python3.9"
      timeout = 60
    }
  }
}

resource "aws_lambda_function" "functions" {
  for_each = var.lambda_functions

  function_name = each.key
  role          = aws_iam_role.lambda.arn
  handler       = each.value.handler
  runtime       = each.value.runtime
  timeout       = each.value.timeout

  filename         = "${path.module}/lambda/${each.key}.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/${each.key}.zip")
}
```

## Lambda Layers

The same pattern applies to Lambda layers:

```hcl
resource "aws_lambda_layer_version" "dependencies" {
  layer_name          = "app-dependencies"
  filename            = "${path.module}/layers/dependencies.zip"
  source_code_hash    = filebase64sha256("${path.module}/layers/dependencies.zip")
  compatible_runtimes = ["python3.9", "python3.10"]
}

resource "aws_lambda_function" "app" {
  function_name = "app"
  role          = aws_iam_role.lambda.arn
  handler       = "app.handler"
  runtime       = "python3.9"

  filename         = "${path.module}/lambda/app.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/app.zip")

  layers = [aws_lambda_layer_version.dependencies.arn]
}
```

## Change Detection for S3 Objects

Beyond Lambda, `filebase64sha256` helps detect changes in any file you upload:

```hcl
resource "aws_s3_object" "config" {
  bucket = aws_s3_bucket.config.id
  key    = "app/config.yaml"
  source = "${path.module}/configs/app.yaml"

  # Detect when the config file has changed
  etag = filemd5("${path.module}/configs/app.yaml")

  # Or use sha256 for stronger verification
  # (stored as a tag or metadata)
  tags = {
    ContentHash = filebase64sha256("${path.module}/configs/app.yaml")
  }
}
```

## Triggering Deployments on Code Change

You can use the hash to trigger other resources that depend on code changes:

```hcl
locals {
  # Compute hash of the application archive
  app_hash = filebase64sha256("${path.module}/dist/app.zip")
}

resource "aws_lambda_function" "app" {
  function_name    = "my-app"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = "${path.module}/dist/app.zip"
  source_code_hash = local.app_hash
}

# Also update the alias when code changes
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.app.function_name
  function_version = aws_lambda_function.app.version

  # This description changes with each deployment for tracking
  description = "Deployed with hash: ${substr(local.app_hash, 0, 8)}"
}
```

## Comparing with Other Hash Functions

Terraform offers several file hashing functions. Here is when to use each:

```hcl
locals {
  file_path = "${path.module}/example.zip"

  # filebase64sha256 - base64-encoded SHA256
  # Use for: Lambda source_code_hash, general integrity checks
  b64sha256 = filebase64sha256(local.file_path)
  # Output: "n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg="

  # filesha256 - hex-encoded SHA256
  # Use for: general hash comparisons, when hex format is needed
  hexsha256 = filesha256(local.file_path)
  # Output: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"

  # filemd5 - hex-encoded MD5
  # Use for: S3 etags, quick checksums (not for security)
  md5 = filemd5(local.file_path)
  # Output: "098f6bcd4621d373cade4e832627b4f6"
}
```

## Using with Terraform Data Source Archives

When using the `archive_file` data source to create zip files:

```hcl
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/dist/function.zip"
}

resource "aws_lambda_function" "app" {
  function_name    = "app"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.9"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  # Note: when using archive_file, you can use its output_base64sha256
  # instead of filebase64sha256, since the archive might not exist yet
  # at the time filebase64sha256 would be evaluated
}
```

## Integrity Verification Across Environments

Use the hash to verify that the same code is deployed across environments:

```hcl
locals {
  code_hash = filebase64sha256("${path.module}/lambda/app.zip")
}

resource "aws_lambda_function" "app" {
  for_each = toset(["dev", "staging", "production"])

  function_name    = "app-${each.key}"
  role             = aws_iam_role.lambda[each.key].arn
  handler          = "index.handler"
  runtime          = "python3.9"
  filename         = "${path.module}/lambda/app.zip"
  source_code_hash = local.code_hash

  environment {
    variables = {
      ENVIRONMENT = each.key
      CODE_HASH   = local.code_hash
    }
  }
}

output "deployed_hash" {
  value       = local.code_hash
  description = "SHA256 hash of deployed code (same across all environments)"
}
```

## Conditional Updates

Only update certain resources when specific files change:

```hcl
locals {
  config_hash = filebase64sha256("${path.module}/configs/app.yaml")
  code_hash   = filebase64sha256("${path.module}/lambda/app.zip")
}

resource "aws_lambda_function" "app" {
  function_name    = "app"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.9"
  filename         = "${path.module}/lambda/app.zip"
  source_code_hash = local.code_hash

  # Config changes are passed as environment variable hash
  environment {
    variables = {
      CONFIG_HASH = local.config_hash
      CONFIG_URL  = "s3://${aws_s3_bucket.config.id}/app.yaml"
    }
  }
}
```

## Important Notes

```hcl
# filebase64sha256 reads the file at plan time
# The file must exist when terraform plan runs

# The hash is deterministic - same content always produces the same hash
# Different files with identical content produce the same hash

# The function handles binary files correctly
# Unlike base64sha256(file(path)) which might fail on binary files

# The returned string is typically 44 characters long
# (32 bytes of SHA256 hash, base64-encoded)

# Performance: the entire file must be read into memory to compute the hash
# For very large files (GB+), this could be slow
```

## Summary

The `filebase64sha256` function computes a base64-encoded SHA256 hash of a file's contents. Its primary use is the `source_code_hash` attribute on AWS Lambda functions, which tells Terraform when function code has changed and needs redeployment. Beyond Lambda, it is useful for any change detection scenario where you need to know if a file's contents have been modified. It handles both text and binary files correctly, and the base64 encoding makes it compatible with APIs that expect this specific format.

For related functions, see our posts on the [filemd5 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filemd5-function-in-terraform/view) and the [filesha256 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filesha256-function-in-terraform/view).
