# How to Use the index Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the index function in Terraform to find the position of a value within a list, with practical examples for lookups and cross-referencing.

---

Finding the position of a value within a list is a common need when building Terraform configurations that reference related data structures. The `index` function returns the zero-based position of a given value in a list. This is useful for cross-referencing parallel lists, mapping values to indices, and building dynamic lookups.

In this post, we will explore how the `index` function works, its limitations, and practical patterns for using it effectively.

## What is the index Function?

The `index` function finds the first occurrence of a given value in a list and returns its zero-based index.

```hcl
# Returns the index of value in the list
index(list, value)
```

If the value is not found, Terraform raises an error.

## Basic Usage in Terraform Console

```hcl
# Find the index of a value
> index(["a", "b", "c"], "b")
1

> index(["a", "b", "c"], "a")
0

> index(["a", "b", "c"], "c")
2

# Works with numbers
> index([10, 20, 30], 20)
1

# Returns the first occurrence for duplicates
> index(["a", "b", "a", "c"], "a")
0

# Value not found causes an error
# index(["a", "b", "c"], "d") -> Error
```

The function finds only the first occurrence. If you have duplicates, it returns the index of the first match.

## Cross-Referencing Parallel Lists

A practical use of `index` is looking up related data across lists that share the same ordering.

```hcl
locals {
  region_names = ["us-east-1", "us-west-2", "eu-west-1"]
  region_cidrs = ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"]
  region_amis  = ["ami-0123456", "ami-7890123", "ami-4567890"]
}

variable "target_region" {
  type    = string
  default = "us-west-2"
}

locals {
  # Find the index of the target region
  region_idx = index(local.region_names, var.target_region)

  # Use that index to look up corresponding values
  vpc_cidr = local.region_cidrs[local.region_idx]
  ami_id   = local.region_amis[local.region_idx]
}

resource "aws_vpc" "main" {
  cidr_block = local.vpc_cidr

  tags = {
    Name   = "vpc-${var.target_region}"
    Region = var.target_region
  }
}

resource "aws_instance" "app" {
  ami           = local.ami_id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.main.id
}
```

While maps are often a better fit for this kind of lookup, parallel lists are sometimes the data structure you inherit from external sources.

## Calculating Relative Positions

The `index` function helps calculate relative positions between elements in a list.

```hcl
locals {
  deployment_stages = ["build", "test", "staging", "production"]

  current_stage = "staging"
  current_idx   = index(local.deployment_stages, local.current_stage)

  # Determine previous and next stages
  previous_stage = local.current_idx > 0 ? local.deployment_stages[local.current_idx - 1] : "none"
  next_stage     = local.current_idx < length(local.deployment_stages) - 1 ? local.deployment_stages[local.current_idx + 1] : "none"
}

output "pipeline_context" {
  value = {
    current  = local.current_stage
    previous = local.previous_stage  # "test"
    next     = local.next_stage      # "production"
  }
}
```

## Using index for Priority Ordering

You can use `index` to sort or prioritize items based on a predefined order.

```hcl
variable "instance_types" {
  type    = list(string)
  default = ["t3.large", "t3.micro", "m5.xlarge"]
}

locals {
  # Define the priority order (smallest to largest)
  type_priority = ["t3.micro", "t3.small", "t3.medium", "t3.large", "m5.large", "m5.xlarge"]

  # Sort instance types by priority
  sorted_types = sort([
    for t in var.instance_types :
    format("%04d-%s", index(local.type_priority, t), t)
  ])

  # Extract just the type names from the sorted list
  ordered_instance_types = [
    for s in local.sorted_types :
    element(split("-", s), 1)
  ]
  # Result: ["t3.micro", "t3.large", "m5.xlarge"]
}
```

## Mapping Values to Numeric Identifiers

Sometimes you need to convert string values to numeric IDs for use in resource configurations.

