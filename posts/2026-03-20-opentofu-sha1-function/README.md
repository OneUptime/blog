# How to Use the sha1 Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the sha1 function in OpenTofu to compute SHA-1 hashes for content verification and unique identifier generation.

## Introduction

The `sha1` function in OpenTofu computes the SHA-1 hash of a string, returning a 40-character hexadecimal string. Like `md5`, it is primarily used for generating deterministic identifiers and tracking content changes, not for security purposes.

## Syntax

```hcl
sha1(string)
```

- Returns a 40-character lowercase hexadecimal SHA-1 hash

## Basic Examples

```hcl
output "sha1_hash" {
  value = sha1("hello world")
  # Returns "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed"
}
```

## Practical Use Cases

### Tracking Config File Changes

```hcl
locals {
  nginx_config = file("${path.module}/config/nginx.conf")
  config_hash  = sha1(local.nginx_config)
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    Name       = "web-server"
    ConfigHash = local.config_hash
  }
}

resource "null_resource" "redeploy_on_config_change" {
  triggers = {
    nginx_config_hash = local.config_hash
  }

  provisioner "local-exec" {
    command = "echo 'Config changed, triggering redeploy'"
  }
}
```

### Generating Unique S3 Object Keys

```hcl
variable "config_content" {
  type    = string
  default = "my config content"
}

locals {
  content_hash = sha1(var.config_content)
}

resource "aws_s3_object" "versioned_config" {
  bucket = aws_s3_bucket.configs.id
  key    = "configs/${local.content_hash}.json"
  body   = var.config_content
}
```

### SSM Parameter Versioning

```hcl
variable "app_config" {
  type = object({
    db_host = string
    db_port = number
  })
}

locals {
  config_json = jsonencode(var.app_config)
  config_sha1 = sha1(local.config_json)
}

resource "aws_ssm_parameter" "config" {
  name  = "/app/config"
  type  = "String"
  value = local.config_json

  tags = {
    ContentHash = local.config_sha1
  }
}
```

## Step-by-Step Usage

```bash
tofu console

> sha1("hello")
"aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d"
> length(sha1("test"))
40
```

## sha1 vs md5 vs sha256

| Function | Hash Length | Security |
|----------|-------------|----------|
| `md5` | 32 chars | Not secure |
| `sha1` | 40 chars | Not secure (deprecated) |
| `sha256` | 64 chars | Secure |

For new infrastructure code, prefer `sha256` over `sha1`.

## Conclusion

The `sha1` function provides 40-character deterministic hashes in OpenTofu. Use it for content-change detection and versioned resource naming. For security-sensitive contexts, use `sha256` instead.
