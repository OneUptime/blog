# How to Deduplicate Lists with distinct in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, Function, List, Data Transformation

Description: Learn how to use the distinct function in OpenTofu to remove duplicate values from lists, enabling clean data processing in your infrastructure configurations.

## Introduction

When working with infrastructure configurations, you often encounter lists with duplicate values - from merged variable inputs, combined data source results, or constructed lists that may repeat entries. OpenTofu's `distinct` function removes duplicates, keeping only the first occurrence of each value.

## Basic Usage

The `distinct` function takes a list and returns a new list with all duplicate elements removed, preserving order.

```hcl
# Remove duplicate availability zones from a combined list

locals {
  all_azs     = ["us-east-1a", "us-east-1b", "us-east-1a", "us-east-1c", "us-east-1b"]
  unique_azs  = distinct(local.all_azs)
  # Result: ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

## Practical Example: Deduplicating Security Group References

When multiple resources reference the same security groups, duplicates can cause API errors. Use `distinct` to clean the list before passing it to resources.

```hcl
variable "base_security_groups" {
  type    = list(string)
  default = ["sg-0123456789abcdef0"]
}

variable "extra_security_groups" {
  type    = list(string)
  default = ["sg-0123456789abcdef0", "sg-abcdef0123456789"]
}

locals {
  # Merge and deduplicate security group IDs
  all_security_groups = distinct(
    concat(var.base_security_groups, var.extra_security_groups)
  )
}

resource "aws_instance" "app" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  vpc_security_group_ids = local.all_security_groups
}
```

## Deduplicating Tags from Multiple Sources

Tags often come from multiple sources - account-level defaults, team defaults, and resource-specific tags. Using `distinct` on the keys prevents duplicate tag keys.

```hcl
variable "global_tags" {
  type = list(string)
  default = ["Environment", "Project", "Owner"]
}

variable "resource_tags" {
  type = list(string)
  default = ["Environment", "CostCenter", "Tier"]
}

locals {
  # Get a unique list of all tag keys being applied
  all_tag_keys = distinct(concat(var.global_tags, var.resource_tags))
  # Result: ["Environment", "Project", "Owner", "CostCenter", "Tier"]
}

output "unique_tag_keys" {
  value = local.all_tag_keys
}
```

## Combining distinct with for_each

When iterating over a list to create resources, duplicates will cause `for_each` errors since it requires unique keys. Use `toset` or `distinct` + `toset` to handle this.

```hcl
variable "environments" {
  type    = list(string)
  # May contain duplicates from upstream configuration
  default = ["dev", "staging", "prod", "dev", "staging"]
}

locals {
  # Remove duplicates before using as for_each keys
  unique_environments = toset(distinct(var.environments))
}

resource "aws_s3_bucket" "env_bucket" {
  for_each = local.unique_environments
  bucket   = "myapp-${each.key}-artifacts"

  tags = {
    Environment = each.key
  }
}
```

## Using distinct with Data Sources

Data sources sometimes return overlapping results when queried with broad filters. Clean the results before use.

```hcl
data "aws_subnets" "private_a" {
  filter {
    name   = "tag:Type"
    values = ["private"]
  }
  filter {
    name   = "availability-zone"
    values = ["us-east-1a"]
  }
}

data "aws_subnets" "private_b" {
  filter {
    name   = "tag:Type"
    values = ["private"]
  }
  filter {
    name   = "availability-zone"
    values = ["us-east-1b"]
  }
}

locals {
  # Combine subnet IDs from both queries and deduplicate
  all_private_subnets = distinct(
    concat(data.aws_subnets.private_a.ids, data.aws_subnets.private_b.ids)
  )
}
```

## Conclusion

The `distinct` function is a lightweight but valuable tool in OpenTofu. Pair it with `concat`, `flatten`, and `toset` to build robust data pipelines that handle real-world messiness - duplicate entries from merged configurations, multi-source data, and user-provided variables.
