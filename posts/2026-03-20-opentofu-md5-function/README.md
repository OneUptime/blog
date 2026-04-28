# How to Use the md5 Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the md5 function in OpenTofu to compute MD5 hashes for generating unique identifiers and change detection triggers.

## Introduction

The `md5` function in OpenTofu computes the MD5 hash of a given string, returning a 32-character hexadecimal string. While MD5 is not suitable for security purposes, it is widely used in OpenTofu for generating unique but deterministic identifiers, triggering resource replacements when content changes, and creating short hashes for naming.

## Syntax

```hcl
md5(string)
```

- Returns a 32-character lowercase hexadecimal MD5 hash

## Basic Examples

```hcl
output "hash_example" {
  value = md5("hello world")  # Returns "5eb63bbbe01eeed093cb22bb8f5acdc3"
}

output "empty_string" {
  value = md5("")  # Returns "d41d8cd98f00b204e9800998ecf8427e"
}
```

## Practical Use Cases

### Triggering Resource Replacement on Config Change

```hcl
locals {
  user_data_script = templatefile("${path.module}/templates/userdata.sh", {
    environment = var.environment
    version     = var.app_version
  })

  # Hash of user data - changes when content changes
  user_data_hash = md5(local.user_data_script)
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  user_data     = local.user_data_script

  # Force replacement when user data changes
  user_data_replace_on_change = true

  tags = {
    Name         = "app-server"
    UserDataHash = local.user_data_hash  # Track version in tags
  }
}
```

### Generating Unique Resource Names

```hcl
variable "project" {
  type    = string
  default = "myproject"
}

variable "environment" {
  type    = string
  default = "prod"
}

locals {
  # Short, unique hash for resource naming
  name_hash = substr(md5("${var.project}-${var.environment}"), 0, 8)
}

resource "aws_s3_bucket" "state" {
  # Unique but deterministic bucket name
  bucket = "tf-state-${local.name_hash}"

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
```

### Cache Invalidation

```hcl
locals {
  config_content = file("${path.module}/config/app.json")
  config_hash    = md5(local.config_content)
}

resource "null_resource" "invalidate_cache" {
  triggers = {
    config_hash = local.config_hash
  }

  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.app.id} --paths '/*'"
  }
}
```

### Lambda Deployment Tracking

```hcl
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/.build/lambda.zip"
}

resource "aws_lambda_function" "api" {
  filename         = data.archive_file.lambda.output_path
  function_name    = "api-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.lambda.output_base64sha256

  tags = {
    Name    = "api-handler"
    ZipHash = md5(data.archive_file.lambda.output_path)
  }
}
```

## Step-by-Step Usage

1. Identify content that needs a hash-based identifier.
2. Apply `md5(string)` to get a 32-char hex digest.
3. For short names, use `substr(md5(...), 0, 8)` for an 8-char prefix.
4. Test in `tofu console`:

```bash
tofu console

> md5("hello")
"5d41402abc4b2a76b9719d911017c592"
> substr(md5("myproject"), 0, 8)
"4da39212"
```

## Security Note

MD5 is not cryptographically secure and should not be used for:
- Password hashing (use `bcrypt`)
- Digital signatures
- Security-critical checksums

Use `sha256` or `sha512` for security-sensitive hashing.

## Conclusion

The `md5` function is a practical tool in OpenTofu for generating deterministic, short identifiers from strings. Its primary uses are creating unique resource names, tracking content changes in tags, and triggering resource replacements when configuration content changes. For security-critical use cases, prefer `sha256` or `bcrypt`.
