# How to Use the sha1 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Hashing, SHA1, Infrastructure as Code

Description: Learn how to use Terraform's sha1 function to compute SHA-1 hashes for change detection, unique identifiers, and content verification in your configurations.

---

SHA-1 is a widely recognized hashing algorithm that produces a 160-bit (40-character hexadecimal) hash value. While it has been deprecated for cryptographic security purposes, it remains useful in many infrastructure scenarios. Terraform's `sha1` function lets you compute SHA-1 hashes directly within your configuration files.

## What Does the sha1 Function Do?

The `sha1` function takes a string input and returns its SHA-1 hash as a 40-character lowercase hexadecimal string.

```hcl
# Compute the SHA-1 hash of a string
output "hash" {
  value = sha1("hello world")
  # Result: "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed"
}
```

## Syntax

```hcl
sha1(string)
```

One argument, one return value. The input is any string, and the output is always a 40-character hex string.

## Security Considerations

Like MD5, SHA-1 is considered cryptographically weak. Google demonstrated a practical collision attack against SHA-1 back in 2017. Do not use SHA-1 for:

- Password storage
- Certificate signing
- Authentication tokens
- Any context where collision resistance matters

That said, SHA-1 is perfectly fine for non-security applications like change detection, content-based naming, and generating deterministic identifiers.

## Practical Examples

### Tracking Resource Configuration Changes

Use SHA-1 hashes to trigger resource updates when underlying configuration changes:

```hcl
locals {
  # Read the application configuration
  app_config = file("${path.module}/configs/app.yaml")
}

resource "null_resource" "deploy_app" {
  triggers = {
    # When the config changes, SHA-1 hash changes, triggering redeployment
    config_sha1 = sha1(local.app_config)
  }

  provisioner "local-exec" {
    command = "kubectl apply -f ${path.module}/configs/app.yaml"
  }
}
```

### Generating Unique Resource Names

SHA-1 gives you 40 characters to work with, so you can create longer unique suffixes than MD5:

```hcl
variable "project" {
  default = "myapp"
}

variable "environment" {
  default = "production"
}

locals {
  # Create a deterministic unique identifier from project parameters
  resource_id = substr(sha1("${var.project}-${var.environment}"), 0, 12)
}

resource "aws_sqs_queue" "tasks" {
  # Produces a name like "tasks-a1b2c3d4e5f6"
  name = "tasks-${local.resource_id}"

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
```

### Content-Addressed Storage Patterns

When you want to store files in a content-addressed manner where the key is derived from the content:

```hcl
locals {
  # Read a Lambda function zip
  lambda_zip = filesha1("${path.module}/lambda/function.zip")
}

resource "aws_s3_object" "lambda_code" {
  bucket = aws_s3_bucket.deployments.id
  # Include the hash in the key for content-addressed storage
  key    = "lambda/${local.lambda_zip}/function.zip"
  source = "${path.module}/lambda/function.zip"
}

resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  s3_bucket = aws_s3_object.lambda_code.bucket
  s3_key    = aws_s3_object.lambda_code.key

  # Use the hash to detect when the code changes
  source_code_hash = local.lambda_zip
}
```

### Combining Multiple Values into a Hash

When you need a single hash that represents a combination of settings:

```hcl
variable "instance_type" {
  default = "t3.micro"
}

variable "ami_id" {
  default = "ami-0123456789abcdef0"
}

variable "user_data_script" {
  default = "#!/bin/bash\necho hello"
}

locals {
  # Create a composite hash from multiple configuration values
  # Any change to any of these values changes the hash
  instance_config_hash = sha1(join("|", [
    var.instance_type,
    var.ami_id,
    var.user_data_script,
  ]))
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  user_data     = var.user_data_script

  tags = {
    Name       = "app-server"
    ConfigHash = local.instance_config_hash
  }
}
```

### Using sha1 for Conditional Logic

Hash values can serve as stable identifiers for conditional operations:

```hcl
locals {
  # Generate a consistent hash for each team member
  team_members = ["alice", "bob", "charlie", "diana"]

  # Assign each member to a shard based on their name hash
  member_shards = {
    for member in local.team_members :
    member => tonumber(
      # Take the first 4 hex chars of the SHA-1 and convert to decimal
      # Then mod by the number of shards
      "0x${substr(sha1(member), 0, 4)}"
    ) % 3
  }
}

output "shard_assignments" {
  value = local.member_shards
}
```

### Tagging Resources with Content Hashes

Adding content hashes as tags helps with auditing and tracking what version of a configuration each resource was created with:

```hcl
locals {
  # Hash the entire Terraform configuration directory
  # Useful for tracking which version of the config was applied
  tf_files = [
    file("${path.module}/main.tf"),
    file("${path.module}/variables.tf"),
    file("${path.module}/outputs.tf"),
  ]
  config_version = substr(sha1(join("", local.tf_files)), 0, 8)
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name           = "web-server"
    ConfigVersion  = local.config_version
    ManagedBy      = "terraform"
  }
}
```

## sha1 vs filesha1

Similar to `md5` and `filemd5`, Terraform provides `filesha1` as a convenience function that combines `file()` and `sha1()`:

```hcl
# These are equivalent
output "hash_a" {
  value = sha1(file("${path.module}/script.sh"))
}

output "hash_b" {
  value = filesha1("${path.module}/script.sh")
}
```

Use `filesha1` when you only need the hash and not the file content itself. It is slightly more efficient.

## Comparing SHA-1 with Other Hash Functions

Here is a quick comparison of the hash functions available in Terraform:

| Function | Output Length | Speed | Security |
|----------|-------------|-------|----------|
| md5      | 32 chars    | Fastest | Broken |
| sha1     | 40 chars    | Fast    | Weak   |
| sha256   | 64 chars    | Medium  | Strong |
| sha512   | 128 chars   | Medium  | Strongest |

For Terraform use cases, the choice often comes down to output length. If you need short identifiers, `md5` is fine. If you want something a bit longer and more collision-resistant (but still fast), `sha1` is a good middle ground. For anything security-related, go with `sha256` or `sha512`.

## Summary

Terraform's `sha1` function is a practical tool for generating deterministic hashes in your infrastructure code. While it should not be used for cryptographic purposes, it works well for change detection, unique naming, content-addressed storage, and configuration tracking. It produces slightly longer output than MD5 (40 vs 32 characters), giving you more uniqueness for resource identifiers. For stronger hashing needs, consider [sha256](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sha256-function-in-terraform/view) or [sha512](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sha512-function-in-terraform/view).
