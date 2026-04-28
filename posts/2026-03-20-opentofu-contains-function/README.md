# How to Use the contains Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the contains function in OpenTofu to check if a list or set contains a specific element for validation and conditional configuration.

## Introduction

The `contains` function in OpenTofu returns `true` if a given list or set contains a specified value. It is a fundamental function for input validation, conditional resource configuration, and membership testing in your infrastructure definitions.

## Syntax

```hcl
contains(list, value)
```

- **list** - a list or set of values
- **value** - the value to search for
- Returns a boolean (`true` or `false`)

## Basic Examples

```hcl
output "contains_string" {
  value = contains(["a", "b", "c"], "b")      # Returns true
}

output "not_contains" {
  value = contains(["a", "b", "c"], "d")      # Returns false
}

output "contains_number" {
  value = contains([1, 2, 3, 4], 3)           # Returns true
}
```

## Practical Use Cases

### Variable Validation

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "instance_type" {
  type = string

  validation {
    condition = contains([
      "t3.micro", "t3.small", "t3.medium", "t3.large"
    ], var.instance_type)
    error_message = "instance_type must be a t3 family instance."
  }
}
```

### Conditional Resource Creation

```hcl
variable "enabled_features" {
  type    = list(string)
  default = ["monitoring", "backups", "logging"]
}

locals {
  enable_monitoring = contains(var.enabled_features, "monitoring")
  enable_backups    = contains(var.enabled_features, "backups")
  enable_waf        = contains(var.enabled_features, "waf")
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = local.enable_monitoring ? 1 : 0

  alarm_name          = "high-cpu"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  statistic           = "Average"
  period              = 60
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
}
```

### Filtering Lists

```hcl
variable "regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
}

variable "allowed_regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2"]
}

locals {
  # Keep only allowed regions
  filtered_regions = [
    for r in var.regions :
    r if contains(var.allowed_regions, r)
  ]
}

output "filtered_regions" {
  value = local.filtered_regions  # ["us-east-1", "us-west-2"]
}
```

### Enforcing Tag Requirements

```hcl
variable "resource_tags" {
  type = map(string)
}

locals {
  required_tag_keys = ["environment", "team", "cost-center"]
  tag_keys          = keys(var.resource_tags)

  missing_tags = [
    for required in local.required_tag_keys :
    required if !contains(local.tag_keys, required)
  ]
}

resource "null_resource" "tag_validation" {
  lifecycle {
    precondition {
      condition     = length(local.missing_tags) == 0
      error_message = "Missing required tags: ${join(", ", local.missing_tags)}"
    }
  }
}
```

### Checking Allowed AMI IDs

```hcl
variable "ami_id" {
  type = string
}

data "aws_ami_ids" "approved" {
  filter {
    name   = "name"
    values = ["approved-base-*"]
  }
  owners = ["self"]
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  lifecycle {
    precondition {
      condition     = contains(data.aws_ami_ids.approved.ids, var.ami_id)
      error_message = "ami_id must be an approved AMI."
    }
  }
}
```

## Step-by-Step Usage

1. Define the list of allowed or expected values.
2. Call `contains(list, value)` to test membership.
3. Use the boolean result in `if`, `validation`, or `precondition` blocks.
4. Test in `tofu console`:

```bash
tofu console

> contains(["prod", "staging", "dev"], "prod")
true
> contains(["prod", "staging", "dev"], "test")
false
```

## contains vs strcontains

| Function | Tests For |
|----------|-----------|
| `contains(list, value)` | Whether a list/set contains a specific element |
| `strcontains(string, substr)` | Whether a string contains a substring |

## Conclusion

The `contains` function is a fundamental membership test in OpenTofu that drives validation, conditional logic, and list filtering throughout your infrastructure configurations. Use it in `validation` blocks to enforce allowed values, in `for` expressions to filter collections, and in `precondition` blocks to verify resource attributes at plan time.
