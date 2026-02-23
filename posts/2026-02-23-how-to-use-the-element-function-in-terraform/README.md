# How to Use the element Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the element function in Terraform to retrieve items from a list by index with automatic wrap-around, with examples for round-robin distribution.

---

Accessing list elements by index is straightforward in most languages, but Terraform's `element` function adds a useful twist: it wraps around when the index exceeds the list length. This makes it perfect for round-robin distribution patterns, where you need to cycle through a list of options repeatedly.

This guide covers the `element` function's syntax, its wrap-around behavior, and practical use cases for distributing resources across zones, subnets, and more.

## What is the element Function?

The `element` function retrieves a single element from a list by its index. If the index is greater than or equal to the list length, it wraps around using modulo arithmetic.

```hcl
# Retrieves list[index % length(list)]
element(list, index)
```

The index is zero-based, meaning the first element is at index 0.

## Basic Usage in Terraform Console

```hcl
# Standard index access
> element(["a", "b", "c"], 0)
"a"

> element(["a", "b", "c"], 1)
"b"

> element(["a", "b", "c"], 2)
"c"

# Wrap-around when index exceeds list length
> element(["a", "b", "c"], 3)
"a"

> element(["a", "b", "c"], 4)
"b"

> element(["a", "b", "c"], 5)
"c"

# The pattern repeats indefinitely
> element(["a", "b", "c"], 6)
"a"
```

The wrap-around is equivalent to `list[index % length(list)]`. This is the key feature that distinguishes `element` from direct index access (`list[index]`), which throws an error for out-of-bounds indices.

## Round-Robin Subnet Distribution

The most classic use of `element` is distributing resources across a limited set of subnets or availability zones in a round-robin fashion.

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-aaa", "subnet-bbb", "subnet-ccc"]
}

variable "instance_count" {
  type    = number
  default = 7
}

# Distribute 7 instances across 3 subnets evenly
resource "aws_instance" "app" {
  count = var.instance_count

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # element wraps around: 0->subnet-aaa, 1->subnet-bbb, 2->subnet-ccc,
  # 3->subnet-aaa, 4->subnet-bbb, 5->subnet-ccc, 6->subnet-aaa
  subnet_id = element(var.subnet_ids, count.index)

  tags = {
    Name = "app-${count.index + 1}"
  }
}
```

With 7 instances and 3 subnets, the distribution would be: subnets A and A get 3 instances each, subnet B gets 2, and subnet C gets 2. The wrap-around handles this automatically.

## Cycling Through Availability Zones

When creating subnets, you often want to cycle through availability zones.

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

variable "subnet_count" {
  type    = number
  default = 6
}

resource "aws_subnet" "app" {
  count = var.subnet_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = element(data.aws_availability_zones.available.names, count.index)

  tags = {
    Name = "app-subnet-${count.index + 1}"
    AZ   = element(data.aws_availability_zones.available.names, count.index)
  }
}
```

If there are 3 availability zones and 6 subnets, each AZ gets exactly 2 subnets.

## element vs Direct Index Access

Terraform also supports direct index access with bracket notation. Here is how the two compare.

```hcl
variable "colors" {
  type    = list(string)
  default = ["red", "green", "blue"]
}

# Direct index access - errors on out-of-bounds
# var.colors[3] would throw an error

# element - wraps around on out-of-bounds
# element(var.colors, 3) returns "red"
```

Use `element` when you expect the index to potentially exceed the list length (like with `count.index`). Use direct bracket access when you know the index is valid and want an error if it is not.

## Assigning Colors or Labels Cyclically

A fun but practical use is assigning rotating labels, tags, or identifiers.

