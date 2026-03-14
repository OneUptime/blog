# How to Use the concat Function to Merge Lists in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Concat Function, Lists, HCL, Infrastructure as Code, Collections

Description: Learn how to use the concat function in Terraform to merge multiple lists into a single flat list for building dynamic resource configurations.

---

Merging lists is one of the most common operations in Terraform. Whether you are combining security group IDs from different sources, aggregating CIDR blocks, or building a unified list of tags, the `concat` function is your go-to tool. It takes two or more lists and returns a single flat list containing all the elements from each input in order.

## What Is the concat Function?

The `concat` function takes two or more lists as arguments and returns a single list that contains all elements from every input list, in the order they were given.

```hcl
# concat(list1, list2, ...)
# Merges multiple lists into one
concat(["a", "b"], ["c", "d"], ["e"])
# Returns: ["a", "b", "c", "d", "e"]
```

Unlike `flatten`, which recursively flattens nested lists, `concat` only merges the top-level lists you pass to it. It does not look inside nested structures.

## Playing Around in terraform console

```hcl
# Launch with: terraform console

# Basic concatenation
> concat(["web", "api"], ["db", "cache"])
[
  "web",
  "api",
  "db",
  "cache",
]

# Three or more lists
> concat([1, 2], [3, 4], [5, 6], [7, 8])
[
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
]

# Empty lists are fine - they contribute nothing
> concat(["a"], [], ["b"], [])
[
  "a",
  "b",
]

# Single list - returns the same list
> concat(["only-list"])
[
  "only-list",
]

# concat does NOT flatten nested lists
> concat([["a", "b"]], [["c", "d"]])
[
  [
    "a",
    "b",
  ],
  [
    "c",
    "d",
  ],
]
```

## Merging Security Groups from Different Sources

One of the most frequent uses of `concat` is combining security group IDs from multiple variables or modules:

```hcl
variable "base_security_groups" {
  type    = list(string)
  default = ["sg-base001", "sg-base002"]
}

variable "app_security_groups" {
  type    = list(string)
  default = ["sg-app001"]
}

variable "enable_monitoring" {
  type    = bool
  default = true
}

locals {
  monitoring_sgs = var.enable_monitoring ? ["sg-monitoring001"] : []
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  # Merge all security group sources into one list
  vpc_security_group_ids = concat(
    var.base_security_groups,
    var.app_security_groups,
    local.monitoring_sgs,
  )

  tags = {
    Name = "app-server"
  }
}
```

This pattern keeps your security group assignments clean and modular. Each source is independent, and you can conditionally include groups by using empty lists as the "off" state.

## Conditional List Inclusion

The combination of `concat` with conditional empty lists is a powerful pattern:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "enable_debug" {
  type    = bool
  default = false
}

locals {
  # Base IAM policies for all environments
  base_policies = [
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
  ]

  # Production-only policies
  prod_policies = var.environment == "production" ? [
    "arn:aws:iam::aws:policy/AmazonRDSFullAccess",
    "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess",
  ] : []

  # Debug policies - only when debugging is enabled
  debug_policies = var.enable_debug ? [
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ] : []

  # Final merged list
  all_policies = concat(
    local.base_policies,
    local.prod_policies,
    local.debug_policies,
  )
}
```

When a condition is false, the corresponding variable evaluates to an empty list `[]`, and `concat` simply skips it.

## Combining Module Outputs

When using multiple modules that each produce lists, `concat` brings them together:

```hcl
module "vpc_us_east" {
  source = "./modules/vpc"
  region = "us-east-1"
  cidr   = "10.0.0.0/16"
}

module "vpc_us_west" {
  source = "./modules/vpc"
  region = "us-west-2"
  cidr   = "10.1.0.0/16"
}

module "vpc_eu_west" {
  source = "./modules/vpc"
  region = "eu-west-1"
  cidr   = "10.2.0.0/16"
}

locals {
  # Collect all subnet IDs across regions
  all_private_subnets = concat(
    module.vpc_us_east.private_subnet_ids,
    module.vpc_us_west.private_subnet_ids,
    module.vpc_eu_west.private_subnet_ids,
  )

  all_public_subnets = concat(
    module.vpc_us_east.public_subnet_ids,
    module.vpc_us_west.public_subnet_ids,
    module.vpc_eu_west.public_subnet_ids,
  )
}

