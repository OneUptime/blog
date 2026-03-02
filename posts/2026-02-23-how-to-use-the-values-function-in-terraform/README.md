# How to Use the values Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collection

Description: Learn how to use the values function in Terraform to extract all values from a map and work with them as a list for resource creation and data processing.

---

Maps are everywhere in Terraform. You use them for tags, variable lookups, resource configurations, and module outputs. But sometimes you only care about the values in a map, not the keys. That is where the `values` function comes in.

## What is the values Function?

The `values` function takes a map and returns a list containing all the values from that map. The keys are discarded.

```hcl
# Extract just the values from a map
> values({ "a" = 1, "b" = 2, "c" = 3 })
[
  1,
  2,
  3,
]
```

The syntax is straightforward:

```hcl
values(map)
```

## Ordering of Results

An important thing to know: the values are returned in **lexicographic order of the keys**, not in the order you wrote them. This is because Terraform maps are ordered by key.

```hcl
> values({ "zebra" = "z", "apple" = "a", "mango" = "m" })
[
  "a",
  "m",
  "z",
]
```

The values came out as `"a"`, `"m"`, `"z"` because the keys `"apple"`, `"mango"`, `"zebra"` are in alphabetical order.

## Practical Example: Getting All Instance IDs

When you create resources using `for_each` with a map, the result is also a map. To get a flat list of a specific attribute, you can use `values`:

```hcl
variable "servers" {
  type = map(object({
    instance_type = string
    ami           = string
  }))
  default = {
    web = {
      instance_type = "t3.medium"
      ami           = "ami-12345"
    }
    api = {
      instance_type = "t3.large"
      ami           = "ami-12345"
    }
    worker = {
      instance_type = "m5.xlarge"
      ami           = "ami-67890"
    }
  }
}

resource "aws_instance" "server" {
  for_each      = var.servers
  ami           = each.value.ami
  instance_type = each.value.instance_type

  tags = {
    Name = each.key
  }
}

# Get all instance IDs as a list
output "all_instance_ids" {
  value = values(aws_instance.server)[*].id
}
```

## Aggregating Values from a Map

The `values` function pairs well with aggregation functions like `sum`:

```hcl
variable "team_budgets" {
  type = map(number)
  default = {
    engineering = 50000
    marketing   = 30000
    operations  = 25000
    security    = 20000
  }
}

locals {
  # Get total budget across all teams
  total_budget = sum(values(var.team_budgets))
  # Result: 125000
}

output "total_budget" {
  value = local.total_budget
}
```

## Using values with for_each Resources

When you create resources with `for_each`, the result is a map keyed by the `for_each` keys. Using `values` lets you work with the resources as a list:

```hcl
resource "aws_subnet" "main" {
  for_each = {
    public-1  = { cidr = "10.0.1.0/24", az = "us-east-1a" }
    public-2  = { cidr = "10.0.2.0/24", az = "us-east-1b" }
    private-1 = { cidr = "10.0.3.0/24", az = "us-east-1a" }
    private-2 = { cidr = "10.0.4.0/24", az = "us-east-1b" }
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = each.key
  }
}

# Get all subnet IDs as a flat list
output "all_subnet_ids" {
  value = values(aws_subnet.main)[*].id
}

# Get all CIDR blocks
output "all_cidrs" {
  value = values(aws_subnet.main)[*].cidr_block
}
```

## Combining values with Other Functions

### values with contains

Check if a specific value exists anywhere in a map:

```hcl
variable "instance_types" {
  type = map(string)
  default = {
    web    = "t3.medium"
    api    = "t3.large"
    worker = "m5.xlarge"
    cache  = "r5.large"
  }
}

locals {
  # Check if any server is using an xlarge instance
  has_xlarge = anytrue([
    for v in values(var.instance_types) : can(regex("xlarge", v))
  ])
  # Result: true
}
```

### values with distinct

Get unique values from a map:

```hcl
variable "server_amis" {
  type = map(string)
  default = {
    web-1    = "ami-12345"
    web-2    = "ami-12345"
    api-1    = "ami-67890"
    worker-1 = "ami-12345"
  }
}

locals {
  # Find all unique AMIs in use
  unique_amis = distinct(values(var.server_amis))
  # Result: ["ami-12345", "ami-67890"]
}
```

### values with flatten

When your map values are lists, you can flatten them:

```hcl
variable "team_members" {
  type = map(list(string))
  default = {
    backend  = ["alice", "bob"]
    frontend = ["carol", "dave"]
    devops   = ["eve"]
  }
}

locals {
  # Get a flat list of all team members
  all_members = flatten(values(var.team_members))
  # Result: ["alice", "bob", "carol", "dave", "eve"]
}
```

## values vs keys

The `values` function has a sibling - `keys` - which returns the keys instead:

```hcl
locals {
  config = {
    region   = "us-east-1"
    env      = "production"
    team     = "platform"
  }

  # Get the keys
  config_keys = keys(local.config)
  # Result: ["env", "region", "team"] (sorted alphabetically)

  # Get the values
  config_values = values(local.config)
  # Result: ["production", "us-east-1", "platform"] (ordered by sorted keys)
}
```

Since both `keys` and `values` use the same key ordering, the Nth element of `keys()` always corresponds to the Nth element of `values()`. This is useful when you need to process key-value pairs positionally.

## Using values to Build Dynamic Lists

```hcl
variable "dns_records" {
  type = map(object({
    type  = string
    value = string
    ttl   = number
  }))
  default = {
    www  = { type = "CNAME", value = "lb.example.com", ttl = 300 }
    api  = { type = "CNAME", value = "lb.example.com", ttl = 300 }
    mail = { type = "MX",    value = "mail.example.com", ttl = 3600 }
  }
}

locals {
  # Get all DNS values for auditing
  all_dns_targets = [for record in values(var.dns_records) : record.value]
  # Result: ["lb.example.com", "lb.example.com", "mail.example.com"]

  # Get unique targets
  unique_dns_targets = distinct([for record in values(var.dns_records) : record.value])
  # Result: ["lb.example.com", "mail.example.com"]
}
```

## Passing values to Modules

Sometimes you need to pass all values from a map to a module that expects a list:

```hcl
variable "security_group_ids" {
  type = map(string)
  default = {
    web     = "sg-111"
    api     = "sg-222"
    default = "sg-333"
  }
}

module "ecs_service" {
  source = "./modules/ecs-service"

  # The module expects a list of security group IDs
  security_group_ids = values(var.security_group_ids)
}
```

## Edge Cases

```hcl
# Empty map returns empty list
> values({})
[]

# Map with one entry returns single-element list
> values({ "only" = "value" })
[
  "value",
]

# Works with any value type
> values({ "a" = true, "b" = false })
[
  true,
  false,
]
```

## A Note on Object Types

The `values` function works with maps but not with object types directly. If you have an object, you may need to use a `for` expression:

```hcl
# This works with a map
values({ "a" = 1, "b" = 2 })

# For complex objects, use for expressions
locals {
  config = {
    name = "myapp"
    port = 8080
  }
  config_values = [for k, v in local.config : v]
}
```

## Summary

The `values` function is a simple, essential tool for extracting the value side of Terraform maps. It is particularly useful when working with `for_each` resources, aggregating data across map entries, and passing map data to functions or modules that expect lists. Remember that values are returned in the lexicographic order of their keys, and pair `values` with `keys` when you need both sides of a map in parallel. For more on working with maps, see our posts on the [merge function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-merge-to-combine-tag-maps-in-terraform/view) and the [lookup function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-lookup-with-default-values-in-terraform/view).