```hcl
locals {
  environment_colors = ["blue", "green", "canary"]
  deployment_slots   = 10
}

resource "null_resource" "deployment" {
  count = local.deployment_slots

  triggers = {
    slot  = count.index
    color = element(local.environment_colors, count.index)
  }
}

output "slot_assignments" {
  value = [
    for i in range(local.deployment_slots) :
    "Slot ${i}: ${element(local.environment_colors, i)}"
  ]
  # Output:
  # ["Slot 0: blue", "Slot 1: green", "Slot 2: canary",
  #  "Slot 3: blue", "Slot 4: green", "Slot 5: canary",
  #  "Slot 6: blue", "Slot 7: green", "Slot 8: canary",
  #  "Slot 9: blue"]
}
```

## Distributing EBS Volumes Across Types

You can use `element` to distribute storage volumes across different types.

```hcl
locals {
  volume_types = ["gp3", "io2", "st1"]
  volume_count = 9
}

resource "aws_ebs_volume" "data" {
  count = local.volume_count

  availability_zone = element(data.aws_availability_zones.available.names, count.index)
  size              = 100
  type              = element(local.volume_types, count.index)

  tags = {
    Name = "data-vol-${count.index + 1}"
    Type = element(local.volume_types, count.index)
  }
}
```

## Using element with for_each

While `element` is most commonly used with `count`, you can also use it in other contexts where you have a numeric index.

```hcl
locals {
  server_names = ["web", "api", "worker", "scheduler", "cache"]
  ip_pools     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  # Assign each server to an IP pool round-robin style
  server_pool_map = {
    for idx, name in local.server_names :
    name => element(local.ip_pools, idx)
  }
  # Result: {
  #   web       = "10.0.1.0/24"
  #   api       = "10.0.2.0/24"
  #   worker    = "10.0.3.0/24"
  #   scheduler = "10.0.1.0/24"
  #   cache     = "10.0.2.0/24"
  # }
}
```

## Combining element with length

Sometimes you need to validate or compute bounds before using `element`.

```hcl
variable "targets" {
  type = list(string)
}

variable "selected_index" {
  type = number
}

locals {
  # element already wraps, but if you need the actual wrapped index:
  effective_index = var.selected_index % length(var.targets)

  # These two produce the same result
  via_element = element(var.targets, var.selected_index)
  via_index   = var.targets[local.effective_index]
}
```

## Edge Cases

Be aware of these behaviors:

- **Empty list**: Calling `element` on an empty list causes an error, since there is no element to return.
- **Negative indices**: Negative indices are not supported and will cause an error.
- **Single-element list**: Any index will always return the same element (since every number mod 1 is 0).

```hcl
# Single element list - all indices return the same value
> element(["only"], 0)
"only"
> element(["only"], 99)
"only"

# Empty list causes an error
# element([], 0) -> Error
```

## Real-World Scenario: Multi-AZ Database Replicas

Here is a practical example distributing database read replicas across availability zones.

```hcl
variable "replica_count" {
  type    = number
  default = 5
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_db_instance" "primary" {
  identifier     = "app-db-primary"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  allocated_storage = 100
  username       = "admin"
  password       = var.db_password
}

resource "aws_db_instance" "replica" {
  count = var.replica_count

  identifier          = "app-db-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = "db.r6g.large"

  # Distribute replicas across AZs round-robin
  availability_zone = element(
    data.aws_availability_zones.available.names,
    count.index
  )

  tags = {
    Name = "app-db-replica-${count.index + 1}"
    AZ   = element(data.aws_availability_zones.available.names, count.index)
  }
}
```

## Summary

The `element` function is Terraform's answer to round-robin distribution. Its wrap-around behavior makes it ideal for spreading resources evenly across a fixed set of options like availability zones, subnets, and instance types.

Key takeaways:

- `element(list, index)` returns `list[index % length(list)]`
- The wrap-around behavior is the key differentiator from bracket index access
- Perfect for distributing `count`-based resources across zones, subnets, or pools
- Errors on empty lists and negative indices
- Single-element lists always return the same value regardless of index

Any time you have more resources than placement targets, `element` is the function you need.
