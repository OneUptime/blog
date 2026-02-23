# How to Set Variable Default Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Defaults, Infrastructure as Code

Description: Learn how to set default values for Terraform variables, including strategies for different types, when to use defaults, and how defaults interact with other variable features.

---

Default values in Terraform variables provide a fallback when the caller does not supply a value. Getting your defaults right makes the difference between a module that is easy to use and one that requires reading through pages of documentation before you can run `terraform apply`.

This post covers how defaults work for every variable type, strategies for choosing good defaults, and the interaction between defaults and other variable features.

## Basic Default Values

The `default` argument in a `variable` block sets the value used when no other value is provided:

```hcl
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "enable_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "replica_count" {
  description = "Number of read replicas"
  type        = number
  default     = 0
}
```

When you run `terraform apply` without specifying these variables, Terraform uses the defaults silently. No prompts, no errors.

## Defaults for Collection Types

### List Defaults

```hcl
# Default to an empty list
variable "additional_security_groups" {
  description = "Additional security group IDs to attach"
  type        = list(string)
  default     = []
}

# Default to a specific list
variable "availability_zones" {
  description = "AZs for resource placement"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}
```

### Map Defaults

```hcl
# Default to an empty map
variable "extra_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Default to a populated map
variable "instance_types" {
  description = "Instance type per environment"
  type        = map(string)
  default = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}
```

### Set Defaults

```hcl
variable "allowed_ports" {
  description = "Ports to allow in the security group"
  type        = set(number)
  default     = [80, 443]
}
```

## Defaults for Object Types

Object variables can have complex default values:

```hcl
variable "database_config" {
  description = "Database configuration settings"
  type = object({
    engine            = string
    instance_class    = string
    allocated_storage = number
    multi_az          = bool
    backup_retention  = number
  })
  default = {
    engine            = "postgres"
    instance_class    = "db.t3.micro"
    allocated_storage = 20
    multi_az          = false
    backup_retention  = 7
  }
}
```

### Optional Object Attributes with Defaults

Since Terraform 1.3, you can make individual object attributes optional and give each one its own default:

```hcl
variable "server_config" {
  type = object({
    instance_type = string
    ami_id        = string
    disk_size_gb  = optional(number, 50)         # defaults to 50
    monitoring    = optional(bool, true)          # defaults to true
    tags          = optional(map(string), {})     # defaults to empty map
    ebs_volumes   = optional(list(object({
      size = number
      type = string
    })), [])                                       # defaults to empty list
  })
}

# The caller only needs to provide required fields
# server_config = {
#   instance_type = "t3.small"
#   ami_id        = "ami-0c55b159cbfafe1f0"
#   # disk_size_gb defaults to 50
#   # monitoring defaults to true
#   # tags defaults to {}
#   # ebs_volumes defaults to []
# }
```

This is much more user-friendly than requiring the caller to specify every field.

## null as a Default

Setting the default to `null` creates a variable that is technically optional but has no meaningful default:

```hcl
variable "kms_key_id" {
  description = "KMS key ID for encryption. If not set, uses the default AWS key."
  type        = string
  default     = null
}

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100

  # When kms_key_id is null, this argument is effectively omitted
  kms_key_id = var.kms_key_id
}
```

This pattern is useful when an argument is truly optional and the provider has its own default behavior.

## How Terraform Resolves Variable Values

Terraform applies variable values in this priority order (highest to lowest):

1. `-var` command-line flags
2. `-var-file` command-line flags
3. `*.auto.tfvars` files (alphabetical order)
4. `terraform.tfvars` file
5. `TF_VAR_*` environment variables
6. `default` in the variable block
7. Interactive prompt (if no default and not provided)

```hcl
variable "environment" {
  type    = string
  default = "dev"  # priority 6 - used as last resort
}
```

```bash
# All of these override the default
export TF_VAR_environment="staging"           # priority 5
terraform apply -var="environment=production"  # priority 1 (wins)
```

## When to Use Defaults

### Use defaults for common, safe values

```hcl
# Good - most users want these values
variable "enable_logging" {
  type    = bool
  default = true
}

variable "log_retention_days" {
  type    = number
  default = 30
}
```

### Use defaults for development-friendly values

```hcl
# Good - easy to get started for development
variable "instance_type" {
  type    = string
  default = "t3.micro"  # cheapest option for dev
}

variable "instance_count" {
  type    = number
  default = 1  # minimal for dev
}
```

### Do NOT default sensitive or environment-specific values

```hcl
# Good - force the caller to think about this
variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, production)"
  # No default - must be explicitly set
}

variable "database_password" {
  type        = string
  sensitive   = true
  # No default - passwords should never be hardcoded
}
```

## Defaults and Validation

Default values are checked against validation rules:

```hcl
variable "instance_type" {
  type    = string
  default = "t3.micro"

  validation {
    condition     = can(regex("^t3\\.", var.instance_type))
    error_message = "Only t3 instance types are allowed."
  }
}

# If the default doesn't pass validation, terraform validate will catch it
```

Make sure your default values satisfy your own validation rules. It would be confusing to define a default that Terraform rejects.

## Empty Defaults for Optional Collections

A very common pattern is defaulting collections to empty:

```hcl
variable "additional_cidrs" {
  type    = list(string)
  default = []
}

variable "custom_tags" {
  type    = map(string)
  default = {}
}

# Then use them conditionally in resources
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  # The dynamic block produces zero rules if the list is empty
  dynamic "ingress" {
    for_each = var.additional_cidrs
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # merge with custom tags - empty map adds nothing
  tags = merge(local.common_tags, var.custom_tags)
}
```

## Documenting Default Behavior

When a default value has implications, document them in the description:

```hcl
variable "backup_retention_days" {
  description = "Number of days to retain backups. Set to 0 to disable backups. Default is 7 days."
  type        = number
  default     = 7
}

variable "max_connections" {
  description = "Maximum number of database connections. Default is calculated based on instance class if set to 0."
  type        = number
  default     = 0
}
```

## Wrapping Up

Default values are a crucial part of variable design. Good defaults make your modules easy to use out of the box while still allowing customization. Default development-friendly values for compute resources, empty collections for optional lists and maps, and `null` for truly optional arguments where the provider has its own default. Leave out defaults for values that the caller should always think about - like environment names and credentials.

For more on variables, see [How to Define Input Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-define-input-variables/view) and [How to Make Variables Required Without Defaults in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-required-variables-no-defaults/view).
