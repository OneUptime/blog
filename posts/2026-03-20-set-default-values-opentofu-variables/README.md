# How to Set Default Values for OpenTofu Variables - Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Default Values, HCL, Infrastructure as Code, DevOps

Description: Learn how to set default values for OpenTofu input variables to make configurations reusable without requiring every variable to be explicitly provided.

---

Default values make your OpenTofu modules more user-friendly. When a variable has a default, users don't need to provide it unless they want to override it. This guide covers how to define defaults for all variable types and best practices for choosing sensible defaults.

---

## Setting a Default Value

Add a `default` argument to any variable block:

```hcl
# variables.tf - variables with defaults

variable "region" {
  type        = string
  description = "AWS region to deploy resources in"
  default     = "us-east-1"   # used when not provided
}

variable "instance_count" {
  type        = number
  description = "Number of instances to create"
  default     = 1
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable detailed monitoring"
  default     = false
}
```

---

## Complex Type Defaults

```hcl
# Default values for complex types

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default = {
    Environment = "development"
    ManagedBy   = "opentofu"
  }
}

variable "allowed_ports" {
  type        = list(number)
  description = "List of ports to open in the security group"
  default     = [80, 443, 22]
}

variable "server_config" {
  type = object({
    instance_type = string
    disk_size_gb  = number
    enable_backup = bool
  })
  description = "Server configuration settings"
  default = {
    instance_type = "t3.micro"
    disk_size_gb  = 20
    enable_backup = true
  }
}
```

---

## null as a Default

Use `null` as a default when the variable should be optional and you want to detect whether a non-null value was provided.

```hcl
variable "custom_ami" {
  type        = string
  description = "Custom AMI ID (uses latest Amazon Linux if not set)"
  default     = null  # explicitly not set
}

# In your resource, check for null

resource "aws_instance" "web" {
  ami           = var.custom_ami != null ? var.custom_ami : data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```

---

## Override Defaults at Deploy Time

```bash
# Use the default value (no argument needed)
tofu plan

# Override the default via CLI
tofu plan -var="region=us-west-2"

# Override via tfvars file
tofu plan -var-file="production.tfvars"

# Override via environment variable
TF_VAR_region=eu-west-1 tofu plan
```

---

## Required vs Optional Variables

```hcl
# Required (no default) - must be provided
variable "database_password" {
  type        = string
  description = "Database password (required)"
  sensitive   = true
  # No default - user must provide this
}

# Optional (has default) - provides fallback
variable "database_name" {
  type        = string
  description = "Database name"
  default     = "appdb"
}
```

---

## Summary

Set `default` in a variable block to make it optional. Use simple literals for basic types and HCL object/list/map syntax for complex types. Use `null` as a default when you need to distinguish between no configured value and a non-null configured value. Required variables (no default) force callers to be explicit about sensitive configuration.