```hcl
locals {
  environments = ["dev", "staging", "production"]

  environment_map = {
    for env in local.environments :
    env => {
      name  = env
      index = index(local.environments, env)
      # Use the index for CIDR block calculation
      cidr  = cidrsubnet("10.0.0.0/8", 8, index(local.environments, env))
    }
  }
}

output "environment_configs" {
  value = local.environment_map
  # {
  #   dev        = { name = "dev",        index = 0, cidr = "10.0.0.0/16" }
  #   staging    = { name = "staging",    index = 1, cidr = "10.1.0.0/16" }
  #   production = { name = "production", index = 2, cidr = "10.2.0.0/16" }
  # }
}
```

## Safe Index Lookup

Since `index` errors when the value is not found, you may want a safe wrapper.

```hcl
locals {
  regions        = ["us-east-1", "us-west-2", "eu-west-1"]
  target_region  = "ap-southeast-1"

  # Safe lookup using try() - returns -1 if not found
  region_idx = try(index(local.regions, local.target_region), -1)

  region_found = local.region_idx >= 0
}

output "lookup_result" {
  value = local.region_found ? "Found at index ${local.region_idx}" : "Region not found"
}
```

The `try` function catches the error from `index` and returns the fallback value instead.

## Combining index with contains

For safety, check if the value exists before calling `index`.

```hcl
locals {
  allowed_types = ["t3.micro", "t3.small", "t3.medium"]
  requested     = "t3.small"

  # Check first, then lookup
  is_allowed = contains(local.allowed_types, local.requested)
  type_index = local.is_allowed ? index(local.allowed_types, local.requested) : -1
}
```

For more on `contains`, see [How to Use the contains Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-contains-function-in-terraform/view).

## Real-World Scenario: Multi-Tier Architecture

Here is a more complete example using `index` to configure a multi-tier network.

```hcl
variable "tier" {
  type        = string
  description = "The network tier for this deployment"
  default     = "application"

  validation {
    condition     = contains(["web", "application", "database"], var.tier)
    error_message = "Tier must be web, application, or database."
  }
}

locals {
  tiers       = ["web", "application", "database"]
  tier_cidrs  = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
  tier_ports  = [80, 8080, 5432]

  tier_idx = index(local.tiers, var.tier)

  tier_config = {
    name = var.tier
    cidr = local.tier_cidrs[local.tier_idx]
    port = local.tier_ports[local.tier_idx]
  }
}

resource "aws_subnet" "tier" {
  vpc_id     = aws_vpc.main.id
  cidr_block = local.tier_config.cidr

  tags = {
    Name = "${var.tier}-subnet"
    Tier = var.tier
  }
}

resource "aws_security_group" "tier" {
  name   = "${var.tier}-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = local.tier_config.port
    to_port     = local.tier_config.port
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }
}
```

## When to Prefer Maps Over index

While `index` is useful, maps are often a cleaner solution for key-value lookups.

```hcl
# Using index with parallel lists (works but fragile)
locals {
  names  = ["small", "medium", "large"]
  values = [10, 50, 100]

  result = local.values[index(local.names, "medium")]  # 50
}

# Using a map (cleaner and safer)
locals {
  size_map = {
    small  = 10
    medium = 50
    large  = 100
  }

  result = local.size_map["medium"]  # 50
}
```

Prefer maps when possible. Use `index` when you need the actual numeric position or when working with data that naturally comes as parallel lists.

## Summary

The `index` function finds the position of a value within a list. While simple, it enables patterns for cross-referencing parallel data structures, calculating relative positions, and mapping values to numeric identifiers.

Key takeaways:

- `index(list, value)` returns the zero-based position of the first matching element
- Errors if the value is not found - use `try()` for safe lookups
- Useful for cross-referencing parallel lists
- Check existence with `contains` before calling `index` if the value might not be present
- Consider using maps as an alternative when they fit the data model better

Use `index` when you need to work with positional data in lists, but keep maps in mind as the preferred approach for key-value relationships.
