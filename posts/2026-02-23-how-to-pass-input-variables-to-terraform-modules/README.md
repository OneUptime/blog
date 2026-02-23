# How to Pass Input Variables to Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Variables, Infrastructure as Code, DevOps

Description: Learn how to define and pass input variables to Terraform modules, including required and optional variables, complex types, validation rules, and best practices.

---

Input variables are the primary way you configure Terraform modules. They define the interface between the caller and the module, letting you customize what the module creates without modifying its internal code. Getting the variable design right makes the difference between a module that is pleasant to use and one that is a constant source of frustration.

This guide covers how to define variables inside modules, how to pass values from the caller, and the patterns that make modules easy to work with.

## Basic Variable Passing

Defining a variable in a module and passing a value to it is straightforward:

```hcl
# modules/web-server/variables.tf - Inside the module
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "server_name" {
  description = "Name tag for the instance"
  type        = string
  # No default - this is required
}
```

```hcl
# main.tf - The caller passes values as arguments
module "web" {
  source = "./modules/web-server"

  server_name   = "production-web"
  instance_type = "t3.large"
}
```

Every argument in the `module` block (except `source`, `version`, `count`, `for_each`, `providers`, and `depends_on`) maps to a variable defined inside the module. If the module has a variable with no default, you must provide a value or Terraform will error out.

## Required vs Optional Variables

The distinction is simple: variables with a `default` are optional; variables without are required.

```hcl
# modules/database/variables.tf

# REQUIRED - the caller must provide these
variable "db_name" {
  description = "Name of the database"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the database will be created"
  type        = string
}

# OPTIONAL - the caller can override these or accept defaults
variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "backup_retention" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "multi_az" {
  description = "Whether to enable multi-AZ deployment"
  type        = bool
  default     = false
}
```

```hcl
# main.tf - Only need to provide required variables
# Optional variables use their defaults
module "database" {
  source = "./modules/database"

  # Required
  db_name = "myapp"
  vpc_id  = module.networking.vpc_id

  # Optional - only override what differs from defaults
  multi_az         = true
  backup_retention = 14
  # engine_version and instance_class use their defaults
}
```

## Complex Variable Types

Terraform supports rich types beyond simple strings and numbers. Here are the common patterns:

### Lists

```hcl
# Module variable
variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "ports" {
  description = "List of ports to open"
  type        = list(number)
  default     = [80, 443]
}
```

```hcl
# Caller
module "app" {
  source = "./modules/app"

  subnet_ids = ["subnet-abc123", "subnet-def456"]
  ports      = [80, 443, 8080]
}
```

### Maps

```hcl
# Module variable
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "environment_config" {
  description = "Configuration per environment"
  type        = map(number)
  default     = {
    dev     = 1
    staging = 2
    prod    = 3
  }
}
```

```hcl
# Caller
module "app" {
  source = "./modules/app"

  tags = {
    Environment = "production"
    Team        = "backend"
    CostCenter  = "engineering"
  }
}
```

### Objects

Objects let you define structured input with specific field types:

```hcl
# Module variable
variable "scaling_config" {
  description = "Auto-scaling configuration"
  type = object({
    min_capacity     = number
    max_capacity     = number
    target_cpu       = number
    scale_in_cooldown  = optional(number, 300)
    scale_out_cooldown = optional(number, 60)
  })
  default = {
    min_capacity = 1
    max_capacity = 10
    target_cpu   = 70
  }
}
```

```hcl
# Caller
module "app" {
  source = "./modules/app"

  scaling_config = {
    min_capacity     = 2
    max_capacity     = 20
    target_cpu       = 60
    scale_in_cooldown = 600
    # scale_out_cooldown uses its optional default of 60
  }
}
```

The `optional()` function (available in Terraform 1.3+) lets you define fields that have their own defaults within an object type, so callers do not need to specify every field.

### Lists of Objects

```hcl
# Module variable
variable "ingress_rules" {
  description = "List of ingress rules for the security group"
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = optional(string, "")
  }))
  default = []
}
```

```hcl
# Caller
module "security" {
  source = "./modules/security-group"

  ingress_rules = [
    {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP from anywhere"
    },
    {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS from anywhere"
    },
    {
      port        = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "SSH from internal network"
    },
  ]
}
```

## Variable Validation

Add validation blocks to catch configuration errors before Terraform tries to create resources:

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 100
    error_message = "Instance count must be between 1 and 100."
  }
}

variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.cidr_block))
    error_message = "Must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)."
  }
}
```

Validation runs before any resources are planned, so callers get immediate feedback about invalid configurations.

## Passing Variables Through Multiple Levels

When you have nested modules (a root module calling Module A, which calls Module B), you need to thread variables through each level:

```hcl
# root/main.tf
module "application" {
  source = "./modules/application"

  environment = var.environment
  vpc_id      = module.networking.vpc_id
  db_host     = module.database.endpoint
}

# modules/application/main.tf
# The application module needs to pass vpc_id down to its sub-module
module "service" {
  source = "./modules/service"

  environment = var.environment  # Pass through
  vpc_id      = var.vpc_id       # Pass through
  app_port    = 8080             # Module-specific value
}

# modules/application/variables.tf
# Must declare variables that get passed through
variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "db_host" {
  type = string
}
```

This threading pattern can get verbose in deep module hierarchies. It is a trade-off: explicit is better than magical, but deep nesting should be avoided when possible.

## Sensitive Variables

Mark variables as sensitive to prevent their values from appearing in plan output and logs:

```hcl
# Module variable
variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}
```

```hcl
# Caller
module "database" {
  source = "./modules/database"

  db_name     = "myapp"
  db_password = var.db_password  # Also marked sensitive in root
}
```

When Terraform plans or applies, it replaces the value with `(sensitive value)` in the output.

## Nullable Variables

By default, variables cannot be set to `null` unless you explicitly allow it:

```hcl
variable "custom_domain" {
  description = "Custom domain name (null to skip domain configuration)"
  type        = string
  default     = null
  nullable    = true
}
```

Inside the module, you can then conditionally create resources:

```hcl
resource "aws_route53_record" "custom" {
  count = var.custom_domain != null ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.custom_domain
  type    = "A"
  # ...
}
```

## Best Practices

1. **Keep required variables to a minimum.** The fewer required variables, the easier the module is to get started with.

2. **Use descriptive names.** `vpc_id` is better than `id`. `enable_monitoring` is better than `monitoring`.

3. **Always add descriptions.** They are the primary documentation for module consumers.

4. **Group related settings into objects.** Instead of five separate auto-scaling variables, use one `scaling_config` object.

5. **Validate early.** Add validation blocks for any constraint you know about.

6. **Use sensible defaults.** Defaults should represent the common case, not the edge case.

## Summary

Passing input variables to Terraform modules is the foundation of module reusability. Define clear, well-typed variables with descriptions and sensible defaults. Use complex types like objects and lists of objects to group related configuration. Add validation rules to catch errors early. And keep the interface minimal - only expose variables that callers actually need to customize. The quality of your variable interface directly determines how easy your module is to use.

For the output side of module interfaces, see [How to Return Output Values from Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-return-output-values-from-terraform-modules/view). For module structure conventions, check out [How to Understand Terraform Module Structure](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-terraform-module-structure/view).
