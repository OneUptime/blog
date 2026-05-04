# How to Choose Between count and for_each in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Count, for_each, Resource, HCL, Infrastructure as Code, DevOps

Description: Learn when to use count versus for_each in OpenTofu, understand their tradeoffs, and choose the right meta-argument for creating multiple resource instances.

---

Both `count` and `for_each` create multiple instances of a resource, but they work differently and suit different situations. Choosing the right one affects how OpenTofu tracks your resources in state and how changes are handled.

---

## count: Index-Based Instances

`count` creates N copies of a resource, indexed numerically starting at 0:

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  tags = { Name = "web-${count.index}" }
}

# Access individual instances:

# aws_instance.web[0]
# aws_instance.web[1]
# aws_instance.web[2]
```

`count.index` gives you the zero-based position of the current instance.

---

## for_each: Key-Based Instances

`for_each` creates one instance per item in a map or set, keyed by the element:

```hcl
locals {
  instances = {
    web    = "t3.micro"
    api    = "t3.small"
    worker = "t3.medium"
  }
}

resource "aws_instance" "app" {
  for_each      = local.instances
  ami           = data.aws_ami.amazon_linux.id
  instance_type = each.value

  tags = { Name = each.key }
}

# Access individual instances:
# aws_instance.app["web"]
# aws_instance.app["api"]
# aws_instance.app["worker"]
```

`each.key` and `each.value` give you the map key and value.

---

## Key Difference: Stability Under Changes

This is the most important distinction. With `count`, instances are tracked by index. Removing an item from the middle causes all subsequent instances to be destroyed and recreated:

```hcl
# count = 3 → [0: web, 1: api, 2: worker]
# Remove "api" → count = 2 → [0: web, 1: worker]
# "worker" changes from index 1 to index 1 (same), but "api" is deleted
# and OpenTofu may reassign resources unexpectedly
```

With `for_each`, instances are tracked by key. Removing an item only destroys that specific instance - all others are untouched:

```hcl
# for_each with keys: web, api, worker
# Remove "api" → only aws_instance.app["api"] is destroyed
# aws_instance.app["web"] and aws_instance.app["worker"] unchanged
```

---

## When to Use count

Use `count` when:

- The number of instances is what matters, not their identity
- Instances are identical (no per-instance configuration)
- You need a conditional resource (`count = var.enable ? 1 : 0`)

```hcl
# Conditional resource - count excels here
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"
}
```

---

## When to Use for_each

Use `for_each` when:

- Instances have distinct identities (names, roles, or configurations)
- The set may change over time (add/remove specific items)
- You're iterating over a map or set of strings

```hcl
# Multiple S3 buckets with different names and configs
variable "buckets" {
  type = map(object({
    versioning = bool
    region     = string
  }))
}

resource "aws_s3_bucket" "data" {
  for_each = var.buckets
  bucket   = each.key

  tags = { Region = each.value.region }
}
```

---

## Converting a List for for_each

`for_each` requires a map or set - not a list. Convert a list to a set:

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "public" {
  for_each          = toset(var.availability_zones)
  availability_zone = each.key
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, index(var.availability_zones, each.key))
}
```

---

## Quick Comparison

| Aspect | count | for_each |
|---|---|---|
| Tracked by | Numeric index | String key |
| Best for | Identical copies | Distinct instances |
| Conditional resource | Yes (`count = 0 or 1`) | No |
| Safe removals | No (re-indexes) | Yes (key-stable) |
| Requires | Number | Map or set |

---

## Summary

Use `count` for identical, interchangeable resources or conditional resources (`count = 0 or 1`). Use `for_each` when each instance has a distinct identity or when the set of instances may change over time - it tracks resources by key rather than by index, making additions and removals safe. When in doubt, prefer `for_each` for resource collections since it avoids the re-indexing problem.
