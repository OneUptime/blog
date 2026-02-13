# How to Use Terraform Local Values and Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, HCL, Infrastructure

Description: Understand the differences between Terraform variables, local values, and outputs, and learn when to use each for clean, maintainable AWS infrastructure code.

---

Terraform has three main ways to handle values: input variables, local values, and outputs. They serve different purposes, and knowing when to use each one keeps your configurations clean and maintainable. This guide explains all three with practical AWS examples.

## Input Variables

Input variables are parameters that callers provide to your module or configuration. They're defined with `variable` blocks and referenced with `var.name`.

### Basic Variable Types

```hcl
# String variable with a default
variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  default     = "dev"
}

# Number variable
variable "instance_count" {
  description = "Number of EC2 instances to create"
  type        = number
  default     = 2
}

# Boolean variable
variable "enable_monitoring" {
  description = "Whether to enable detailed monitoring"
  type        = bool
  default     = true
}

# List variable
variable "availability_zones" {
  description = "AZs to deploy resources in"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# Map variable
variable "instance_types" {
  description = "Instance types per environment"
  type        = map(string)
  default = {
    dev        = "t3.micro"
    staging    = "t3.small"
    production = "t3.medium"
  }
}
```

### Complex Variable Types

For structured data, use object types.

```hcl
# Object variable with specific structure
variable "database_config" {
  description = "Database configuration"
  type = object({
    engine         = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
    backup_days    = number
  })
  default = {
    engine         = "postgres"
    instance_class = "db.t3.medium"
    storage_gb     = 20
    multi_az       = false
    backup_days    = 7
  }
}

# List of objects
variable "security_group_rules" {
  description = "Ingress rules for the security group"
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = []
}

# Map of objects
variable "services" {
  description = "Service configurations"
  type = map(object({
    cpu    = number
    memory = number
    port   = number
  }))
  default = {}
}
```

### Variable Validation

Add validation rules to catch bad inputs early.

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.cidr_block))
    error_message = "Must be a valid CIDR block (e.g., 10.0.0.0/16)."
  }
}

variable "instance_count" {
  description = "Number of instances"
  type        = number

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 20
    error_message = "Instance count must be between 1 and 20."
  }
}
```

### Sensitive Variables

Mark sensitive variables to prevent them from showing in logs and console output.

```hcl
variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "Third-party API key"
  type        = string
  sensitive   = true
}
```

### Setting Variable Values

There are several ways to provide values for variables.

```bash
# 1. Command line flags
terraform plan -var="environment=production" -var="instance_count=4"

# 2. Variable file
terraform plan -var-file="production.tfvars"

# 3. Environment variables (prefixed with TF_VAR_)
export TF_VAR_environment="production"
export TF_VAR_instance_count=4
terraform plan

# 4. Auto-loaded files (terraform.tfvars or *.auto.tfvars)
# These are loaded automatically
```

A typical `production.tfvars` file:

```hcl
# production.tfvars
environment    = "production"
instance_count = 4
enable_monitoring = true

database_config = {
  engine         = "postgres"
  instance_class = "db.r6g.large"
  storage_gb     = 100
  multi_az       = true
  backup_days    = 30
}
```

## Local Values

Local values are computed values within your module. They're like private variables - calculated from inputs, data sources, or other locals, but not exposed as inputs.

### Basic Locals

```hcl
locals {
  # Derived from variables
  name_prefix = "${var.project}-${var.environment}"

  # Computed values
  is_production = var.environment == "production"

  # Common tags applied to all resources
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = var.team
  }

  # Conditional values
  instance_type = local.is_production ? "t3.large" : "t3.micro"
  multi_az      = local.is_production ? true : false

  # Merged or transformed data
  all_tags = merge(local.common_tags, var.extra_tags)
}
```

### When to Use Locals vs Variables

Use **variables** when:
- The value comes from outside the module (caller provides it)
- Different environments need different values
- The value is a true parameter of the configuration

Use **locals** when:
- The value is derived from other values
- You want to avoid repeating an expression
- You need to compute something complex
- You want to give a meaningful name to a calculation

Here's a practical example showing both.

```hcl
# Variables - inputs from the caller
variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

