# How to Use the setproduct Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Set Functions

Description: Learn how to use the setproduct function in Terraform to compute the Cartesian product of multiple sets, with examples for generating resource combinations.

---

When building infrastructure, you frequently need to create resources for every combination of two or more dimensions - like deploying a service in every region for every environment, or creating subnets for every availability zone in every VPC. The `setproduct` function computes the Cartesian product of multiple sets, generating every possible combination of elements.

This post explains how `setproduct` works, its output format, and real-world patterns for generating multi-dimensional resource configurations.

## What is the setproduct Function?

The `setproduct` function takes two or more lists (or sets) and returns a list of all possible combinations, taking one element from each input.

```hcl
# Returns all combinations of elements from the input sets
setproduct(set1, set2, ...)
```

Each element in the result is a list containing one element from each input set.

## Basic Usage in Terraform Console

```hcl
# Cartesian product of two sets
> setproduct(["a", "b"], ["1", "2"])
[
  ["a", "1"],
  ["a", "2"],
  ["b", "1"],
  ["b", "2"],
]

# Three sets
> setproduct(["a", "b"], ["1", "2"], ["x"])
[
  ["a", "1", "x"],
  ["a", "2", "x"],
  ["b", "1", "x"],
  ["b", "2", "x"],
]

# Single-element sets
> setproduct(["only"], ["single"])
[
  ["only", "single"],
]

# Empty set produces empty result
> setproduct(["a", "b"], [])
[]
```

The number of results equals the product of the lengths of all input sets. For `setproduct(["a", "b"], ["1", "2", "3"])`, you get 2 * 3 = 6 combinations.

## Environment-Region Matrix

The most common use of `setproduct` is creating resources across multiple dimensions.

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

variable "regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2"]
}

locals {
  # Generate all environment-region combinations
  deployments = [
    for pair in setproduct(var.environments, var.regions) : {
      environment = pair[0]
      region      = pair[1]
      name        = "${pair[0]}-${pair[1]}"
    }
  ]
}

resource "aws_s3_bucket" "state" {
  for_each = {
    for d in local.deployments : d.name => d
  }

  bucket = "terraform-state-${each.key}"

  tags = {
    Environment = each.value.environment
    Region      = each.value.region
  }
}

output "all_deployments" {
  value = [for d in local.deployments : d.name]
  # ["dev-us-east-1", "dev-us-west-2", "staging-us-east-1",
  #  "staging-us-west-2", "prod-us-east-1", "prod-us-west-2"]
}
```

## Subnet Creation Across VPCs and AZs

Generate subnets for every VPC and availability zone combination.

```hcl
variable "vpcs" {
  type = map(string)
  default = {
    production = "10.0.0.0/16"
    staging    = "10.1.0.0/16"
  }
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  vpc_az_combinations = [
    for pair in setproduct(keys(var.vpcs), var.availability_zones) : {
      vpc_name = pair[0]
      az       = pair[1]
      key      = "${pair[0]}-${pair[1]}"
    }
  ]
}

resource "aws_subnet" "all" {
  for_each = {
    for combo in local.vpc_az_combinations : combo.key => combo
  }

  vpc_id            = aws_vpc.all[each.value.vpc_name].id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(
    var.vpcs[each.value.vpc_name],
    8,
    index(var.availability_zones, each.value.az)
  )

  tags = {
    Name = each.key
    VPC  = each.value.vpc_name
    AZ   = each.value.az
  }
}
```

## Security Group Rules Matrix

Generate security group rules for all port and CIDR combinations.

```hcl
variable "allowed_ports" {
  type    = list(number)
  default = [80, 443, 8080]
}

variable "allowed_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/8", "172.16.0.0/12"]
}

locals {
  # Create a rule for every port-CIDR combination
  sg_rules = [
    for pair in setproduct(var.allowed_ports, var.allowed_cidrs) : {
      port = pair[0]
      cidr = pair[1]
      key  = "${pair[0]}-${replace(pair[1], "/", "_")}"
    }
  ]
}

resource "aws_security_group_rule" "ingress" {
  for_each = {
    for rule in local.sg_rules : rule.key => rule
  }

  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  cidr_blocks       = [each.value.cidr]
  security_group_id = aws_security_group.app.id
}
```

## Three-Dimensional Products

You can use `setproduct` with three or more inputs for higher-dimensional combinations.

```hcl
variable "apps" {
  type    = list(string)
  default = ["api", "web"]
}