output "all_private_subnets" {
  value = local.all_private_subnets
}
```

## Building User Data Scripts

The `concat` function is handy for assembling multi-part configurations:

```hcl
variable "extra_packages" {
  type    = list(string)
  default = ["htop", "jq"]
}

locals {
  # Base packages that always get installed
  base_packages = ["curl", "wget", "vim", "unzip"]

  # Security packages
  security_packages = ["fail2ban", "ufw"]

  # All packages combined
  all_packages = concat(
    local.base_packages,
    local.security_packages,
    var.extra_packages,
  )

  # Build the user data script
  user_data = <<-EOT
    #!/bin/bash
    apt-get update
    apt-get install -y ${join(" ", local.all_packages)}
  EOT
}
```

## concat vs flatten

People sometimes confuse `concat` with `flatten`. Here is the key difference:

```hcl
locals {
  nested = [["a", "b"], ["c", "d"]]

  # concat requires you to pass each list as a separate argument
  # It does NOT work on a list of lists passed as a single argument
  # This would fail: concat(local.nested)

  # flatten works on nested lists within a single list
  flat = flatten(local.nested)
  # Result: ["a", "b", "c", "d"]

  # concat merges separate lists
  merged = concat(["a", "b"], ["c", "d"])
  # Result: ["a", "b", "c", "d"]
}
```

Use `concat` when you have separate list variables or expressions. Use `flatten` when you have a list of lists (like the result of a `for` expression that produces lists).

## Dynamic concat with for Expressions

You can use `concat` inside `for` expressions for more complex list building:

```hcl
variable "environments" {
  type = map(object({
    subnets = list(string)
    extra_cidrs = list(string)
  }))
  default = {
    dev = {
      subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
      extra_cidrs = ["192.168.1.0/24"]
    }
    staging = {
      subnets     = ["10.1.1.0/24", "10.1.2.0/24"]
      extra_cidrs = []
    }
  }
}

locals {
  # For each environment, create a combined CIDR list
  env_all_cidrs = {
    for env, config in var.environments : env => concat(
      config.subnets,
      config.extra_cidrs,
      ["0.0.0.0/0"],  # Always include a default route
    )
  }
}
```

## Prepending and Appending

Since `concat` preserves order, you can use it to prepend or append items to a list:

```hcl
variable "existing_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
}

locals {
  # Prepend a deny-all rule at the beginning
  deny_all_rule = [{
    port        = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }]

  # Append a monitoring rule at the end
  monitoring_rule = [{
    port        = 9090
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }]

  # Final ordered list: deny-all first, existing rules, monitoring last
  all_rules = concat(
    local.deny_all_rule,
    var.existing_rules,
    local.monitoring_rule,
  )
}
```

## Working with Mixed Types

All lists passed to `concat` must contain the same type. You cannot mix strings and numbers:

```hcl
# This would fail
# concat(["hello"], [42])

# Convert to a common type first
locals {
  string_list  = ["hello"]
  number_list  = [42]

  # Convert numbers to strings before concatenating
  merged = concat(
    local.string_list,
    [for n in local.number_list : tostring(n)]
  )
  # Result: ["hello", "42"]
}
```

## Building Resource Dependencies

The `concat` function helps when you need to express complex dependency lists:

```hcl
resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2

  # Build a comprehensive depends_on equivalent through data flow
  # by referencing concatenated lists of IDs
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  network_configuration {
    subnets = concat(
      aws_subnet.private_a[*].id,
      aws_subnet.private_b[*].id,
    )
    security_groups = concat(
      [aws_security_group.ecs_tasks.id],
      var.additional_security_groups,
    )
  }
}
```

## Summary

The `concat` function is one of the most commonly used functions in Terraform because merging lists is a fundamental operation in infrastructure configuration. Its strength is in its simplicity - it takes multiple lists and returns one. Combined with conditional empty lists, it creates a clean pattern for dynamic configuration. Remember that `concat` merges top-level lists (it does not flatten nested structures), all input lists must contain the same type, and empty lists are valid inputs that contribute nothing to the result.

For related reading, check out our posts on the [distinct function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-distinct-function-to-deduplicate-lists/view) for removing duplicates and the [compact function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-compact-function-to-remove-empty-strings/view) for removing empty strings from lists.
