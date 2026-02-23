# How to Use the tolist Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Type Conversion

Description: Learn how to use the tolist function in Terraform to convert sets and other collection types into ordered lists for indexing and count-based operations.

---

Terraform has a type system, and sometimes it gets in your way. You have a set but need a list. A function returns a set when you need to index into the result. Your module output is a set but the consumer expects a list. The `tolist` function solves all of these situations by converting a value to a list type.

## What is tolist?

The `tolist` function converts its argument to a list value. It is most commonly used to convert sets to lists, since sets and lists are the two main sequence types in Terraform.

```hcl
# Convert a set to a list
> tolist(toset(["c", "a", "b"]))
[
  "a",
  "b",
  "c",
]
```

The syntax:

```hcl
tolist(value)
```

## Why Would You Need tolist?

The key differences between sets and lists in Terraform are:

1. **Lists are ordered** - you can index into them with `[0]`, `[1]`, etc.
2. **Sets are unordered** - you cannot index into them
3. **Sets contain unique values** - duplicates are removed automatically
4. **Lists can contain duplicates**

Many Terraform functions return sets (like `setunion`, `setintersection`, `toset`). If you need to use the result with `count` or index into it, you need to convert it to a list first.

## Converting Sets to Lists

The most common use case:

```hcl
locals {
  # setunion returns a set
  all_regions = setunion(["us-east-1", "us-west-2"], ["us-east-1", "eu-west-1"])

  # Cannot do this with a set:
  # first_region = local.all_regions[0]  # Error!

  # Convert to list first, then index
  region_list  = tolist(local.all_regions)
  first_region = local.region_list[0]
}
```

## Practical Example: Using count with Set Results

When you want to create resources based on a set, you need `tolist` because `count` requires list indexing:

```hcl
variable "dev_subnets" {
  type    = set(string)
  default = ["subnet-aaa", "subnet-bbb"]
}

variable "staging_subnets" {
  type    = set(string)
  default = ["subnet-bbb", "subnet-ccc"]
}

locals {
  # Combine subnets - setunion returns a set
  all_subnets = setunion(var.dev_subnets, var.staging_subnets)

  # Convert to list for count-based resource creation
  subnet_list = tolist(local.all_subnets)
}

# Create a resource in each unique subnet
resource "aws_instance" "app" {
  count         = length(local.subnet_list)
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = local.subnet_list[count.index]

  tags = {
    Name = "app-${count.index}"
  }
}
```

## tolist with for_each

While `for_each` works directly with sets, sometimes you need list behavior for ordering:

```hcl
variable "availability_zones" {
  type    = set(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  # Convert to list for predictable ordering
  az_list = tolist(var.availability_zones)
}

# Use the index to create sequential CIDR blocks
resource "aws_subnet" "main" {
  count             = length(local.az_list)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = local.az_list[count.index]

  tags = {
    Name = "subnet-${count.index}"
  }
}
```

## Converting Tuple Types

Terraform sometimes infers tuple types for heterogeneous collections. `tolist` can normalize these:

```hcl
# A tuple from a conditional expression
locals {
  raw_value = true ? ["a", "b"] : ["c"]

  # Ensure it is treated as a list
  normalized = tolist(local.raw_value)
}
```

## Module Output Conversion

When a module outputs a set and you need a list:

```hcl
# In a module that outputs a set
output "security_group_ids" {
  value = toset(["sg-111", "sg-222", "sg-333"])
}

# In the calling configuration
locals {
  # Convert the module output set to a list
  sg_list = tolist(module.networking.security_group_ids)

  # Now you can index into it
  primary_sg = local.sg_list[0]
}
```

## Combining tolist with slice

Since `slice` requires a list, you often need `tolist` first:

```hcl
locals {
  all_zones = setunion(
    ["us-east-1a", "us-east-1b"],
    ["us-east-1b", "us-east-1c", "us-east-1d"]
  )

  # Convert set to list, then take the first 3
  selected_zones = slice(tolist(local.all_zones), 0, min(3, length(local.all_zones)))
}
```

## tolist and Sorting

Sets in Terraform are stored in lexicographic order. When you convert a set to a list with `tolist`, the elements maintain that order:

```hcl
> tolist(toset(["cherry", "apple", "banana"]))
[
  "apple",
  "banana",
  "cherry",
]
```

This means `tolist(toset(list))` is actually a way to sort and deduplicate a list in one step:

```hcl
# Sort and deduplicate
> tolist(toset(["b", "a", "c", "a", "b"]))
[
  "a",
  "b",
  "c",
]
```

## Working with Data Source Results

Some data sources return sets. Converting to lists lets you work with specific elements:

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Ensure we have a list for indexing
  azs = tolist(data.aws_availability_zones.available.names)

  # Pick specific AZs
  primary_az   = local.azs[0]
  secondary_az = local.azs[1]
}
```

## tolist with Numeric Sets

```hcl
# Works with number sets too
> tolist(toset([3, 1, 4, 1, 5, 9, 2, 6]))
[
  1,
  2,
  3,
  4,
  5,
  6,
  9,
]
```

The set removes the duplicate `1`, and `tolist` gives you an indexable result.

## Common Patterns

### Pattern 1: Set operations followed by list consumption

```hcl
locals {
  team_a_permissions = toset(["read", "write", "execute"])
  team_b_permissions = toset(["read", "admin"])

  # Set intersection returns a set
  shared_permissions = setintersection(local.team_a_permissions, local.team_b_permissions)

  # Convert for downstream use
  shared_list = tolist(local.shared_permissions)
  # Result: ["read"]
}
```

### Pattern 2: Deduplication before resource creation

```hcl
variable "all_cidrs" {
  type = list(string)
  default = [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "10.0.0.0/8",  # duplicate
    "192.168.0.0/16"
  ]
}

locals {
  # Remove duplicates and get a clean list
  unique_cidrs = tolist(toset(var.all_cidrs))
  # Result: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}
```

### Pattern 3: Converting for length-based operations

```hcl
locals {
  unique_items = setunion(var.list_a, var.list_b)

  # length works on sets, but count-based indexing needs lists
  item_count = length(local.unique_items)
  item_list  = tolist(local.unique_items)
}

resource "null_resource" "item" {
  count = local.item_count
  triggers = {
    item = local.item_list[count.index]
  }
}
```

## What tolist Cannot Do

```hcl
# Cannot convert maps to lists directly
# tolist({ "a" = 1 })  # Error!
# Use values() for maps instead

# Cannot convert strings to lists
# tolist("hello")  # Error!
# Use split() or [value] instead

# Cannot convert numbers to lists
# tolist(42)  # Error!
```

## Edge Cases

```hcl
# Empty set converts to empty list
> tolist(toset([]))
[]

# Already a list - returns as-is
> tolist(["a", "b"])
[
  "a",
  "b",
]

# Preserves duplicates in lists (only sets remove them)
> tolist(["a", "a", "b"])
[
  "a",
  "a",
  "b",
]
```

## Summary

The `tolist` function is your bridge between Terraform's set type and list type. Reach for it whenever you need to index into a set result, use a set with `count`, or pass a set to a function that requires a list. The most common pattern is converting the output of set operations (`setunion`, `setintersection`, `setsubtract`) into lists for resource creation. For the reverse operation, check out the [toset function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-toset-function-in-terraform/view), and for other type conversions, see the [tomap function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tomap-function-in-terraform/view).
