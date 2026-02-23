# How to Pass Variables via terraform.tfvars File

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Configuration, Infrastructure as Code, DevOps

Description: Learn how to use terraform.tfvars files to set variable values in Terraform, including file format, auto-loading behavior, and best practices for managing configurations.

---

The `terraform.tfvars` file is the standard way to set variable values in a Terraform project. It is automatically loaded by Terraform whenever you run `plan`, `apply`, or `destroy` - no extra flags needed. If you have a Terraform project with more than a couple of variables, you are probably already using one.

This post covers the format, auto-loading behavior, best practices, and common patterns for working with `terraform.tfvars` files.

## What is terraform.tfvars?

The `terraform.tfvars` file is a plain text file that assigns values to your declared variables. Terraform automatically looks for this file in the working directory and loads it without any command-line arguments.

```hcl
# terraform.tfvars

# These values are automatically loaded by Terraform
environment    = "production"
region         = "us-east-1"
instance_count = 3
instance_type  = "t3.medium"
enable_monitoring = true
```

With matching variable declarations:

```hcl
# variables.tf

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = false
}
```

When you run `terraform plan`, Terraform reads `terraform.tfvars` automatically and assigns those values to the corresponding variables.

## File Format

The `terraform.tfvars` file uses HCL syntax (the same language as your `.tf` files) but only for variable assignments. You cannot put resource blocks, data sources, or any other Terraform constructs in this file.

### Simple Types

```hcl
# terraform.tfvars

# Strings
project_name = "my-web-app"
owner        = "platform-team"

# Numbers
port       = 8080
disk_size  = 100

# Booleans
enable_https    = true
create_bastion  = false
```

### Lists

```hcl
# terraform.tfvars

# List of strings
availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c",
]

# List of numbers
allowed_ports = [80, 443, 8080, 8443]

# Note the trailing comma after the last element.
# HCL allows this and it makes diffs cleaner.
```

### Maps

```hcl
# terraform.tfvars

# Map of strings
tags = {
  Project     = "web-app"
  Environment = "production"
  Team        = "platform"
  CostCenter  = "engineering"
}

# Map of instance types per environment
instance_types = {
  dev     = "t3.micro"
  staging = "t3.small"
  prod    = "t3.large"
}
```

### Objects

```hcl
# terraform.tfvars

# Object with mixed types
database_config = {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"
  storage_gb     = 100
  multi_az       = true
  backup_days    = 30
}
```

### Lists of Objects

```hcl
# terraform.tfvars

# List of subnet configurations
subnets = [
  {
    name = "public-1"
    cidr = "10.0.1.0/24"
    az   = "us-east-1a"
    public = true
  },
  {
    name = "public-2"
    cidr = "10.0.2.0/24"
    az   = "us-east-1b"
    public = true
  },
  {
    name = "private-1"
    cidr = "10.0.10.0/24"
    az   = "us-east-1a"
    public = false
  },
  {
    name = "private-2"
    cidr = "10.0.11.0/24"
    az   = "us-east-1b"
    public = false
  },
]
```

## Auto-Loading Behavior

Terraform automatically loads these files (in this order):

1. `terraform.tfvars` - if it exists in the working directory
2. `terraform.tfvars.json` - if it exists (JSON format variant)
3. Any files ending in `.auto.tfvars` or `.auto.tfvars.json` (in alphabetical order)

You do not need to pass any flags for these files. Terraform just picks them up.

```bash
# All of these are auto-loaded:
# terraform.tfvars
# terraform.tfvars.json
# *.auto.tfvars
# *.auto.tfvars.json

# Just run terraform normally
terraform plan
terraform apply
```

For any other `.tfvars` file, you need to explicitly specify it:

```bash
# Named tfvars files require -var-file
terraform apply -var-file="production.tfvars"
terraform apply -var-file="secrets.tfvars"
```

## Project Structure Patterns

### Single Environment

For projects that target a single environment, `terraform.tfvars` is all you need:

```
project/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars       # Auto-loaded values
```

### Multiple Environments with Named Files

For multi-environment setups, use named tfvars files:

```
project/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars       # Common defaults
  dev.tfvars             # Dev-specific overrides
  staging.tfvars         # Staging-specific overrides
  production.tfvars      # Production-specific overrides
```

