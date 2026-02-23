# How to Create Terraform Style Guides for Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Style Guide, Best Practices, Team Collaboration, Infrastructure as Code

Description: Build a comprehensive Terraform style guide that promotes consistency, reduces review friction, and makes infrastructure code easier to read and maintain.

---

When every engineer on your team writes Terraform differently, the codebase becomes a maze of inconsistent naming conventions, variable patterns, and file organizations. One person puts all resources in a single `main.tf`. Another splits every resource into its own file. Someone uses snake_case for everything while a colleague prefers kebab-case for certain identifiers.

A style guide eliminates these inconsistencies. It gives your team a shared vocabulary and set of patterns that make code reviews faster, onboarding smoother, and maintenance easier.

## Why Style Guides Matter for Terraform

Consistency in Terraform code is not about aesthetics. It directly affects how quickly engineers can understand and safely modify infrastructure. When everything follows a predictable pattern, you spend less time figuring out where things are and more time evaluating whether changes are correct.

Style guides also reduce review friction. Without them, code reviews devolve into debates about personal preferences. With them, reviewers can focus on what matters: the infrastructure impact of the change.

## File Organization Standards

Define how files should be organized within a Terraform configuration:

```hcl
# Standard file structure for each environment or module:

# main.tf - Primary resource definitions
# This file contains the core resources for this configuration.
# For large configurations, split resources into domain-specific files
# like networking.tf, compute.tf, database.tf.

# variables.tf - All input variable declarations
# Variables are declared here and documented with descriptions.
# Default values are set where appropriate.

# outputs.tf - All output value declarations
# Outputs expose useful information about created resources.

# providers.tf - Provider configurations
# Provider blocks and required_providers go here.

# versions.tf - Version constraints
# Terraform version and provider version constraints.

# backend.tf - Backend configuration
# State storage and locking configuration.

# locals.tf - Local value definitions
# Computed values and data transformations.

# data.tf - Data source lookups
# All data source blocks for referencing existing resources.
```

This structure means anyone can find what they need without searching. Variables are always in `variables.tf`. Outputs are always in `outputs.tf`. There is no guessing.

## Naming Conventions

Naming is one of the most contentious topics. Settle it once in your style guide:

```hcl
# Resource naming convention: use snake_case for all Terraform identifiers
# Format: <resource_type_abbreviation>_<descriptive_name>

# GOOD: Clear, descriptive names
resource "aws_instance" "web_server" {
  # ...
}

resource "aws_security_group" "web_server_sg" {
  # ...
}

resource "aws_db_instance" "orders_primary" {
  # ...
}

# BAD: Vague or inconsistent names
resource "aws_instance" "instance1" {
  # ...
}

resource "aws_security_group" "WebServerSG" {
  # Use snake_case, not PascalCase
}

resource "aws_db_instance" "db" {
  # Too generic when you have multiple databases
}
```

Define tag naming conventions as well:

```hcl
# Tag naming convention: PascalCase for keys
# Standard tags required on all resources:

locals {
  # Common tags applied to every resource
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = var.team_name
    CostCenter  = var.cost_center
  }
}

resource "aws_instance" "web_server" {
  # ...

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-web"
    Role = "web-server"
  })
}
```

## Variable Conventions

Standardize how variables are declared and used:

```hcl
# Variable declaration standards

# Always include a description
# Always specify a type
# Use validation blocks for constraints
# Group related variables together with comments

# --- Networking Variables ---

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC. Must be a /16 or larger."

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "The VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for private subnets, one per availability zone."

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least two private subnets are required for high availability."
  }
}

# --- Compute Variables ---

variable "instance_type" {
  type        = string
  description = "EC2 instance type for the web servers."
  default     = "t3.medium"
}

variable "instance_count" {
  type        = number
  description = "Number of web server instances to create."
  default     = 2

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}
```

For variable files, establish a convention:

```hcl
# terraform.tfvars - Default values for all environments (if applicable)
# <environment>.tfvars - Environment-specific overrides

# Example: production.tfvars
vpc_cidr             = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
instance_type        = "t3.large"
instance_count       = 4
```

## Module Standards

