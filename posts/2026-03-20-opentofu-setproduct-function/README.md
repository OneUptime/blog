# How to Use the setproduct Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the setproduct function in OpenTofu to compute the Cartesian product of multiple sets for generating all combinations of resource configurations.

## Introduction

The `setproduct` function in OpenTofu computes the Cartesian product of two or more sets, returning a list of all possible combinations. This is extremely useful for creating one resource per combination of environments, regions, instance types, or any other multi-dimensional configuration.

## Syntax

```hcl
setproduct(sets...)
```

- Returns a list of lists (not a set), one per combination
- Each inner list contains one element from each input set

## Basic Examples

```hcl
output "product" {
  value = setproduct(["a", "b"], ["x", "y"])
  # Returns [["a", "x"], ["a", "y"], ["b", "x"], ["b", "y"]]
}
```

## Practical Use Cases

### All Environment × Region Combinations

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

variable "regions" {
  type    = list(string)
  default = ["us-east-1", "eu-west-1"]
}

locals {
  env_region_combos = setproduct(var.environments, var.regions)

  # Convert to map for for_each
  deployments = {
    for combo in local.env_region_combos :
    "${combo[0]}-${combo[1]}" => {
      environment = combo[0]
      region      = combo[1]
    }
  }
}

output "all_deployments" {
  value = keys(local.deployments)
  # ["dev-eu-west-1", "dev-us-east-1", "prod-eu-west-1", ...]
}
```

### IAM Role-Permission Matrix

```hcl
variable "roles" {
  type    = list(string)
  default = ["developer", "operator", "viewer"]
}

variable "resources" {
  type    = list(string)
  default = ["s3-bucket", "ec2-instance", "rds-instance"]
}

locals {
  role_resource_pairs = setproduct(var.roles, var.resources)

  policy_assignments = {
    for pair in local.role_resource_pairs :
    "${pair[0]}-${pair[1]}" => {
      role     = pair[0]
      resource = pair[1]
    }
  }
}
```

### Security Group Rules for All Service Pairs

```hcl
variable "source_services" {
  type    = list(string)
  default = ["api", "worker"]
}

variable "target_services" {
  type    = list(string)
  default = ["database", "cache"]
}

locals {
  service_pairs = setproduct(var.source_services, var.target_services)
}

output "required_connections" {
  value = [for p in local.service_pairs : "${p[0]} → ${p[1]}"]
}
```

## Step-by-Step Usage

```bash
tofu console

> setproduct(["x", "y"], ["1", "2"])
[["x", "1"], ["x", "2"], ["y", "1"], ["y", "2"]]
```

## Conclusion

The `setproduct` function generates all combinations from multiple sets, enabling declarative multi-dimensional resource creation in OpenTofu. Use it for environment × region deployments, role × resource permission matrices, and any configuration requiring cross-product expansion.
