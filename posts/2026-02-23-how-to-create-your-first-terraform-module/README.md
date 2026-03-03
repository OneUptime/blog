# How to Create Your First Terraform Module

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Infrastructure as Code, DevOps, Beginner

Description: A step-by-step guide to creating your first Terraform module from scratch, covering module structure, variables, outputs, and how to call it from your root configuration.

---

If you have been writing Terraform for a while, you have probably noticed your configurations getting longer and more repetitive. Maybe you copy the same block of resources every time you set up a new environment, or you have three nearly identical VPC configurations with slightly different CIDR ranges. Terraform modules solve this problem by letting you package a set of resources into a reusable unit.

This guide takes you from zero to a working module, step by step.

## What Is a Terraform Module?

A module is just a directory containing `.tf` files. That is it. Every Terraform configuration is technically a module - the directory you run `terraform plan` in is called the "root module." When people say "module," they usually mean a child module that gets called from the root module.

The point of creating a module is to encapsulate a group of related resources behind a clean interface of input variables and output values. Instead of repeating twenty lines of resource configuration everywhere, you call the module with a few parameters.

## Planning Your First Module

Let us build a module that creates an S3 bucket with standard configuration - versioning, encryption, and tags. This is a common real-world pattern because every S3 bucket in an organization should follow the same security baseline.

Here is what we want the module to accept:
- A bucket name
- An environment name (for tagging)
- Whether versioning should be enabled
- Additional tags

And what it should return:
- The bucket ID
- The bucket ARN
- The bucket domain name

## Setting Up the Directory Structure

Create the following structure:

```text
my-project/
  main.tf           # Root module - calls the s3 module
  variables.tf      # Root module variables
  outputs.tf        # Root module outputs
  modules/
    s3-bucket/
      main.tf       # Module resources
      variables.tf  # Module input variables
      outputs.tf    # Module output values
```

Create the directories:

```bash
# Create the module directory
mkdir -p modules/s3-bucket
```

## Writing the Module

### Module Variables (modules/s3-bucket/variables.tf)

Start by defining the inputs your module accepts:

```hcl
# modules/s3-bucket/variables.tf

# Required variable - the caller must provide this
variable "bucket_name" {
  description = "The name of the S3 bucket"
  type        = string

  validation {
    condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "Bucket name must be between 3 and 63 characters."
  }
}

# Required variable for tagging
variable "environment" {
  description = "The deployment environment (e.g., dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Optional variable with a sensible default
variable "enable_versioning" {
  description = "Whether to enable versioning on the bucket"
  type        = bool
  default     = true
}

# Optional map for additional tags
variable "additional_tags" {
  description = "Additional tags to apply to the bucket"
  type        = map(string)
  default     = {}
}
```

### Module Resources (modules/s3-bucket/main.tf)

Now define the resources that the module creates:

```hcl
# modules/s3-bucket/main.tf

# The S3 bucket itself
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  tags = merge(
    {
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.additional_tags,
  )
}

# Versioning configuration
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# Server-side encryption - always on
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access - security best practice
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Module Outputs (modules/s3-bucket/outputs.tf)

Define what information the module exposes to its caller:

```hcl
# modules/s3-bucket/outputs.tf

output "bucket_id" {
  description = "The name of the bucket"
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "The ARN of the bucket"
  value       = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  description = "The bucket domain name"
  value       = aws_s3_bucket.this.bucket_domain_name
}
```

## Calling the Module

Back in your root module, call the S3 bucket module:

```hcl
# main.tf (root module)

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

# Call the module to create a bucket for application logs
module "app_logs_bucket" {
  source = "./modules/s3-bucket"

  bucket_name    = "mycompany-app-logs-${var.environment}"
  environment    = var.environment

  additional_tags = {
    Purpose = "application-logs"
    Team    = "platform"
  }
}

# Call the same module again for a different bucket
module "data_bucket" {
  source = "./modules/s3-bucket"

  bucket_name        = "mycompany-data-${var.environment}"
  environment        = var.environment
  enable_versioning  = true

  additional_tags = {
    Purpose = "data-storage"
    Team    = "data-engineering"
  }
}
```

```hcl
# variables.tf (root module)

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}
```

```hcl
# outputs.tf (root module)

output "logs_bucket_arn" {
  description = "ARN of the application logs bucket"
  value       = module.app_logs_bucket.bucket_arn
}

output "data_bucket_arn" {
  description = "ARN of the data bucket"
  value       = module.data_bucket.bucket_arn
}
```

## Running It

Initialize and plan:

```bash
# Initialize - this downloads providers and registers modules
terraform init

# Plan - see what will be created
terraform plan

# Apply when you are ready
terraform apply
```

When you run `terraform init`, Terraform will find the local module reference and register it. You will see output like:

```text
Initializing modules...
- app_logs_bucket in modules/s3-bucket
- data_bucket in modules/s3-bucket
```

The plan will show all the resources the module creates, prefixed with the module name:

```text
module.app_logs_bucket.aws_s3_bucket.this
module.app_logs_bucket.aws_s3_bucket_versioning.this
module.app_logs_bucket.aws_s3_bucket_server_side_encryption_configuration.this
module.app_logs_bucket.aws_s3_bucket_public_access_block.this
module.data_bucket.aws_s3_bucket.this
...
```

## Common Mistakes to Avoid

**Hardcoding values inside the module.** If something might change between uses, make it a variable. If it should always be the same (like enabling encryption), keep it hardcoded.

**Too many variables.** A module with 30 input variables is hard to use. Group related settings into objects, or split the module into smaller, focused modules.

**Not adding descriptions.** Every variable and output should have a description. This is the documentation that module consumers rely on.

**Forgetting validation.** Add `validation` blocks to catch configuration errors early, before Terraform tries to create resources.

**Not using `this` naming convention.** When a module creates a single primary resource, naming it `this` makes outputs cleaner: `aws_s3_bucket.this.arn` instead of `aws_s3_bucket.bucket.arn`.

## Adding a README

While not required by Terraform, adding a `README.md` to your module directory is a good practice. Document what the module does, what variables it accepts, and show a usage example:

```text
modules/
  s3-bucket/
    README.md       # Usage documentation
    main.tf
    variables.tf
    outputs.tf
```

## Next Steps

Once you are comfortable with local modules, you can:

- Share modules through a [Git repository](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-a-git-repository-in-terraform/view)
- Publish to the [Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-the-terraform-registry/view)
- Store modules in [S3](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-an-s3-bucket-in-terraform/view) or [GCS](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-a-gcs-bucket-in-terraform/view) buckets
- Learn about [module structure conventions](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-terraform-module-structure/view) in depth

## Summary

Creating a Terraform module is straightforward: make a directory, add `.tf` files for resources, variables, and outputs, then call it from your root module using a `module` block with `source` pointing to the directory. The key to a good module is a clean interface - well-named variables with sensible defaults, validation rules, and clear outputs. Start simple, create modules for the patterns you find yourself repeating, and refine the interface as you use the module across more configurations.