# Locals - computed from inputs
locals {
  # Naming convention
  name_prefix = "${var.project}-${var.environment}"

  # Subnet CIDR calculation
  public_subnets = [
    cidrsubnet(var.vpc_cidr, 8, 1),
    cidrsubnet(var.vpc_cidr, 8, 2),
  ]
  private_subnets = [
    cidrsubnet(var.vpc_cidr, 8, 10),
    cidrsubnet(var.vpc_cidr, 8, 11),
  ]

  # Environment-specific settings
  settings = {
    dev = {
      instance_type = "t3.micro"
      min_size      = 1
      max_size      = 2
    }
    staging = {
      instance_type = "t3.small"
      min_size      = 2
      max_size      = 4
    }
    production = {
      instance_type = "t3.medium"
      min_size      = 3
      max_size      = 10
    }
  }

  # Look up settings for the current environment
  current_settings = local.settings[var.environment]
}

# Use locals in resources
resource "aws_instance" "app" {
  count         = local.current_settings.min_size
  ami           = data.aws_ami.app.id
  instance_type = local.current_settings.instance_type

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-${count.index}"
  })
}
```

### Advanced Local Patterns

Use locals for data transformation and complex logic.

```hcl
locals {
  # Flatten nested structures
  subnet_configs = flatten([
    for az_index, az in var.availability_zones : [
      {
        az         = az
        cidr       = cidrsubnet(var.vpc_cidr, 8, az_index + 1)
        type       = "public"
      },
      {
        az         = az
        cidr       = cidrsubnet(var.vpc_cidr, 8, az_index + 10)
        type       = "private"
      },
    ]
  ])

  # Create a map from a list for use with for_each
  subnet_map = {
    for s in local.subnet_configs :
    "${s.type}-${s.az}" => s
  }

  # Filter a collection
  production_services = {
    for name, config in var.services :
    name => config
    if config.environment == "production"
  }
}
```

## Output Values

Outputs expose values from your module. They show up in the CLI after `terraform apply` and can be referenced by other modules or configurations.

```hcl
# Basic output
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

# Sensitive output (hidden from CLI)
output "db_password" {
  description = "Database master password"
  value       = random_password.db.result
  sensitive   = true
}

# Computed output
output "api_url" {
  description = "Full URL of the API"
  value       = "https://${aws_lb.api.dns_name}/api/v1"
}

# Conditional output
output "bastion_ip" {
  description = "Public IP of the bastion host (if created)"
  value       = var.create_bastion ? aws_instance.bastion[0].public_ip : null
}

# Map output
output "subnet_ids" {
  description = "Map of subnet type to subnet IDs"
  value = {
    public  = aws_subnet.public[*].id
    private = aws_subnet.private[*].id
  }
}
```

### Reading Outputs

```bash
# Show all outputs
terraform output

# Show a specific output
terraform output vpc_id

# Get the raw value (useful for scripts)
terraform output -raw vpc_id

# Get JSON output (useful for complex types)
terraform output -json subnet_ids
```

## Putting It All Together

Here's a complete example using variables, locals, and outputs together.

```hcl
# variables.tf
variable "project" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

# locals.tf
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

# outputs.tf
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}
```

## Wrapping Up

Variables are your inputs, locals are your computations, and outputs are your exports. Keep variables focused on what callers need to provide, use locals to keep your resource blocks clean and avoid repetition, and output everything other modules or humans might need. This three-layer pattern scales well from simple configurations to complex multi-module setups.

For more on structuring Terraform projects, see our guides on [Terraform modules](https://oneuptime.com/blog/post/2026-02-12-terraform-modules-for-reusable-aws-infrastructure/view) and [dynamic blocks](https://oneuptime.com/blog/post/2026-02-12-terraform-dynamic-blocks-for-repeated-configuration/view).