variable "envs" {
  type    = list(string)
  default = ["dev", "prod"]
}

variable "tiers" {
  type    = list(string)
  default = ["frontend", "backend"]
}

locals {
  # All app-env-tier combinations
  all_combos = [
    for triple in setproduct(var.apps, var.envs, var.tiers) : {
      app  = triple[0]
      env  = triple[1]
      tier = triple[2]
      name = "${triple[0]}-${triple[1]}-${triple[2]}"
    }
  ]
  # 2 * 2 * 2 = 8 combinations
}

resource "aws_cloudwatch_log_group" "apps" {
  for_each = {
    for combo in local.all_combos : combo.name => combo
  }

  name              = "/app/${each.value.app}/${each.value.env}/${each.value.tier}"
  retention_in_days = each.value.env == "prod" ? 90 : 14

  tags = {
    Application = each.value.app
    Environment = each.value.env
    Tier        = each.value.tier
  }
}
```

## Using setproduct with Maps

While `setproduct` works with lists and sets, you can use `keys` or `values` to work with map data.

```hcl
variable "databases" {
  type = map(object({
    engine = string
    size   = string
  }))
  default = {
    users    = { engine = "postgres", size = "large" }
    sessions = { engine = "redis", size = "medium" }
  }
}

variable "backup_schedules" {
  type    = list(string)
  default = ["daily", "weekly"]
}

locals {
  # Create backup configurations for each database-schedule combination
  backup_configs = [
    for pair in setproduct(keys(var.databases), var.backup_schedules) : {
      database = pair[0]
      schedule = pair[1]
      engine   = var.databases[pair[0]].engine
      key      = "${pair[0]}-${pair[1]}"
    }
  ]
}
```

## setproduct vs Nested for Expressions

You can achieve the same result as `setproduct` with nested `for` expressions and `flatten`. Here is the comparison.

```hcl
locals {
  envs    = ["dev", "prod"]
  regions = ["east", "west"]

  # Using setproduct
  combos_sp = [
    for pair in setproduct(local.envs, local.regions) :
    "${pair[0]}-${pair[1]}"
  ]

  # Using nested for + flatten
  combos_for = flatten([
    for env in local.envs : [
      for region in local.regions :
      "${env}-${region}"
    ]
  ])

  # Both produce: ["dev-east", "dev-west", "prod-east", "prod-west"]
}
```

`setproduct` is more concise for two dimensions. For three or more dimensions, the readability advantage grows significantly since nested `for` expressions become harder to follow.

## Filtering Combinations

Not all combinations may be valid. Filter them after generating.

```hcl
locals {
  instances = ["t3.micro", "t3.large", "m5.xlarge"]
  zones     = ["us-east-1a", "us-east-1b", "us-east-1c"]

  all_combos = [
    for pair in setproduct(local.instances, local.zones) : {
      type = pair[0]
      zone = pair[1]
    }
  ]

  # Filter: large instances only in zone a and b
  valid_combos = [
    for combo in local.all_combos : combo
    if !(combo.type == "m5.xlarge" && combo.zone == "us-east-1c")
  ]
}
```

## Edge Cases

- **Empty input**: If any input set is empty, the result is empty (no combinations possible).
- **Single-element inputs**: A single-element set contributes that one element to every combination.
- **Result size**: Be careful with large inputs. `setproduct` of lists with 10, 10, and 10 elements produces 1000 combinations.
- **Type consistency**: All elements within each input must be the same type, but different inputs can have different types.

```hcl
# Empty set produces no combinations
> setproduct(["a", "b"], [])
[]

# Size grows multiplicatively
# setproduct with inputs of size 5, 4, 3 produces 60 combinations
> length(setproduct(range(5), range(4), range(3)))
60
```

## Summary

The `setproduct` function generates all possible combinations from two or more sets, making it the go-to tool for multi-dimensional resource creation in Terraform.

Key takeaways:

- `setproduct` computes the Cartesian product of input sets
- Each result element is a list with one item from each input
- Result count equals the product of all input lengths
- Ideal for creating resources across multiple dimensions (environments, regions, tiers)
- Filter results after generation to exclude invalid combinations
- Be mindful of combinatorial explosion with many large inputs
- Part of the set function family alongside `setintersection` and `setsubtract`

Use `setproduct` whenever you need "every X for every Y" resource generation.
