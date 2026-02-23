# How to Use the contains Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the contains function in Terraform to check if a list includes a specific value, with practical examples for validation, conditionals, and filtering.

---

Checking whether a list includes a particular value is a fundamental operation in any programming context, and Terraform is no exception. The `contains` function lets you test if a given value exists within a list. It returns `true` if the value is found and `false` otherwise.

This post explores the `contains` function in detail, from basic syntax to advanced patterns for validation, conditional resource creation, and data filtering.

## What is the contains Function?

The `contains` function checks whether a given list contains a specific value. It performs an exact match comparison.

```hcl
# Returns true if the list contains the value
contains(list, value)
```

The function returns a boolean: `true` if found, `false` if not.

## Basic Usage in Terraform Console

```hcl
# Value exists in the list
> contains(["a", "b", "c"], "b")
true

# Value does not exist
> contains(["a", "b", "c"], "d")
false

# Works with numbers
> contains([1, 2, 3], 2)
true

# Empty list always returns false
> contains([], "anything")
false

# Case sensitive for strings
> contains(["Hello", "World"], "hello")
false
```

The comparison is type-sensitive and case-sensitive. The string `"hello"` does not match `"Hello"`.

## Variable Validation

One of the most popular uses of `contains` is validating that a variable value belongs to an allowed set.

```hcl
variable "environment" {
  type        = string
  description = "The deployment environment"

  # Only allow specific environment names
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"

  # Restrict to approved instance types
  validation {
    condition     = contains([
      "t3.micro", "t3.small", "t3.medium",
      "m5.large", "m5.xlarge",
    ], var.instance_type)
    error_message = "Instance type must be from the approved list."
  }
}
```

This pattern prevents users from deploying with unexpected values and catches configuration mistakes early in the plan phase.

## Conditional Resource Creation

You can use `contains` to conditionally create resources based on whether a value appears in a list.

```hcl
variable "enabled_features" {
  type    = list(string)
  default = ["monitoring", "logging"]
}

# Only create the monitoring dashboard if monitoring is enabled
resource "aws_cloudwatch_dashboard" "main" {
  count = contains(var.enabled_features, "monitoring") ? 1 : 0

  dashboard_name = "app-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [["AWS/EC2", "CPUUtilization"]]
          period  = 300
          stat    = "Average"
        }
      }
    ]
  })
}

# Only create the log group if logging is enabled
resource "aws_cloudwatch_log_group" "app" {
  count = contains(var.enabled_features, "logging") ? 1 : 0

  name              = "/app/logs"
  retention_in_days = 30
}
```

## Filtering Lists with contains

You can combine `contains` with `for` expressions to filter one list based on another.

```hcl
variable "all_regions" {
  type = list(object({
    name    = string
    enabled = bool
  }))
  default = [
    { name = "us-east-1", enabled = true },
    { name = "us-west-2", enabled = true },
    { name = "eu-west-1", enabled = false },
    { name = "ap-southeast-1", enabled = true },
  ]
}

variable "priority_regions" {
  type    = list(string)
  default = ["us-east-1", "eu-west-1"]
}

locals {
  # Find regions that are both enabled AND in the priority list
  active_priority_regions = [
    for region in var.all_regions :
    region.name
    if region.enabled && contains(var.priority_regions, region.name)
  ]
  # Result: ["us-east-1"]
}
```

## Role-Based Access Control

The `contains` function is great for implementing role-based logic in your Terraform configurations.

```hcl
variable "user_role" {
  type    = string
  default = "developer"
}

locals {
  admin_roles     = ["admin", "superadmin", "root"]
  developer_roles = ["developer", "lead-developer", "senior-developer"]
  readonly_roles  = ["viewer", "auditor"]

  is_admin     = contains(local.admin_roles, var.user_role)
  is_developer = contains(local.developer_roles, var.user_role)
  is_readonly  = contains(local.readonly_roles, var.user_role)
}

# Admins get full access, developers get write, viewers get read-only
data "aws_iam_policy_document" "access" {
  statement {
    actions = local.is_admin ? ["*"] : (
      local.is_developer ? ["s3:GetObject", "s3:PutObject", "s3:ListBucket"] :
      ["s3:GetObject", "s3:ListBucket"]
    )
    resources = ["arn:aws:s3:::app-bucket/*"]
  }
}
```

## Using contains with Maps

While `contains` works directly on lists, you can use it with map keys by combining it with the `keys` function.

```hcl
variable "tags" {
  type = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
    Project     = "webapp"
  }
}

locals {
  # Check if required tags are present
  has_environment_tag = contains(keys(var.tags), "Environment")
  has_cost_center_tag = contains(keys(var.tags), "CostCenter")
}

output "tag_check" {
  value = {
    has_environment = local.has_environment_tag  # true
    has_cost_center = local.has_cost_center_tag  # false
  }
}
```

For more on the `keys` function, see [How to Use the keys Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-keys-function-in-terraform/view).

## Combining contains with alltrue and anytrue

You can use `contains` inside list comprehensions that feed into `alltrue` or `anytrue` for powerful validation.

```hcl
variable "required_tags" {
  type    = list(string)
  default = ["Environment", "Team", "CostCenter"]
}

variable "provided_tags" {
  type = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
  }
}

locals {
  # Check that ALL required tags are present
  all_required_tags_present = alltrue([
    for tag in var.required_tags : contains(keys(var.provided_tags), tag)
  ])
  # Result: false (CostCenter is missing)

  # Check that AT LEAST ONE required tag is present
  any_required_tag_present = anytrue([
    for tag in var.required_tags : contains(keys(var.provided_tags), tag)
  ])
  # Result: true (Environment and Team are present)
}
```

## Negating contains

Sometimes you need to check that a value is NOT in a list. Simply negate the result with `!`.

```hcl
variable "instance_type" {
  type = string
}

locals {
  # List of deprecated instance types
  deprecated_types = ["t2.micro", "t2.small", "m4.large", "m4.xlarge"]

  # Ensure we are not using a deprecated type
  is_valid_type = !contains(local.deprecated_types, var.instance_type)
}

resource "aws_instance" "app" {
  count = local.is_valid_type ? 1 : 0

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type

  tags = {
    Name = "app-server"
  }
}
```

## Real-World Scenario: Multi-Environment Configuration

Here is a complete example that uses `contains` to adjust configuration based on the deployment environment.

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}

locals {
  production_environments = ["staging", "production"]
  is_production_like      = contains(local.production_environments, var.environment)

  # Scale differently based on environment
  instance_count = local.is_production_like ? 3 : 1
  instance_type  = local.is_production_like ? "m5.large" : "t3.micro"

  # Enable features based on environment
  enable_backups    = contains(["production"], var.environment)
  enable_monitoring = local.is_production_like
  enable_waf        = contains(["production"], var.environment)
}

resource "aws_instance" "app" {
  count         = local.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.instance_type

  tags = {
    Name        = "app-${var.environment}-${count.index + 1}"
    Environment = var.environment
    Monitoring  = tostring(local.enable_monitoring)
  }
}
```

## Summary

The `contains` function is one of the most frequently used functions in Terraform. It provides a clean way to check list membership, making it invaluable for validation, conditional logic, and filtering.

Key takeaways:

- `contains(list, value)` returns `true` if the value is in the list
- Comparison is exact, type-sensitive, and case-sensitive
- Ideal for variable validation with allowed value sets
- Combine with `!` for negation
- Works well with `keys()` for checking map key existence
- Pairs naturally with `for` expressions, `alltrue`, and `anytrue`

If you are writing Terraform, you will use `contains` constantly. It is simple, reliable, and essential.
