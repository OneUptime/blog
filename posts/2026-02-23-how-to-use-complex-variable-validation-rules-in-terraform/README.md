# How to Use Complex Variable Validation Rules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Validation, Variables, Modules, Infrastructure as Code

Description: Learn how to write advanced Terraform variable validation rules that handle cross-field checks, conditional requirements, nested objects, and collection constraints for production-ready modules.

---

Simple validation rules check one thing: is the value in an allowed list, does it match a regex, is it within a range. But production modules often need more sophisticated checks. You might need to validate that two fields are consistent with each other, that a list has no duplicates, that CIDR blocks do not overlap, or that conditional fields are only set when certain flags are enabled.

This post walks through advanced validation patterns that go beyond the basics.

## Cross-Field Validation

Sometimes the validity of one field depends on the value of another. Object variables let you validate multiple fields together.

```hcl
variable "autoscaling" {
  type = object({
    enabled       = bool
    min_capacity  = number
    max_capacity  = number
    target_cpu    = number
  })

  # Min capacity must be less than or equal to max capacity
  validation {
    condition     = var.autoscaling.min_capacity <= var.autoscaling.max_capacity
    error_message = "min_capacity (${var.autoscaling.min_capacity}) must be less than or equal to max_capacity (${var.autoscaling.max_capacity})."
  }

  # Target CPU must be a reasonable percentage
  validation {
    condition     = var.autoscaling.target_cpu >= 10 && var.autoscaling.target_cpu <= 90
    error_message = "target_cpu must be between 10 and 90 percent. Got: ${var.autoscaling.target_cpu}."
  }

  # If autoscaling is disabled, min and max should match
  validation {
    condition     = var.autoscaling.enabled || var.autoscaling.min_capacity == var.autoscaling.max_capacity
    error_message = "When autoscaling is disabled, min_capacity and max_capacity must be equal."
  }
}
```

The third validation is interesting - it uses an OR condition. If autoscaling IS enabled, the check passes regardless. If autoscaling is NOT enabled, then min and max must match. This is a common pattern for conditional requirements.

## Validating Lists for Uniqueness

Terraform does not have a built-in "has duplicates" check, but you can compare the length of a list with the length of a set created from it.

```hcl
variable "subnet_cidrs" {
  type        = list(string)
  description = "List of subnet CIDR blocks"

  # No duplicates allowed
  validation {
    condition     = length(var.subnet_cidrs) == length(toset(var.subnet_cidrs))
    error_message = "Subnet CIDR list contains duplicate values. Each CIDR must be unique."
  }

  # Each CIDR must be valid
  validation {
    condition = alltrue([
      for cidr in var.subnet_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All values must be valid CIDR blocks (e.g., 10.0.1.0/24)."
  }

  # Must have at least 2 subnets for high availability
  validation {
    condition     = length(var.subnet_cidrs) >= 2
    error_message = "At least 2 subnet CIDRs are required for high availability. Got: ${length(var.subnet_cidrs)}."
  }
}
```

The `toset()` call removes duplicates from a list. If the original list had 5 items and the set has 4, there was a duplicate.

## Validating Non-Overlapping CIDR Blocks

This is a more advanced check that ensures CIDR blocks do not overlap with each other:

```hcl
variable "network_config" {
  type = object({
    vpc_cidr     = string
    subnet_cidrs = list(string)
  })

  # All subnets must be within the VPC CIDR
  validation {
    condition = alltrue([
      for cidr in var.network_config.subnet_cidrs :
      can(cidrsubnet(var.network_config.vpc_cidr, 0, 0))
    ])
    error_message = "All subnet CIDRs must be valid CIDR blocks."
  }

  # VPC CIDR must use private address space
  validation {
    condition = anytrue([
      can(regex("^10\\.", var.network_config.vpc_cidr)),
      can(regex("^172\\.(1[6-9]|2[0-9]|3[0-1])\\.", var.network_config.vpc_cidr)),
      can(regex("^192\\.168\\.", var.network_config.vpc_cidr)),
    ])
    error_message = "VPC CIDR must use private address space (10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16)."
  }
}
```

## Conditional Required Fields

Some fields should only be required when another field has a specific value. Use the OR pattern to express this.

```hcl
variable "storage" {
  type = object({
    type       = string            # "gp3", "io1", "io2"
    size_gb    = number
    iops       = optional(number)
    throughput = optional(number)
  })

  validation {
    condition     = contains(["gp2", "gp3", "io1", "io2"], var.storage.type)
    error_message = "Storage type must be one of: gp2, gp3, io1, io2."
  }

  # IOPS is required for io1 and io2
  validation {
    condition = (
      !contains(["io1", "io2"], var.storage.type) ||
      var.storage.iops != null
    )
    error_message = "IOPS must be specified when storage type is io1 or io2."
  }

  # IOPS must be within valid range for io1
  validation {
    condition = (
      var.storage.type != "io1" ||
      var.storage.iops == null ||
      (var.storage.iops >= 100 && var.storage.iops <= 64000)
    )
    error_message = "For io1, IOPS must be between 100 and 64,000."
  }

  # Size must be appropriate for the storage type
  validation {
    condition = (
      var.storage.type != "gp3" ||
      (var.storage.size_gb >= 1 && var.storage.size_gb <= 16384)
    )
    error_message = "For gp3, size must be between 1 and 16,384 GB."
  }
}
```

