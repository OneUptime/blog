# How to Use the sha256 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Hashing, SHA256, Security, Infrastructure as Code

Description: Learn how to use Terraform's sha256 function for secure content hashing, integrity verification, and change detection in your infrastructure configurations.

---

SHA-256 is part of the SHA-2 family of cryptographic hash functions and is considered the standard choice for secure hashing today. It produces a 256-bit (64-character hexadecimal) hash that is collision-resistant and suitable for most security-related use cases. Terraform includes the `sha256` function so you can compute these hashes directly in your configurations.

## What Does the sha256 Function Do?

The `sha256` function computes the SHA-256 hash of a given string and returns it as a 64-character lowercase hexadecimal string.

```hcl
# Compute the SHA-256 hash of a string
output "hash" {
  value = sha256("hello world")
  # Result: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
}
```

## Syntax

```hcl
sha256(string)
```

Takes one string argument, returns a 64-character hex string.

## Why SHA-256?

SHA-256 is the go-to hash function when you need a balance of security and practicality. It is:

- Collision-resistant (no known practical collisions)
- Widely supported across cloud services and APIs
- The standard for AWS Lambda source code hashing
- Used in certificate pinning, content integrity checks, and more

If you are unsure which hash function to use in Terraform, SHA-256 is usually the right answer.

## Practical Examples

### AWS Lambda Source Code Hashing

AWS Lambda uses base64-encoded SHA-256 hashes to detect code changes. While Terraform has a dedicated `base64sha256` function for this, understanding the underlying SHA-256 is helpful:

```hcl
# Deploy a Lambda function with proper source code hash
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-src"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "processor" {
  function_name    = "data-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda.output_path

  # Lambda expects base64-encoded SHA-256 for change detection
  source_code_hash = data.archive_file.lambda.output_base64sha256
}

# You can also verify the hash independently
output "code_sha256" {
  value = sha256(file(data.archive_file.lambda.output_path))
}
```

### Content Integrity Verification

When deploying configuration files to remote systems, you can verify integrity:

```hcl
locals {
  # The configuration content
  nginx_config = templatefile("${path.module}/templates/nginx.conf.tpl", {
    server_name = var.domain_name
    backend_port = var.app_port
  })

  # Compute the hash for verification
  config_hash = sha256(local.nginx_config)
}

resource "null_resource" "deploy_nginx_config" {
  triggers = {
    config_hash = local.config_hash
  }

  # Upload the config
  provisioner "file" {
    content     = local.nginx_config
    destination = "/tmp/nginx.conf"

    connection {
      type = "ssh"
      host = aws_instance.web.public_ip
      user = "ubuntu"
    }
  }

  # Verify the upload and install the config
  provisioner "remote-exec" {
    inline = [
      # Verify the file was uploaded correctly by checking its hash
      "echo '${local.config_hash}  /tmp/nginx.conf' | sha256sum -c -",
      "sudo mv /tmp/nginx.conf /etc/nginx/nginx.conf",
      "sudo nginx -t && sudo systemctl reload nginx"
    ]

    connection {
      type = "ssh"
      host = aws_instance.web.public_ip
      user = "ubuntu"
    }
  }
}
```

### Generating Deterministic UUIDs from Content

When you need stable, unique identifiers that are derived from content:

```hcl
locals {
  services = ["api", "web", "worker", "scheduler"]

  # Generate a unique but deterministic ID for each service
  service_ids = {
    for svc in local.services :
    svc => substr(sha256("${var.project}-${var.environment}-${svc}"), 0, 16)
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each = local.service_ids

  # Name includes a deterministic hash-based ID
  name              = "/app/${each.key}-${each.value}"
  retention_in_days = 30

  tags = {
    Service = each.key
    HashID  = each.value
  }
}
```

### Tracking Infrastructure Changes

Use SHA-256 to create a fingerprint of your infrastructure configuration:

```hcl
locals {
  # Collect all the key configuration values
  infra_config = jsonencode({
    vpc_cidr       = var.vpc_cidr
    instance_type  = var.instance_type
    instance_count = var.instance_count
    ami_id         = var.ami_id
    environment    = var.environment
  })

  # Create a SHA-256 fingerprint
  infra_fingerprint = sha256(local.infra_config)
}

# Store the fingerprint in SSM Parameter Store for auditing
resource "aws_ssm_parameter" "infra_version" {
  name  = "/${var.environment}/infra-fingerprint"
  type  = "String"
  value = local.infra_fingerprint

  tags = {
    Purpose = "Infrastructure version tracking"
  }
}
```

### Secure Token Generation

While Terraform is not the ideal place to generate security tokens, you can create deterministic tokens for non-critical uses:

```hcl
# Generate a webhook verification token from known inputs
# This is deterministic - the same inputs always produce the same token
locals {
  webhook_secret = sha256("${var.project}-${var.environment}-webhook-${var.salt}")
}

resource "aws_ssm_parameter" "webhook_secret" {
  name  = "/${var.environment}/webhook-secret"
  type  = "SecureString"
  value = local.webhook_secret
}
```

### ECS Task Definition Change Detection

Detect when a task definition needs updating:

```hcl
locals {
  # Define the container configuration
  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repo}:${var.image_tag}"
      cpu       = var.cpu
      memory    = var.memory
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
      environment = [
        { name = "ENV", value = var.environment },
        { name = "LOG_LEVEL", value = var.log_level },
      ]
    }
  ])

  # Hash the container definitions to detect changes
  task_hash = sha256(local.container_definitions)
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app-${var.environment}"
  container_definitions    = local.container_definitions
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory

  tags = {
    DefinitionHash = substr(local.task_hash, 0, 12)
  }
}
```

## sha256 vs filesha256

As with the other hash functions, Terraform provides a file-specific variant:

```hcl
# Reading the file and hashing it in two steps
output "two_step" {
  value = sha256(file("${path.module}/data.bin"))
}

# Hashing the file directly in one step
output "one_step" {
  value = filesha256("${path.module}/data.bin")
}
```

Use `filesha256` when you only need the hash. It is more memory-efficient for large files.

## Comparing Hash Output Lengths

```hcl
locals {
  input = "terraform is great"

  comparison = {
    md5    = md5(local.input)      # 32 characters
    sha1   = sha1(local.input)     # 40 characters
    sha256 = sha256(local.input)   # 64 characters
    sha512 = sha512(local.input)   # 128 characters
  }
}
```

SHA-256 hits a sweet spot: long enough to be effectively collision-free, short enough to use in resource names and tags without truncation issues.

## Using sha256 in Validation

You can use SHA-256 hashes in custom validation rules:

```hcl
variable "config_file" {
  type = string
  description = "Path to the configuration file"

  validation {
    # Ensure the file exists and can be hashed
    condition     = can(filesha256(var.config_file))
    error_message = "The configuration file must exist and be readable."
  }
}
```

## Summary

The `sha256` function is the recommended hash function for most Terraform use cases that require security or strong collision resistance. It is the standard for AWS Lambda deployments, content integrity checks, and anywhere you need a reliable fingerprint of your data. At 64 characters, the output is compact enough for practical use while being cryptographically sound. For cases where you need even stronger guarantees, check out [sha512](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sha512-function-in-terraform/view), and for base64-encoded variants used by cloud services, see [base64sha256](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-base64sha256-function-in-terraform/view).
