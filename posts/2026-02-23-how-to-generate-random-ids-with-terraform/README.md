# How to Generate Random IDs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Random Provider, Random ID, Infrastructure as Code, Resource Naming

Description: Learn how to generate random IDs with Terraform using the random_id resource for unique resource identifiers, deployment tracking, and naming collision prevention.

---

The random_id resource in Terraform generates random bytes that can be rendered in various formats including hexadecimal, base64, and decimal. It is one of the most commonly used resources from the random provider because it produces compact, URL-safe identifiers perfect for resource naming, deployment tracking, and preventing naming collisions.

In this guide, we will explore the random_id resource in detail. We will cover its output formats, explain how keepers work, and show practical examples for using random IDs in real infrastructure configurations.

## Understanding random_id

The random_id resource generates a specified number of random bytes and makes them available in multiple encodings. Unlike random_string, which generates characters directly, random_id works at the byte level. This means a 4-byte random ID gives you exactly 8 hexadecimal characters, making the output length predictable and consistent.

## Basic Usage

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Generating a Simple Random ID

```hcl
# simple-id.tf - Basic random ID generation
resource "random_id" "example" {
  byte_length = 8  # 8 bytes = 16 hex characters
}

# Access the random ID in different formats
output "hex" {
  description = "Hexadecimal representation"
  value       = random_id.example.hex
  # Example: "a1b2c3d4e5f67890"
}

output "b64_url" {
  description = "URL-safe base64 representation"
  value       = random_id.example.b64_url
  # Example: "obLDTE9fZJA"
}

output "b64_std" {
  description = "Standard base64 representation"
  value       = random_id.example.b64_std
  # Example: "obLDTE9fZJA="
}

output "dec" {
  description = "Decimal representation"
  value       = random_id.example.dec
  # Example: "11650064783328953488"
}
```

## Using Random IDs for S3 Bucket Names

The most common use case is creating globally unique resource names:

```hcl
# s3-buckets.tf - Unique bucket names with random IDs
variable "environment" {
  type    = string
  default = "production"
}

variable "project" {
  type    = string
  default = "webapp"
}

# Short suffix for bucket names
resource "random_id" "bucket" {
  byte_length = 4  # 8 hex characters
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-assets-${var.environment}-${random_id.bucket.hex}"
  # Result: webapp-assets-production-a1b2c3d4
}

resource "aws_s3_bucket" "logs" {
  bucket = "${var.project}-logs-${var.environment}-${random_id.bucket.hex}"
  # Result: webapp-logs-production-a1b2c3d4
}

resource "aws_s3_bucket" "backups" {
  bucket = "${var.project}-backups-${var.environment}-${random_id.bucket.hex}"
  # Result: webapp-backups-production-a1b2c3d4
}
```

## Using Keepers to Control ID Lifecycle

The keepers argument determines when the random ID should be regenerated:

```hcl
# keepers.tf - Control when IDs regenerate
# Regenerate when the environment changes
resource "random_id" "env_specific" {
  byte_length = 4

  keepers = {
    environment = var.environment
  }
}

# Regenerate when the application version changes
resource "random_id" "versioned" {
  byte_length = 4

  keepers = {
    app_version = var.app_version
  }
}

variable "app_version" {
  type    = string
  default = "2.0.0"
}

# Regenerate based on multiple factors
resource "random_id" "deployment" {
  byte_length = 6

  keepers = {
    ami_id      = var.ami_id
    environment = var.environment
    timestamp   = var.deploy_timestamp
  }
}

variable "ami_id" {
  type    = string
  default = "ami-12345678"
}

variable "deploy_timestamp" {
  type    = string
  default = "2026-02-23"
}
```

## Generating IDs for Multiple Resources

Use for_each to generate unique IDs for a collection of resources:

```hcl
# multi-id.tf - Generate IDs for multiple resources
variable "services" {
  type    = list(string)
  default = ["api", "web", "worker", "scheduler"]
}

resource "random_id" "service" {
  for_each    = toset(var.services)
  byte_length = 3  # 6 hex characters

  keepers = {
    service_name = each.value
  }
}

# Use the IDs for CloudWatch log groups
resource "aws_cloudwatch_log_group" "service" {
  for_each = toset(var.services)

  name              = "/app/${each.value}-${random_id.service[each.value].hex}"
  retention_in_days = 30

  tags = {
    Service = each.value
    ID      = random_id.service[each.value].hex
  }
}

output "service_ids" {
  description = "Random IDs assigned to each service"
  value       = { for k, v in random_id.service : k => v.hex }
}
```

## Using Random IDs with Prefixes

Add a prefix to the random ID for additional context:

```hcl
# prefix.tf - Random IDs with prefixes
resource "random_id" "server" {
  byte_length = 2      # 4 hex characters
  prefix      = "srv-" # Add a descriptive prefix
}

output "server_id" {
  value = random_id.server.hex
  # Output includes the prefix: srv-a1b2
}

# Use for naming EC2 instances
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name = random_id.server.hex
  }
}
```

## Practical Example - Deployment Tracking

Use random IDs to create unique deployment identifiers:

```hcl
# deployment-tracking.tf - Track deployments with random IDs
resource "random_id" "deploy_id" {
  byte_length = 8

  keepers = {
    deploy_date = formatdate("YYYY-MM-DD", timestamp())
    config_hash = md5(file("${path.module}/config.json"))
  }
}

# Store the deployment ID in SSM Parameter Store
resource "aws_ssm_parameter" "deploy_id" {
  name  = "/${var.environment}/current-deployment-id"
  type  = "String"
  value = random_id.deploy_id.hex

  tags = {
    Environment = var.environment
    DeployedAt  = timestamp()
  }
}

# Tag all resources with the deployment ID
locals {
  common_tags = {
    DeploymentID = random_id.deploy_id.hex
    Environment  = var.environment
    ManagedBy    = "terraform"
  }
}
```

## Byte Length and Collision Probability

Choosing the right byte length depends on your uniqueness requirements:

```hcl
# byte-lengths.tf - Different byte lengths for different needs
# 2 bytes = 65,536 possible values (good for small sets)
resource "random_id" "small" {
  byte_length = 2
}

# 4 bytes = ~4.3 billion possible values (good for most use cases)
resource "random_id" "medium" {
  byte_length = 4
}

# 8 bytes = ~18 quintillion possible values (effectively collision-free)
resource "random_id" "large" {
  byte_length = 8
}

# 16 bytes = 128-bit identifier (UUID-equivalent entropy)
resource "random_id" "xlarge" {
  byte_length = 16
}

output "id_lengths" {
  value = {
    "2_bytes_hex"  = random_id.small.hex   # 4 chars
    "4_bytes_hex"  = random_id.medium.hex  # 8 chars
    "8_bytes_hex"  = random_id.large.hex   # 16 chars
    "16_bytes_hex" = random_id.xlarge.hex  # 32 chars
  }
}
```

## Conclusion

The random_id resource is a versatile tool for generating unique identifiers in Terraform. Its byte-based approach gives you precise control over the entropy and output length of your identifiers. By using keepers effectively, you can control exactly when IDs regenerate, tying them to meaningful infrastructure changes. Whether you need globally unique bucket names or deployment tracking IDs, random_id has you covered. For other random value types, see our guides on [random passwords](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-passwords-with-terraform/view) and [random UUIDs](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-uuids-with-terraform/view).
