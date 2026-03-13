# How to Define Local Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Local, DevOps

Description: Learn how to define and use local values in Terraform to create named expressions, reduce repetition, and keep your infrastructure code clean and maintainable.

---

Local values in Terraform let you assign a name to an expression so you can use it throughout your configuration without repeating yourself. If you have ever found yourself copying and pasting the same string interpolation or complex expression across multiple resource blocks, locals are the fix.

This guide walks through the syntax, practical use cases, and best practices for defining local values in Terraform.

## What Are Local Values?

A local value assigns a name to an expression. Think of it like a local variable in a programming language. You define it once inside a `locals` block, and then reference it anywhere in the same module using `local.<name>`.

```hcl
# Define local values in a locals block
locals {
  # Simple string assignment
  environment = "production"

  # String interpolation
  name_prefix = "myapp-${var.region}-${local.environment}"

  # Computed value from other locals and variables
  full_name = "${local.name_prefix}-main"
}
```

You reference local values with the `local` prefix (singular, not plural):

```hcl
resource "aws_s3_bucket" "data" {
  # Reference using local.<name>
  bucket = "${local.name_prefix}-data-bucket"

  tags = {
    Environment = local.environment
    Name        = local.full_name
  }
}
```

## Basic Syntax

The `locals` block (plural) contains one or more local value definitions. You can have multiple `locals` blocks in the same file or spread them across files - Terraform merges them all together.

```hcl
# First locals block - common tags
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = var.team_name
  }
}

# Second locals block - naming conventions
locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  bucket_name     = "${local.resource_prefix}-storage"
  log_group_name  = "/aws/${local.resource_prefix}/logs"
}
```

Both blocks are valid and their values are all accessible throughout the module. Some teams prefer grouping related locals together for readability, while others put everything in a single block.

## Supported Value Types

Locals support every Terraform type. Here are examples of each:

```hcl
locals {
  # String
  region = "us-east-1"

  # Number
  max_instances = 5

  # Boolean
  enable_monitoring = true

  # List
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Map
  instance_sizes = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }

  # Object (map with mixed types)
  database_config = {
    engine         = "postgres"
    engine_version = "15.4"
    port           = 5432
    multi_az       = true
  }

  # Tuple
  cidr_blocks = ["10.0.1.0/24", "10.0.2.0/24"]
}
```

## Using Locals with Resources

The real power of locals shows up when you apply them across multiple resources. Here is a complete example that provisions AWS infrastructure using locals for consistency:

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Project name"
  type        = string
  default     = "webapp"
}

# Define all naming and tagging conventions in one place
locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC uses the naming convention
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

# Subnet follows the same convention
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-subnet"
    Tier = "public"
  })
}

# Security group also follows the convention
resource "aws_security_group" "web" {
  name        = "${local.name_prefix}-web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-sg"
  })
}
```

If you need to change the naming convention later, you update `local.name_prefix` once and every resource picks up the change.

## Locals That Reference Other Locals

Locals can reference other locals. Terraform figures out the dependency order automatically.

```hcl
locals {
  # Base values
  app_name    = "orderservice"
  environment = var.environment
  region      = var.aws_region

  # Derived from base values
  namespace = "${local.app_name}-${local.environment}"

  # Derived from the derived value
  log_group        = "/ecs/${local.namespace}/app"
  s3_prefix        = "${local.namespace}/artifacts"
  parameter_prefix = "/${local.namespace}"

  # Tags that reference other locals
  default_tags = {
    Application = local.app_name
    Environment = local.environment
    Namespace   = local.namespace
  }
}
```

This chain of references is perfectly fine. Just avoid circular references - if local A references local B, local B cannot reference local A.

## Where to Put Your Locals

There is no strict rule, but a common convention is to put locals in one of these locations:

1. **`locals.tf`** - A dedicated file for all local values. This is the most popular approach.
2. **Top of `main.tf`** - Works fine for smaller configurations.
3. **In the file where they are used** - Some teams prefer this for readability.

Here is an example `locals.tf` file:

```hcl
# locals.tf - Centralized local value definitions

locals {
  # Naming
  name_prefix = "${var.project}-${var.environment}"

  # Networking
  vpc_cidr        = "10.0.0.0/16"
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]

  # Tags
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.team_email
  }
}
```

## Common Mistakes to Avoid

**Do not use locals for values that should be variables.** If a value needs to be set by the caller of your module, it should be a variable. Locals are for internal computations.

```hcl
# Wrong - this should be a variable, not a local
locals {
  instance_type = "t3.micro"  # Caller cannot override this
}

# Right - expose it as a variable with a default
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}
```

**Do not over-use locals for simple values.** If a string is only used once and is not computed, putting it in a local just adds indirection.

```hcl
# Overkill - just put the value inline
locals {
  ami_id = "ami-0123456789abcdef0"
}

# Better - use it directly if it appears only once
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = var.instance_type
}
```

**Do not create deeply nested chains.** If you have locals referencing locals referencing locals five levels deep, it becomes hard to trace where a value comes from. Keep the chain shallow.

## Locals vs. Variables vs. Outputs

Here is a quick comparison to help you decide which to use:

| Feature | Variables | Locals | Outputs |
|---------|-----------|--------|---------|
| Set by caller | Yes | No | No |
| Computed from other values | No | Yes | Yes |
| Available outside module | No | No | Yes |
| Can have default value | Yes | N/A | N/A |
| Supports validation | Yes | No | No |

Use variables for external inputs, locals for internal computations, and outputs for values other modules or the CLI need to see.

## A Complete Working Example

Here is a full configuration that ties everything together:

```hcl
# variables.tf
variable "environment" {
  type    = string
  default = "dev"
}

variable "project" {
  type    = string
  default = "blog"
}

variable "aws_region" {
  type    = string
  default = "us-west-2"
}

# locals.tf
locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    Region      = var.aws_region
    ManagedBy   = "terraform"
  }

  # Choose instance size based on environment
  instance_type = var.environment == "prod" ? "t3.large" : "t3.micro"
}

# main.tf
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = local.instance_type

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app"
    Role = "application"
  })
}

# outputs.tf
output "instance_id" {
  value = aws_instance.app.id
}

output "name_prefix" {
  value = local.name_prefix
}
```

This pattern of defining a `name_prefix` and `common_tags` in locals is something you will see in nearly every well-structured Terraform project. It keeps things consistent and easy to change.

## Summary

Local values are one of the simplest but most useful features in Terraform. Define them in `locals` blocks, reference them with `local.<name>`, and use them to avoid repeating expressions throughout your configuration. They keep your code DRY, make naming conventions easy to enforce, and give you a single place to update computed values. Start using them in your next Terraform project and you will immediately see the difference in code clarity.

For more on Terraform variable features, check out our post on [Terraform local values and variables](https://oneuptime.com/blog/post/2026-02-12-terraform-local-values-and-variables/view).
