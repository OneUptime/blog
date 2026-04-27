# How to Use the sha256 and sha512 Functions in OpenTofu - Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Function, Security, Hashing

Description: Learn how to use sha256 and sha512 in OpenTofu to compute cryptographically strong hashes for security validation and change detection.

## Overview

OpenTofu provides two SHA-2 hash functions:

- `sha256(string)` - returns a 64-character lowercase hex SHA-256 hash
- `sha512(string)` - returns a 128-character lowercase hex SHA-512 hash

These are the recommended hashing functions when security matters, as SHA-256 and SHA-512 are cryptographically strong and widely used for integrity checking.

## Basic Usage

```hcl
locals {
  data_to_hash = "my-secret-configuration-string"

  # SHA-256: 64-character hex string, good balance of security and length
  sha256_hash = sha256(local.data_to_hash)

  # SHA-512: 128-character hex string, maximum hash strength
  sha512_hash = sha512(local.data_to_hash)
}
```

## Using sha256 for Artifact Integrity

A common use case is embedding a hash to verify artifact integrity or force updates when content changes.

```hcl
locals {
  # Hash the Lambda deployment package to detect code changes.
  # Lambda's source_code_hash expects a Base64-encoded SHA-256 of the file,
  # so use filebase64sha256 (the SHA-256 family helper for files).
  lambda_hash = filebase64sha256("${path.module}/dist/function.zip")
}

resource "aws_lambda_function" "api" {
  function_name    = "my-api"
  filename         = "${path.module}/dist/function.zip"
  source_code_hash = local.lambda_hash
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn

  # source_code_hash tells Lambda to update the function when the zip changes
}
```

## Verifying Configuration Integrity

```hcl
variable "expected_config_hash" {
  type        = string
  description = "Expected SHA-256 hash of the configuration file"
}

locals {
  actual_config_hash = sha256(file("${path.module}/config/production.json"))
}

# Validate that the config file matches the expected hash

resource "null_resource" "config_check" {
  triggers = {
    hash = local.actual_config_hash
  }

  provisioner "local-exec" {
    command = <<-EOT
      if [ "${local.actual_config_hash}" != "${var.expected_config_hash}" ]; then
        echo "Config hash mismatch! Expected: ${var.expected_config_hash}"
        exit 1
      fi
    EOT
  }
}
```

## Using sha512 for Higher-Security Scenarios

```hcl
variable "api_secret" {
  type      = string
  sensitive = true
}

locals {
  # Use SHA-512 for a stronger hash of sensitive configuration data
  secret_fingerprint = sha512(var.api_secret)
}

resource "aws_cloudwatch_log_group" "audit" {
  name = "/audit/secret-rotation"

  tags = {
    # Store only the fingerprint, never the secret itself
    SecretFingerprint = substr(local.secret_fingerprint, 0, 16)
  }
}
```

## Comparing Hash Functions

```hcl
locals {
  input = "opentofu"

  hashes = {
    md5    = md5(input)    # 32 hex chars  - not secure
    sha1   = sha1(input)   # 40 hex chars  - not secure
    sha256 = sha256(input) # 64 hex chars  - secure
    sha512 = sha512(input) # 128 hex chars - secure, larger output
  }
}
```

## Important Notes

- Use `sha256` or `sha512` whenever the hash has security implications (integrity verification, fingerprinting sensitive data).
- The `source_code_hash` attribute on `aws_lambda_function` expects a **Base64-encoded SHA-256** hash - use `filebase64sha256` for that specific use case.
- SHA-256 is generally the recommended choice as it provides strong security with a manageable output size.
- Both functions produce hexadecimal output; use `base64sha256` or `base64sha512` for Base64-encoded output.

## Conclusion

The `sha256` and `sha512` functions provide cryptographically strong hashing in OpenTofu. Use them for integrity verification, change detection, and any scenario where security matters. For most use cases, `sha256` offers the best balance of security and practicality.
