# How to Use the keys and values Functions in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the keys and values functions in OpenTofu to extract map keys and values as sorted lists for iteration and aggregation.

## Introduction

The `keys` and `values` functions in OpenTofu extract the keys and values from a map, returning them as sorted lists. These functions are fundamental for working with maps - enabling iteration, aggregation, and conversion to lists for use with `for_each`, `count`, and list functions.

## Syntax

```hcl
keys(map)
values(map)
```

- `keys` returns a sorted list of all keys in the map
- `values` returns a list of all values, sorted by their corresponding key
- Both maintain consistent ordering (sorted by key)

## Basic Examples

```hcl
variable "service_ports" {
  type = map(number)
  default = {
    api     = 8080
    worker  = 9090
    metrics = 9100
  }
}

output "service_names" {
  value = keys(var.service_ports)    # Returns ["api", "metrics", "worker"] (sorted)
}

output "port_numbers" {
  value = values(var.service_ports)  # Returns [8080, 9100, 9090] (sorted by key)
}
```

## Practical Use Cases

### Iterating Over Map Keys

```hcl
variable "environments" {
  type = map(string)
  default = {
    dev     = "t3.small"
    staging = "t3.medium"
    prod    = "t3.large"
  }
}

resource "aws_instance" "servers" {
  for_each      = var.environments
  ami           = data.aws_ami.ubuntu.id
  instance_type = each.value

  tags = {
    Name        = "server-${each.key}"
    Environment = each.key
  }
}

output "environment_list" {
  value = keys(var.environments)  # ["dev", "prod", "staging"]
}
```

### Summing Map Values

```hcl
variable "service_costs" {
  type = map(number)
  default = {
    api      = 450
    database = 200
    storage  = 120
    network  = 85
  }
}

locals {
  total_cost = sum(values(var.service_costs))
}

output "total_monthly_cost" {
  value = local.total_cost  # Returns 855
}
```

### Validating Map Keys

```hcl
variable "deployment_config" {
  type = map(string)
}

locals {
  required_keys = ["image", "replicas", "memory"]
  provided_keys = keys(var.deployment_config)
  missing_keys  = [for k in local.required_keys : k if !contains(local.provided_keys, k)]
}

resource "null_resource" "config_validation" {
  lifecycle {
    precondition {
      condition     = length(local.missing_keys) == 0
      error_message = "Missing required config keys: ${join(", ", local.missing_keys)}"
    }
  }
}
```

### Extracting All Unique Values

```hcl
variable "team_regions" {
  type = map(list(string))
  default = {
    platform = ["us-east-1", "us-west-2"]
    data     = ["us-east-1", "eu-west-1"]
    ml       = ["us-west-2"]
  }
}

locals {
  all_regions = distinct(flatten(values(var.team_regions)))
}

output "all_deployed_regions" {
  value = local.all_regions
}
```

## Step-by-Step Usage

1. Have a map variable or local.
2. Call `keys(map)` or `values(map)`.
3. Use the resulting sorted list in iterations or aggregations.

```bash
tofu console

> keys({b = 2, a = 1, c = 3})
["a", "b", "c"]
> values({b = 2, a = 1, c = 3})
[1, 2, 3]
```

## Consistent Ordering

Both `keys` and `values` sort by key alphabetically. This means:
- `keys(m)[i]` and `values(m)[i]` always correspond to the same map entry.
- You can safely use `index`, `element`, and `zipmap` operations knowing the ordering is consistent.

## Conclusion

The `keys` and `values` functions are essential companions for map manipulation in OpenTofu. They enable aggregation (`sum(values(...))`), validation (`keys` for checking required keys), and list conversion. Their consistent sort order ensures you can rely on positional correspondence between the two lists.
