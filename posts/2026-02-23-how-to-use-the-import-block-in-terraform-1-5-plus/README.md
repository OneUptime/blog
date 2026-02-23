# How to Use the import Block in Terraform 1.5+

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Import Block, Infrastructure as Code, Migration, Terraform 1.5

Description: Learn how to use the import block introduced in Terraform 1.5 for declarative resource imports, batch imports, and automated configuration generation from existing infrastructure.

---

Terraform 1.5 introduced the import block, a declarative way to import existing resources into Terraform state. Unlike the older terraform import command, the import block is defined in your configuration files, making imports reviewable, version-controlled, and repeatable. This is a major improvement for teams adopting Terraform on existing infrastructure.

In this guide, we will explore the import block in detail, covering basic usage, batch imports, for_each imports, configuration generation, and best practices for large-scale migrations.

## Understanding the Import Block

The import block tells Terraform to adopt an existing resource into its state during the next apply. It takes two arguments: `to` specifies the Terraform resource address, and `id` specifies the provider-specific identifier of the existing resource. After a successful import, you can remove the import block from your configuration.

## Basic Import Block Syntax

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
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

## Importing a Single Resource

```hcl
# Write the resource configuration first
resource "aws_s3_bucket" "data" {
  bucket = "my-existing-bucket"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Add the import block
import {
  to = aws_s3_bucket.data
  id = "my-existing-bucket"
}
```

Then run the workflow:

```bash
# Preview the import
terraform plan

# Execute the import
terraform apply

# Verify no drift
terraform plan
# Output: No changes. Your infrastructure matches the configuration.
```

## Importing Multiple Resources

```hcl
# multiple-imports.tf - Import several resources at once
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "main-vpc" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id
}

# Import all at once
import {
  to = aws_vpc.main
  id = "vpc-0abcd1234"
}

import {
  to = aws_subnet.public_a
  id = "subnet-0aaaa1111"
}

import {
  to = aws_subnet.public_b
  id = "subnet-0bbbb2222"
}

import {
  to = aws_security_group.web
  id = "sg-0cccc3333"
}
```

## Using for_each with Import Blocks

Terraform 1.7+ supports for_each in import blocks:

```hcl
# for-each-import.tf - Import multiple similar resources
variable "existing_buckets" {
  type = map(string)
  default = {
    "logs"    = "company-logs-bucket"
    "backups" = "company-backups-bucket"
    "data"    = "company-data-bucket"
  }
}

resource "aws_s3_bucket" "buckets" {
  for_each = var.existing_buckets
  bucket   = each.value
}

import {
  for_each = var.existing_buckets
  to       = aws_s3_bucket.buckets[each.key]
  id       = each.value
}
```

## Import with Configuration Generation

Terraform 1.5+ can generate configuration for imported resources:

```bash
# Generate configuration from an import
terraform plan -generate-config-out=generated.tf
```

This creates a `generated.tf` file with the resource configuration matching the imported state:

```hcl
# generated.tf - Auto-generated configuration
# Note: Review and clean up this generated configuration
resource "aws_instance" "app" {
  ami                    = "ami-0abcdef1234567890"
  instance_type          = "t3.large"
  subnet_id              = "subnet-0aaaa1111"
  vpc_security_group_ids = ["sg-0cccc3333"]
  key_name               = "deploy-key"

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = {
    Name = "app-server"
  }
}
```

## Import Block in Modules

Import blocks work with modules too:

```hcl
# Import a resource that lives inside a module
import {
  to = module.networking.aws_vpc.main
  id = "vpc-0abcd1234"
}

import {
  to = module.networking.aws_subnet.public["us-east-1a"]
  id = "subnet-0aaaa1111"
}
```

## Differences from terraform import Command

The import block has several advantages over the legacy command:

```hcl
# Legacy approach (command line):
# terraform import aws_s3_bucket.data my-existing-bucket
# - Not version controlled
# - Cannot be previewed with plan
# - One resource at a time

# Modern approach (import block):
import {
  to = aws_s3_bucket.data
  id = "my-existing-bucket"
}
# - Version controlled in config files
# - Previewed in terraform plan
# - Multiple imports at once
# - Supports for_each
# - Can generate configuration
```

## Handling Import Errors

When imports fail, common issues include:

```hcl
# 1. Resource configuration does not match - adjust config to match reality
resource "aws_instance" "app" {
  # If plan shows changes after import, update these values
  # to match the actual resource
  ami           = "ami-actual-value"  # Must match real AMI
  instance_type = "t3.large"          # Must match real type
}

# 2. Wrong resource ID format
import {
  to = aws_instance.app
  id = "i-1234567890abcdef0"  # Must be the actual instance ID
}

# 3. Resource already in state
# If you get "already managed by Terraform", the resource
# was already imported. Remove the import block.
```

## Best Practices for Import Blocks

Follow these practices for smooth imports:

1. Always write the resource configuration before adding the import block
2. Run terraform plan to preview the import before applying
3. After successful import, verify with terraform plan that there is no drift
4. Remove import blocks after successful import (they are one-time operations)
5. Use for_each for importing groups of similar resources
6. Use -generate-config-out for resources with many attributes
7. Review generated configuration and clean up unnecessary attributes

```hcl
# Clean import workflow
# Step 1: Write config
resource "aws_instance" "app" {
  ami           = "ami-12345"
  instance_type = "t3.large"
}

# Step 2: Add import block
import {
  to = aws_instance.app
  id = "i-12345"
}

# Step 3: terraform plan, terraform apply
# Step 4: Verify terraform plan shows no changes
# Step 5: Remove the import block
# Step 6: Commit the final configuration
```

## Conclusion

The import block in Terraform 1.5+ transforms resource import from a one-off CLI operation into a declarative, version-controlled workflow. Combined with configuration generation, it makes adopting existing infrastructure into Terraform significantly easier. For provider-specific import guides, see [AWS imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-aws-resources-into-terraform/view), [Azure imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-azure-resources-into-terraform/view), [GCP imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-gcp-resources-into-terraform/view), and [Kubernetes imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-kubernetes-resources-into-terraform/view). For automating configuration from imports, see [generating configuration from imported resources](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-configuration-from-imported-resources/view).
