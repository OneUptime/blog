# How to Handle terraform.tfvars vs variables.tf Properly

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Configuration, Best Practices, Infrastructure as Code

Description: Understand the difference between terraform.tfvars and variables.tf in Terraform, learn when to use each file, and establish proper patterns for managing variable definitions and values.

---

Every Terraform project has at least two files that deal with variables: `variables.tf` and `terraform.tfvars`. New users often confuse them, put things in the wrong file, or skip one entirely. The distinction is simple once you understand it, but getting it wrong leads to configurations that are hard to share, hard to review, and hard to maintain.

This post explains exactly what each file does, when to use each one, and how to organize them in real projects.

## The Basic Distinction

**`variables.tf`** defines variables - their names, types, descriptions, defaults, and validation rules. It is the schema. It answers "what variables exist and what are the rules?"

**`terraform.tfvars`** provides values for those variables. It is the data. It answers "what are the actual values for this deployment?"

```hcl
# variables.tf - the definition
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}
```

```hcl
# terraform.tfvars - the values
environment    = "production"
instance_type  = "m5.large"
instance_count = 3
```

## What Goes in variables.tf

Everything about the variable's definition:

- `type` - The data type (string, number, bool, list, map, object)
- `description` - What the variable is for
- `default` - The fallback value if none is provided
- `validation` - Rules the value must satisfy
- `sensitive` - Whether to hide the value in output
- `nullable` - Whether null is an allowed value

```hcl
# variables.tf - complete variable definitions

variable "project" {
  description = "Project name used in resource naming"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]+$", var.project))
    error_message = "Project name must be lowercase alphanumeric with hyphens."
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "database_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
```

## What Goes in terraform.tfvars

Only values. No type definitions, no descriptions, no validation rules.

```hcl
# terraform.tfvars - just values

project     = "orderservice"
environment = "production"
vpc_cidr    = "10.1.0.0/16"

tags = {
  CostCenter = "engineering"
  Team       = "platform"
}
```

Notice that `database_password` is not in the tfvars file. Sensitive values should come from environment variables, a secrets manager, or a separate file that is not committed to version control.

## How Terraform Loads Variables

Terraform loads variable values from multiple sources, in this order of precedence (later sources override earlier ones):

1. **Default values** in `variables.tf`
2. **`terraform.tfvars`** or `terraform.tfvars.json` (automatically loaded)
3. **`*.auto.tfvars`** or `*.auto.tfvars.json` files (automatically loaded, alphabetical order)
4. **`-var-file` flag** on the command line
5. **`-var` flag** on the command line
6. **`TF_VAR_` environment variables**

```bash
# Using -var-file to load a specific file
terraform plan -var-file="production.tfvars"

# Using -var for individual values
terraform plan -var="instance_type=m5.xlarge"

# Using environment variables
export TF_VAR_database_password="supersecret123"
terraform plan
```

## Common Mistakes

### Mistake 1: Putting Values in variables.tf

```hcl
# Wrong - hardcoded value in the definition file
variable "environment" {
  type    = string
  default = "production"  # This is a default, not a deployment-specific value
}
```

If the default is always "production", it is not really a variable. If different deployments use different environments, put the actual value in tfvars:

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Deployment environment"
  # No default - force the caller to specify it
}

# production.tfvars
environment = "production"

# dev.tfvars
environment = "dev"
```

### Mistake 2: Defining Variables in terraform.tfvars

```hcl
# Wrong - you cannot define variable types or validation in tfvars
# terraform.tfvars does NOT support this:
variable "environment" {  # This is a syntax error in .tfvars
  type = string
}
```

The tfvars file only accepts `key = value` assignments.

### Mistake 3: Committing terraform.tfvars with Secrets

```hcl
# terraform.tfvars - DO NOT commit this if it contains secrets
database_password = "my-super-secret-password"
api_key           = "sk-1234567890abcdef"
```

Instead, use environment variables or a separate file:

```bash
# .gitignore
*.tfvars
!*.tfvars.example

