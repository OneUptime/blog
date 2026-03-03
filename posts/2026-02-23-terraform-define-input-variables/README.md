# How to Define Input Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Infrastructure as Code, Configuration

Description: Learn how to define input variables in Terraform using the variable block, including type constraints, defaults, descriptions, and all available configuration options.

---

Input variables are the parameters of your Terraform configuration. They let you customize your infrastructure without changing the code. Instead of hardcoding values like instance types, CIDR blocks, and environment names, you define variables and let the caller supply the values.

This post covers how to declare variables using the `variable` block and all the options available to you.

## The variable Block

Here is the most basic variable declaration:

```hcl
# Declare a variable with just a name
variable "instance_type" {}
```

That is technically valid, but it gives Terraform no information about what the variable should look like. A well-defined variable includes a type, description, and optionally a default value:

```hcl
# A properly defined variable
variable "instance_type" {
  description = "The EC2 instance type for the web servers"
  type        = string
  default     = "t3.micro"
}
```

## Variable Block Arguments

The `variable` block supports these arguments:

### type

The `type` argument constrains what kind of value the variable accepts:

```hcl
# Basic types
variable "name" {
  type = string
}

variable "count" {
  type = number
}

variable "enabled" {
  type = bool
}

# Collection types
variable "availability_zones" {
  type = list(string)
}

variable "instance_types" {
  type = map(string)
}

variable "ports" {
  type = set(number)
}

# Structural types
variable "database_config" {
  type = object({
    engine         = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
}

# Tuple type (fixed-length, mixed types)
variable "rule" {
  type = tuple([string, number, bool])
}
```

If you omit `type`, Terraform accepts any value. This is not recommended because it makes your configuration harder to understand and debug.

### description

The `description` argument documents what the variable is for. It shows up in `terraform plan` prompts and in generated documentation:

```hcl
variable "environment" {
  description = "The deployment environment (dev, staging, production)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC. Must be a /16 or larger."
  type        = string
  default     = "10.0.0.0/16"
}
```

Always include descriptions. They make your modules self-documenting.

### default

The `default` argument provides a fallback value when the caller does not specify one:

```hcl
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"  # used when no value is provided
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}  # empty map as default
}

variable "enable_monitoring" {
  description = "Whether to enable detailed monitoring"
  type        = bool
  default     = false
}
```

Variables without a `default` are required - Terraform will prompt for them or error if they are not supplied.

### sensitive

The `sensitive` argument prevents the variable value from appearing in CLI output:

```hcl
variable "database_password" {
  description = "Password for the RDS instance"
  type        = string
  sensitive   = true  # value hidden in plan and apply output
}

variable "api_key" {
  description = "API key for the external service"
  type        = string
  sensitive   = true
}
```

Note that sensitive values are still stored in the state file. They are just hidden from the terminal output.

### nullable

The `nullable` argument controls whether the variable can be set to `null`:

```hcl
variable "instance_type" {
  type     = string
  default  = "t3.micro"
  nullable = false  # cannot be set to null
}

variable "secondary_cidr" {
  type     = string
  default  = null
  nullable = true  # explicitly allow null (this is the default)
}
```

By default, variables are nullable. Setting `nullable = false` means that even if the caller passes `null`, Terraform will use the default value instead.

### validation

The `validation` block lets you add custom rules:

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string

  validation {
    condition     = can(regex("^t3\\.", var.instance_type))
    error_message = "Only t3 instance types are allowed."
  }
}
```

You can have multiple validation blocks on a single variable.

## Complex Type Examples

### List of Objects

```hcl
variable "subnets" {
  description = "List of subnet configurations"
  type = list(object({
    cidr              = string
    availability_zone = string
    public            = bool
  }))
  default = [
    {
      cidr              = "10.0.1.0/24"
      availability_zone = "us-east-1a"
      public            = true
    },
    {
      cidr              = "10.0.2.0/24"
      availability_zone = "us-east-1b"
      public            = true
    },
  ]
}
```

### Map of Objects

```hcl
variable "services" {
  description = "Map of service configurations"
  type = map(object({
    port          = number
    instance_type = string
    min_count     = number
    max_count     = number
    health_check  = string
  }))
  default = {
    web = {
      port          = 80
      instance_type = "t3.small"
      min_count     = 2
      max_count     = 10
      health_check  = "/health"
    }
    api = {
      port          = 8080
      instance_type = "t3.medium"
      min_count     = 2
      max_count     = 6
      health_check  = "/api/health"
    }
  }
}
```

### Optional Object Attributes

Since Terraform 1.3, you can make object attributes optional with default values:

```hcl
variable "database" {
  type = object({
    engine         = string
    instance_class = string
    storage_gb     = optional(number, 20)        # defaults to 20
    multi_az       = optional(bool, false)        # defaults to false
    backup_days    = optional(number, 7)          # defaults to 7
    tags           = optional(map(string), {})    # defaults to empty map
  })
}

# Caller can omit optional fields
# database = {
#   engine         = "postgres"
#   instance_class = "db.t3.micro"
#   # storage_gb, multi_az, backup_days, and tags use their defaults
# }
```

## Where to Put Variable Declarations

By convention, variable declarations go in `variables.tf`:

```text
project/
  main.tf          # resources
  variables.tf     # variable declarations
  outputs.tf       # output declarations
  terraform.tfvars # variable values
```

For large projects, you might split variables by concern:

```text
project/
  variables-networking.tf
  variables-compute.tf
  variables-database.tf
```

## Providing Variable Values

There are several ways to set variable values:

```bash
# Via command line
terraform apply -var="instance_type=t3.large"

# Via .tfvars file
terraform apply -var-file="production.tfvars"

# Via environment variable
export TF_VAR_instance_type="t3.large"
terraform apply
```

```hcl
# terraform.tfvars (auto-loaded)
instance_type = "t3.large"
environment   = "production"
vpc_cidr      = "10.0.0.0/16"
```

## Variable Naming Conventions

Follow these conventions for consistent, readable configurations:

```hcl
# Use snake_case for variable names
variable "instance_type" {}      # good
variable "instanceType" {}       # bad - camelCase
variable "instance-type" {}      # works but not conventional

# Use descriptive names
variable "web_server_instance_type" {}  # good - specific
variable "type" {}                       # bad - too vague

# Prefix related variables
variable "vpc_cidr" {}
variable "vpc_name" {}
variable "vpc_enable_dns" {}

variable "db_instance_class" {}
variable "db_storage_gb" {}
variable "db_multi_az" {}
```

## Wrapping Up

The `variable` block is the entry point for parameterizing your Terraform configuration. Define a `type` to catch misconfigurations early, add a `description` to document the variable's purpose, set a `default` for optional values, use `sensitive` for secrets, and add `validation` blocks for custom constraints. Well-defined variables make your modules reusable and your configurations self-documenting.

For more on variable configuration, see [How to Set Variable Default Values in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-variable-default-values/view) and [How to Add Variable Descriptions in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-variable-descriptions/view).