```bash
# Deploy to different environments
terraform apply -var-file="dev.tfvars"
terraform apply -var-file="staging.tfvars"
terraform apply -var-file="production.tfvars"
```

### Separating Secrets

Keep sensitive values in a separate file that is excluded from version control:

```
project/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars       # Non-sensitive values (committed)
  secrets.tfvars         # Sensitive values (gitignored)
  .gitignore             # Contains secrets.tfvars
```

```hcl
# terraform.tfvars (committed to git)
environment    = "production"
region         = "us-east-1"
instance_type  = "t3.large"
instance_count = 3

# secrets.tfvars (gitignored)
db_password     = "super-secret-password"
api_key         = "sk-1234567890abcdef"
tls_private_key = "-----BEGIN PRIVATE KEY-----\n..."
```

```bash
terraform apply -var-file="secrets.tfvars"
# terraform.tfvars is loaded automatically
# secrets.tfvars is loaded via the -var-file flag
```

```gitignore
# .gitignore
secrets.tfvars
*.secret.tfvars
```

## terraform.tfvars.json Alternative

You can use JSON format instead of HCL:

```json
{
  "environment": "production",
  "region": "us-east-1",
  "instance_count": 3,
  "enable_monitoring": true,
  "availability_zones": ["us-east-1a", "us-east-1b"],
  "tags": {
    "Project": "web-app",
    "Team": "platform"
  }
}
```

This is useful when generating variable values programmatically, since JSON is easier to produce from scripts.

## Comments in terraform.tfvars

HCL-format tfvars files support comments, which is one advantage over JSON:

```hcl
# terraform.tfvars

# General settings
environment = "production"
region      = "us-east-1"

# Compute settings
# Increased to 5 after the traffic spike on 2026-01-15
instance_count = 5
instance_type  = "t3.large"

# Networking
# Using 10.1.0.0/16 because 10.0.0.0/16 is used by the legacy VPC
vpc_cidr = "10.1.0.0/16"

# Feature flags
enable_monitoring = true
enable_backups    = true
# Disabled until the WAF rules are reviewed
# enable_waf      = true
```

## Validating Your tfvars File

If there is a typo or a type mismatch in your tfvars file, Terraform catches it during the plan or validate phase.

```hcl
# terraform.tfvars

# Typo in variable name - Terraform will warn
enviornment = "production"  # Warning: no matching variable declared

# Type mismatch - Terraform will error
instance_count = "three"  # Error: expected number, got string
```

You can catch these early with:

```bash
terraform validate
```

## A Complete Working Example

Here is a full example showing how `terraform.tfvars` fits into a real project:

```hcl
# variables.tf

variable "project" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "min_instances" {
  description = "Minimum number of instances in the ASG"
  type        = number
}

variable "max_instances" {
  description = "Maximum number of instances in the ASG"
  type        = number
}

variable "enable_cdn" {
  description = "Whether to create a CloudFront distribution"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# terraform.tfvars

project     = "web-store"
environment = "prod"
region      = "us-east-1"
vpc_cidr    = "10.0.0.0/16"

instance_type = "t3.large"
min_instances = 3
max_instances = 10

enable_cdn = true

tags = {
  CostCenter = "retail"
  Owner      = "web-team"
  Compliance = "pci-dss"
}
```

```hcl
# main.tf

provider "aws" {
  region = var.region
}

locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = merge(var.tags, {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}
```

## Best Practices

1. **Commit terraform.tfvars for shared projects.** If your team works from the same Terraform configuration, committing the tfvars file ensures everyone uses consistent values.

2. **Never commit secrets.** Keep passwords, API keys, and tokens in a separate gitignored file or use environment variables.

3. **Use comments liberally.** Document why values are set the way they are, especially if they were changed from defaults for a specific reason.

4. **Use trailing commas in lists and maps.** This makes future diffs cleaner when adding new items.

5. **Keep it flat when possible.** Deeply nested structures in tfvars files become hard to read. Consider using multiple simpler variables instead of one complex object.

## Wrapping Up

The `terraform.tfvars` file is the most common and convenient way to set variable values in Terraform. It is automatically loaded, supports the full HCL syntax including comments, and works with all variable types. For most projects, a well-organized `terraform.tfvars` file combined with named tfvars files for environment-specific overrides will cover all your needs.

For other ways to pass variables and how they interact, see our guide on [variable precedence in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-variable-precedence-in-terraform/view).
