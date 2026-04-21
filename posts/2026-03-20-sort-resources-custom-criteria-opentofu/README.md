# How to Sort Resources by Custom Criteria in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, Function, Sorting, Data Transformation

Description: Learn how to sort lists and maps of resources by custom criteria in OpenTofu using sort, reverse, and for expressions to control resource ordering.

## Introduction

OpenTofu does not provision resources in a user-defined order by default - dependencies control that. However, for data processing, output generation, and selecting the "best" resource from a list (e.g., the latest AMI, the cheapest instance type), sorting is essential.

## Alphabetical Sorting with sort

The `sort` function sorts a list of strings lexicographically in ascending order.

```hcl
locals {
  regions = ["us-west-2", "eu-west-1", "ap-southeast-1", "us-east-1"]

  # Sort regions alphabetically
  sorted_regions = sort(local.regions)
  # Result: ["ap-southeast-1", "eu-west-1", "us-east-1", "us-west-2"]

  # Reverse for descending order
  reversed_regions = reverse(sort(local.regions))
  # Result: ["us-west-2", "us-east-1", "eu-west-1", "ap-southeast-1"]
}
```

## Sorting by a Numeric Field

OpenTofu does not have a built-in sort-by-key function for objects. Use a `for` expression combined with `sort` on derived keys to achieve custom ordering.

```hcl
locals {
  instance_types = {
    "t3.micro"  = { vcpu = 2,  memory_gb = 1 }
    "t3.small"  = { vcpu = 2,  memory_gb = 2 }
    "t3.medium" = { vcpu = 2,  memory_gb = 4 }
    "t3.large"  = { vcpu = 2,  memory_gb = 8 }
    "t3.xlarge" = { vcpu = 4,  memory_gb = 16 }
  }

  # Create sortable keys by zero-padding memory values for lexicographic sort
  sortable_keys = [
    for name, spec in local.instance_types :
    format("%04d_%s", spec.memory_gb, name)
  ]

  # Sort the composite keys to get memory-ordered list
  sorted_keys = sort(local.sortable_keys)

  # Extract just the instance type names in sorted order
  sorted_instance_types = [
    for k in local.sorted_keys : split("_", k)[1]
  ]
  # Result: ["t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge"]
}
```

## Selecting the Smallest or Largest Value

Use `sort` and index access to pick the lexicographically first or last string value.

```hcl
locals {
  available_cidr_blocks = [
    "10.0.32.0/24",
    "10.0.8.0/24",
    "10.0.16.0/24",
    "10.0.0.0/24",
  ]

  # Sort CIDR blocks and pick first (smallest by lexicographic order)
  sorted_cidrs  = sort(local.available_cidr_blocks)
  smallest_cidr = local.sorted_cidrs[0]
  # Result: "10.0.0.0/24"
}
```

## Sorting AMI IDs by Creation Date

When multiple AMIs match a filter, use creation-time ordering to get the latest.

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["myapp-*"]
  }
}

# For multiple AMIs, use a data source that returns a list

data "aws_ami_ids" "app_versions" {
  owners         = ["self"]
  sort_ascending = false

  filter {
    name   = "name"
    values = ["myapp-*"]
  }
}

locals {
  # AMI IDs are sorted by creation time according to sort_ascending
  latest_ami_id = data.aws_ami_ids.app_versions.ids[0]
}
```

## Sorting Module Outputs for Predictable References

When a module returns a list that may vary between runs, sort it for stable index-based access.

```hcl
module "vpc" {
  source = "./modules/vpc"
  # ...
}

locals {
  # Sort subnet IDs for stable index-based references
  sorted_private_subnets = sort(module.vpc.private_subnet_ids)
  primary_subnet         = local.sorted_private_subnets[0]
}
```

## Conclusion

While OpenTofu lacks a multi-key sort function, you can achieve sophisticated sorting by constructing composite string keys, using zero-padding for numeric fields, and leveraging `sort`, `reverse`, and `for` expressions together. This pattern is especially useful when selecting the best resource from a list of candidates.
