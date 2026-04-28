# How to Use the base64sha256 and base64sha512 Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Function, Hashing, Encoding

Description: Learn how to use base64sha256 and base64sha512 in OpenTofu to produce Base64-encoded SHA hashes required by AWS Lambda and other services.

## Overview

OpenTofu provides Base64-encoded variants of its SHA hash functions:

- `base64sha256(string)` - computes a SHA-256 hash and returns it Base64-encoded
- `base64sha512(string)` - computes a SHA-512 hash and returns it Base64-encoded

These are most commonly needed for AWS Lambda's `source_code_hash` attribute, which specifically requires a Base64-encoded SHA-256 hash to detect code changes.

## base64sha256

The primary use case is computing the hash of a Lambda deployment package.

```hcl
# The filebase64sha256 function is the preferred way to hash Lambda ZIP files,

# but base64sha256 works with string content.

resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  filename      = "${path.module}/dist/processor.zip"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda.arn

  # AWS Lambda uses Base64-encoded SHA-256 to detect code changes
  # filebase64sha256 is equivalent to base64sha256(file("...")) but also
  # works on binary files such as ZIP archives, which file() cannot read.
  source_code_hash = filebase64sha256("${path.module}/dist/processor.zip")
}
```

## Using base64sha256 with String Content

When hashing a dynamically generated string (not a file), use `base64sha256` directly.

```hcl
variable "config_content" {
  type = string
}

locals {
  # Hash a dynamically constructed string
  config_hash = base64sha256(var.config_content)
}

resource "aws_s3_object" "config" {
  bucket  = aws_s3_bucket.config.bucket
  key     = "app/config.json"
  content = var.config_content

  # source_hash triggers a re-upload when the content (and therefore
  # the hash) changes, even when server-side encryption is in use.
  source_hash = local.config_hash
}
```

## base64sha512 for Stronger Hashing

Use `base64sha512` when a longer hash is required or when integrating with systems that use SHA-512.

```hcl
variable "signing_payload" {
  type      = string
  sensitive = true
}

locals {
  # Compute a Base64-encoded SHA-512 hash for a signing payload
  payload_hash = base64sha512(var.signing_payload)
}

output "payload_fingerprint" {
  value     = local.payload_hash
  sensitive = true
}
```

## Comparing Hex vs Base64 Output

Different services require different hash encodings. Here is how the functions relate:

```hcl
locals {
  data = "opentofu-example"

  # Hexadecimal SHA-256 (64 characters)
  hex_sha256 = sha256(local.data)

  # Base64-encoded SHA-256 (shorter, ~44 characters)
  b64_sha256 = base64sha256(local.data)

  # These are the same hash, just different encodings
  # sha256 → hex, base64sha256 → base64
}
```

## Practical Example: Triggering Lambda Updates

```hcl
locals {
  # Hash the raw bytes of the Lambda deployment package. Use
  # filebase64sha256 directly so that binary ZIP content is hashed
  # as-is rather than the Base64 encoding of it.
  lambda_hash = filebase64sha256("${path.module}/dist/api.zip")
}

resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  filename      = "${path.module}/dist/api.zip"
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  role          = aws_iam_role.lambda.arn

  # When the ZIP content changes, this hash changes,
  # causing Lambda to update the function code
  source_code_hash = local.lambda_hash

  environment {
    variables = {
      ENV = var.environment
    }
  }
}
```

## Important Notes

- For file-based hashing, prefer `filebase64sha256` over `base64sha256(filebase64(...))` - they are equivalent but the file-specific function is more readable.
- `base64sha256` is more compact than `sha256` (Base64 is ~33% shorter than hex for the same data).
- AWS Lambda's `source_code_hash` specifically requires Base64-encoded SHA-256.

## Conclusion

The `base64sha256` and `base64sha512` functions produce the encoded hash formats required by AWS Lambda, S3 object integrity checks, and other services. Use them when hexadecimal output from `sha256` or `sha512` is not the right format for your target service.