Define how modules should be structured and used:

```hcl
# Module structure standard
# modules/<module-name>/
#   main.tf          - Primary resource definitions
#   variables.tf     - Input variables
#   outputs.tf       - Output values
#   README.md        - Module documentation
#   versions.tf      - Required providers and versions
#   examples/        - Example usage
#     basic/
#       main.tf

# Module source conventions:
# - Internal modules: Use relative paths
module "networking" {
  source = "../../modules/networking"
  # ...
}

# - Versioned registry modules: Always pin the version
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.2.0"  # Always pin, never use ">=" or "~>"
  # ...
}

# - Git modules: Use tags, not branches
module "custom" {
  source = "git::https://github.com/org/terraform-module.git?ref=v1.2.0"
  # ...
}
```

## Output Standards

Standardize output naming and documentation:

```hcl
# Output naming convention: <resource>_<attribute>
# Always include a description
# Mark sensitive outputs appropriately

output "vpc_id" {
  description = "The ID of the created VPC."
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs."
  value       = aws_subnet.private[*].id
}

output "database_endpoint" {
  description = "The connection endpoint for the RDS instance."
  value       = aws_db_instance.main.endpoint
}

output "database_password" {
  description = "The generated database password."
  value       = random_password.db.result
  sensitive   = true
}
```

## Comment Standards

Define when and how to use comments:

```hcl
# Comments explain WHY, not WHAT
# The code shows what is happening; comments explain the reasoning

# BAD: Restating the code
# Create an S3 bucket
resource "aws_s3_bucket" "logs" {
  bucket = "company-logs"
}

# GOOD: Explaining the reasoning
# Separate bucket for access logs required by compliance policy SEC-2024-001.
# Lifecycle policy deletes logs after 90 days per data retention agreement.
resource "aws_s3_bucket" "access_logs" {
  bucket = "company-access-logs"
}

# Use comments to document non-obvious decisions
# Using gp3 instead of gp2 for 20% cost savings at same performance level.
# Benchmarked in INFRA-1234.
resource "aws_ebs_volume" "data" {
  type = "gp3"
  size = 100
  # ...
}
```

## Enforcing the Style Guide

A style guide that is not enforced becomes shelf-ware. Automate enforcement where possible:

```yaml
# .github/workflows/style-check.yml
name: Terraform Style Check

on:
  pull_request:

jobs:
  style:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Enforce formatting
      - name: Check Format
        run: terraform fmt -check -recursive -diff

      # Enforce naming conventions and best practices
      - name: TFLint
        uses: terraform-linters/setup-tflint@v4
      - run: |
          tflint --init
          tflint --recursive

      # Check for required tags, descriptions, etc.
      - name: Custom Style Checks
        run: |
          # Check all variables have descriptions
          for file in $(find . -name "variables.tf"); do
            if grep -P 'variable\s+"[^"]+"' "$file" | grep -v description; then
              echo "Variables without descriptions found in $file"
              exit 1
            fi
          done
```

Create a `.tflint.hcl` configuration that enforces your team's rules:

```hcl
# .tflint.hcl
config {
  module = true
}

# Enforce naming conventions
rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

# Require descriptions on variables and outputs
rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

# Prevent deprecated syntax
rule "terraform_deprecated_interpolation" {
  enabled = true
}

# Require type declarations
rule "terraform_typed_variables" {
  enabled = true
}
```

## Evolving the Style Guide

A style guide should evolve with your team. Establish a process for proposing changes:

1. Open an issue or RFC describing the proposed style change
2. Team discusses and votes on the change
3. If approved, update the style guide document
4. Update automated checks to enforce the new rule
5. Optionally, apply the change to existing code in a dedicated PR

Do not change the style guide too frequently. Constant changes create churn and confusion. Batch updates quarterly.

For more on establishing team processes around Terraform, see our guide on [implementing Terraform code review guidelines](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-terraform-code-review-guidelines/view).

A good style guide removes ambiguity without being overly prescriptive. It should answer the question "how should I write this?" without dictating every detail. Focus on the decisions that matter most: file organization, naming, and documentation. Let automated tools handle the rest.