The pattern `!condition_that_makes_this_relevant || actual_check` means "skip this validation if the precondition is not met, otherwise enforce the check."

## Validating Maps of Objects

When you have a map of complex objects, you need to validate each entry:

```hcl
variable "services" {
  type = map(object({
    port         = number
    cpu          = number
    memory       = number
    min_replicas = number
    max_replicas = number
    protocol     = string
  }))

  # Validate port ranges for each service
  validation {
    condition = alltrue([
      for name, svc in var.services : svc.port >= 1 && svc.port <= 65535
    ])
    error_message = "All service ports must be between 1 and 65535."
  }

  # Validate CPU values are Fargate-compatible
  validation {
    condition = alltrue([
      for name, svc in var.services : contains([256, 512, 1024, 2048, 4096], svc.cpu)
    ])
    error_message = "CPU must be a valid Fargate value: 256, 512, 1024, 2048, or 4096."
  }

  # Validate memory is compatible with CPU
  # Fargate has specific CPU-to-memory ratios
  validation {
    condition = alltrue([
      for name, svc in var.services : (
        (svc.cpu == 256 && contains([512, 1024, 2048], svc.memory)) ||
        (svc.cpu == 512 && svc.memory >= 1024 && svc.memory <= 4096) ||
        (svc.cpu == 1024 && svc.memory >= 2048 && svc.memory <= 8192) ||
        (svc.cpu == 2048 && svc.memory >= 4096 && svc.memory <= 16384) ||
        (svc.cpu == 4096 && svc.memory >= 8192 && svc.memory <= 30720)
      )
    ])
    error_message = "Memory value must be compatible with the specified CPU. See Fargate documentation for valid CPU/memory combinations."
  }

  # No duplicate ports across services
  validation {
    condition = (
      length([for name, svc in var.services : svc.port]) ==
      length(toset([for name, svc in var.services : svc.port]))
    )
    error_message = "Each service must use a unique port. Found duplicate port numbers."
  }

  # Replicas validation
  validation {
    condition = alltrue([
      for name, svc in var.services : svc.min_replicas <= svc.max_replicas
    ])
    error_message = "min_replicas must be less than or equal to max_replicas for each service."
  }
}
```

## Combining Multiple Functions

Complex validations often combine several Terraform functions:

```hcl
variable "tags" {
  type        = map(string)
  description = "Resource tags"

  # Required tags must be present
  validation {
    condition = alltrue([
      for key in ["Environment", "Project", "Owner"] :
      contains(keys(var.tags), key)
    ])
    error_message = "Tags must include: Environment, Project, Owner."
  }

  # No empty tag values
  validation {
    condition = alltrue([
      for key, value in var.tags : length(trimspace(value)) > 0
    ])
    error_message = "Tag values must not be empty or whitespace-only."
  }

  # Tag keys must follow naming convention
  validation {
    condition = alltrue([
      for key, value in var.tags : can(regex("^[A-Z][a-zA-Z]+$", key))
    ])
    error_message = "Tag keys must be PascalCase (e.g., Environment, ProjectName, CostCenter)."
  }

  # Maximum number of tags
  validation {
    condition     = length(var.tags) <= 50
    error_message = "Maximum of 50 tags allowed. Got: ${length(var.tags)}."
  }
}
```

## Using try() for Safe Nested Access

When validating optional nested fields, `try()` prevents errors from missing attributes:

```hcl
variable "monitoring" {
  type = object({
    enabled = bool
    config  = optional(object({
      retention_days    = optional(number, 30)
      alert_endpoints   = optional(list(string), [])
      dashboard_enabled = optional(bool, false)
    }))
  })

  # If monitoring is enabled, at least one alert endpoint should be configured
  validation {
    condition = (
      !var.monitoring.enabled ||
      try(length(var.monitoring.config.alert_endpoints), 0) > 0
    )
    error_message = "When monitoring is enabled, at least one alert endpoint must be configured."
  }

  # Retention days must be a CloudWatch-compatible value
  validation {
    condition = (
      var.monitoring.config == null ||
      contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653],
        try(var.monitoring.config.retention_days, 30))
    )
    error_message = "retention_days must be a CloudWatch Logs supported value."
  }
}
```

## Performance Considerations

Complex validations run during `terraform plan` and `terraform apply`. For very large collections (hundreds of items), keep validation expressions efficient:

```hcl
# Efficient - uses built-in functions
validation {
  condition     = length(var.items) == length(toset(var.items))
  error_message = "Items must be unique."
}

# Less efficient for large lists - nested loop
validation {
  condition = alltrue([
    for i, item in var.items :
    !contains(slice(var.items, i + 1, length(var.items)), item)
  ])
  error_message = "Items must be unique."
}
```

The first version converts to a set (O(n)) while the second does a nested check (O(n^2)). For small inputs either is fine, but prefer the simpler approach.

## Summary

Complex validation rules make your Terraform modules production-ready. Cross-field validations ensure consistency between related inputs. Collection validations catch duplicates and enforce constraints on every element. Conditional validations use the `!precondition || check` pattern to skip irrelevant rules. The `try()` function safely handles optional nested fields. Write these validations once in your module, and they protect every team that uses it from configuration mistakes that would otherwise only surface during deployment.

For more on Terraform validation, see our posts on [validation with regex](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variable-validation-with-regex-in-terraform/view) and [custom error messages](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variable-validation-with-custom-error-messages/view).