# Use environment variables for secrets
export TF_VAR_database_password="my-super-secret-password"
```

### Mistake 4: Using terraform.tfvars in Modules

Modules do not load `terraform.tfvars`. Values are passed through the module block:

```hcl
# This is the root module's main.tf
module "vpc" {
  source = "./modules/vpc"

  # Pass values explicitly to the module
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  project     = var.project
}
```

The root module reads from `terraform.tfvars`. Child modules receive values through their module block arguments.

## Recommended File Organization

Here is a standard file layout:

```text
project/
  variables.tf          # Variable definitions (committed)
  outputs.tf            # Output definitions (committed)
  main.tf               # Resource definitions (committed)
  locals.tf             # Local values (committed)
  providers.tf          # Provider configuration (committed)
  terraform.tfvars      # Default values (committed if no secrets)
  dev.tfvars            # Dev-specific values (committed if no secrets)
  staging.tfvars        # Staging-specific values (committed if no secrets)
  production.tfvars     # Production-specific values (committed if no secrets)
  secrets.tfvars        # Sensitive values (NOT committed, in .gitignore)
```

Usage:

```bash
# Deploy to dev
terraform plan -var-file="dev.tfvars" -var-file="secrets.tfvars"

# Deploy to production
terraform plan -var-file="production.tfvars" -var-file="secrets.tfvars"
```

## Auto-Loading with auto.tfvars

Files ending in `.auto.tfvars` are loaded automatically without needing `-var-file`:

```text
project/
  variables.tf
  main.tf
  common.auto.tfvars    # Automatically loaded
  region.auto.tfvars    # Automatically loaded
  terraform.tfvars      # Automatically loaded
```

```hcl
# common.auto.tfvars
project   = "orderservice"
team      = "platform"
owner     = "platform-team@company.com"

# region.auto.tfvars
aws_region = "us-east-1"
```

Auto-loaded files are processed in alphabetical order. Use them for values that apply to all environments in a given working directory.

## Variable Precedence Example

```hcl
# variables.tf
variable "instance_type" {
  default = "t3.micro"  # Precedence: 1 (lowest)
}

# terraform.tfvars
instance_type = "t3.small"  # Precedence: 2

# prod.auto.tfvars
instance_type = "t3.medium"  # Precedence: 3
```

```bash
# -var-file overrides auto.tfvars
terraform plan -var-file="override.tfvars"  # Precedence: 4

# -var overrides everything except env vars
terraform plan -var="instance_type=m5.large"  # Precedence: 5

# Environment variable has highest precedence
TF_VAR_instance_type="m5.xlarge" terraform plan  # Precedence: 6
```

## When to Use Defaults vs. tfvars

Use defaults in `variables.tf` when:
- The value is a sensible fallback for most deployments
- The value is a technical default (like a port number)
- You want the module to work without any tfvars

Use `terraform.tfvars` when:
- The value is specific to a particular deployment
- Different environments need different values
- The value has no universal default

```hcl
# variables.tf - good defaults
variable "health_check_path" {
  type    = string
  default = "/health"  # Sensible default for most apps
}

variable "container_port" {
  type    = number
  default = 8080  # Common application port
}

# variables.tf - no default (force the caller to decide)
variable "environment" {
  type        = string
  description = "Must be explicitly set for each deployment"
}

variable "domain_name" {
  type        = string
  description = "Varies by deployment"
}
```

## Summary

The rule is straightforward: `variables.tf` defines the shape and rules, `terraform.tfvars` provides the values. Keep definitions and values separate. Use environment-specific tfvars files for multi-environment deployments. Never commit secrets in tfvars files. And remember that modules do not read tfvars files directly - pass values through module blocks. Getting this structure right from the start saves significant headaches as your Terraform project grows.

For more on structuring Terraform variables, see our guide on [environment-specific variable files](https://oneuptime.com/blog/post/2026-02-23-how-to-use-environment-specific-variable-files-in-terraform/view).
