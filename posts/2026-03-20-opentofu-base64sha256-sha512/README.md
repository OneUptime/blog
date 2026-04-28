# How to Use the base64sha256 and base64sha512 Functions in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the base64sha256 and base64sha512 functions in OpenTofu to compute Base64-encoded SHA hashes required by AWS Lambda and other services.

## Introduction

The `base64sha256` and `base64sha512` functions compute SHA-256 and SHA-512 hashes of strings and return them Base64-encoded (rather than hexadecimal). AWS Lambda's `source_code_hash` field specifically requires `base64sha256`, making these functions important for Lambda deployment.

## Syntax

```hcl
base64sha256(string)
base64sha512(string)
```

## Basic Examples

```hcl
output "b64sha256" {
  value = base64sha256("hello")
  # Returns Base64-encoded SHA-256 (not hex)
}

output "hex_vs_b64" {
  # These hash the same data but differ in encoding
  value = {
    hex = sha256("hello")         # 64 hex chars
    b64 = base64sha256("hello")   # ~44 Base64 chars
  }
}
```

## Practical Use Cases

### Lambda Deployment Hash

AWS Lambda uses `source_code_hash` in Base64-encoded SHA-256 format to detect code changes.

```hcl
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/src"
  output_path = "${path.module}/.build/lambda.zip"
}

resource "aws_lambda_function" "api" {
  filename         = data.archive_file.lambda.output_path
  function_name    = "api-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"

  # AWS requires base64-encoded SHA-256 hash
  source_code_hash = data.archive_file.lambda.output_base64sha256

  tags = {
    Name = "api-handler"
  }
}
```

Note: `data.archive_file` provides `output_base64sha256` directly, so you typically don't need to call `base64sha256()` for Lambda - use the archive file attribute.

### Custom Deployment Verification

```hcl
locals {
  config_hash = base64sha256(file("${path.module}/config/app.json"))
}

resource "aws_lambda_function" "processor" {
  filename         = "processor.zip"
  function_name    = "data-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "main.handler"
  runtime          = "python3.11"

  # Trigger redeploy when config changes
  source_code_hash = base64sha256(join("", [
    filebase64sha256("processor.zip"),
    local.config_hash
  ]))
}
```

### Custom API Payload Hashing

```hcl
variable "request_body" {
  type    = string
  default = "{}"
}

locals {
  # Some custom APIs require a Base64-encoded SHA-256 of the request payload
  payload_hash = base64sha256(var.request_body)
}
```

### SSM Parameter with Hash Tracking

```hcl
locals {
  config = jsonencode(var.app_config)
}

resource "aws_ssm_parameter" "app" {
  name  = "/app/config"
  type  = "String"
  value = local.config

  tags = {
    ContentHash = base64sha256(local.config)
  }
}
```

## Step-by-Step Usage

```bash
tofu console

> base64sha256("hello")
"LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ="
> length(base64sha256("hello"))
44
```

## Comparison Table

| Function | Output Format | Length | Use Case |
|----------|-------------|--------|----------|
| `sha256(s)` | Hex | 64 chars | Content verification |
| `sha512(s)` | Hex | 128 chars | High-security hashes |
| `base64sha256(s)` | Base64 | 44 chars | Lambda `source_code_hash` |
| `base64sha512(s)` | Base64 | 88 chars | Compact strong hash |

## Conclusion

The `base64sha256` and `base64sha512` functions are primarily used when an API requires Base64-encoded SHA hashes instead of hex-encoded ones. The most common use case in OpenTofu is AWS Lambda's `source_code_hash`, which requires exactly this format. For other contexts, the standard `sha256` or `sha512` hex functions are usually sufficient.
