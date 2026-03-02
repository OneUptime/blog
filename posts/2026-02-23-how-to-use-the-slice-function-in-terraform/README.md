# How to Use the slice Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collection

Description: Learn how to use the slice function in Terraform to extract portions of lists for targeted infrastructure deployments and configurations.

---

When you are working with lists in Terraform, you will sometimes need to grab just a portion of a list rather than the whole thing. Maybe you want the first three subnets out of ten, or you need to split a list of servers into batches. The `slice` function is the right tool for this job.

## What is the slice Function?

The `slice` function extracts a contiguous portion of a list, given a start index and an end index. It works just like array slicing in most programming languages.

```hcl
# slice(list, start_index, end_index)
# start_index is inclusive, end_index is exclusive
> slice(["a", "b", "c", "d", "e"], 1, 3)
[
  "b",
  "c",
]
```

The start index is **inclusive** (the element at that position is included), and the end index is **exclusive** (the element at that position is not included). So `slice(list, 1, 3)` gives you elements at index 1 and 2.

## Basic Usage in Terraform Console

Let me walk through a few examples to get the feel for it:

```hcl
# Get the first two elements
> slice(["alpha", "beta", "gamma", "delta"], 0, 2)
[
  "alpha",
  "beta",
]

# Get the last two elements (you need to know the length)
> slice(["alpha", "beta", "gamma", "delta"], 2, 4)
[
  "gamma",
  "delta",
]

# Get a single element (as a list)
> slice(["alpha", "beta", "gamma", "delta"], 1, 2)
[
  "beta",
]

# Get everything from index 2 onward
> slice(["alpha", "beta", "gamma", "delta"], 2, length(["alpha", "beta", "gamma", "delta"]))
[
  "gamma",
  "delta",
]
```

## Practical Example: Distributing Subnets Across Availability Zones

A very common scenario is when you have a list of subnets and need to assign specific subnets to different tiers of your architecture:

```hcl
variable "subnet_ids" {
  description = "All subnet IDs in order: public, private, database"
  type        = list(string)
  default = [
    "subnet-pub-1", "subnet-pub-2", "subnet-pub-3",
    "subnet-priv-1", "subnet-priv-2", "subnet-priv-3",
    "subnet-db-1", "subnet-db-2", "subnet-db-3"
  ]
}

locals {
  # Split the flat list into three tiers using slice
  public_subnets   = slice(var.subnet_ids, 0, 3)  # First 3 subnets
  private_subnets  = slice(var.subnet_ids, 3, 6)  # Middle 3 subnets
  database_subnets = slice(var.subnet_ids, 6, 9)  # Last 3 subnets
}

# Use each slice for the appropriate resource
resource "aws_lb" "main" {
  name               = "app-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = local.public_subnets
}

resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn

  network_configuration {
    subnets = local.private_subnets
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "db-subnet-group"
  subnet_ids = local.database_subnets
}
```

## Batch Processing with slice

Another practical use case is splitting a list of items into batches for deployment:

```hcl
variable "server_names" {
  type = list(string)
  default = [
    "web-01", "web-02", "web-03", "web-04",
    "web-05", "web-06", "web-07", "web-08"
  ]
}

locals {
  batch_size = 3

  # First batch of servers to deploy
  batch_1 = slice(
    var.server_names,
    0,
    min(local.batch_size, length(var.server_names))
  )

  # Second batch
  batch_2 = slice(
    var.server_names,
    local.batch_size,
    min(local.batch_size * 2, length(var.server_names))
  )

  # Third batch (remaining servers)
  batch_3 = slice(
    var.server_names,
    local.batch_size * 2,
    length(var.server_names)
  )
}

# Output to verify the batches
output "batch_1" {
  value = local.batch_1
  # ["web-01", "web-02", "web-03"]
}

output "batch_2" {
  value = local.batch_2
  # ["web-04", "web-05", "web-06"]
}

output "batch_3" {
  value = local.batch_3
  # ["web-07", "web-08"]
}
```

## Using slice with length for Dynamic Slicing

In real configurations, you often do not know the exact length of a list ahead of time. Combining `slice` with `length` gives you dynamic slicing:

```hcl
variable "availability_zones" {
  type = list(string)
}

locals {
  # Use at most 3 AZs, even if more are available
  max_azs = 3
  selected_azs = slice(
    var.availability_zones,
    0,
    min(local.max_azs, length(var.availability_zones))
  )
}
```

The `min` function prevents an out-of-bounds error when the list has fewer elements than the requested slice.

## Splitting a List in Half

Sometimes you want to divide resources evenly between two groups:

```hcl
variable "instances" {
  type    = list(string)
  default = ["i-001", "i-002", "i-003", "i-004", "i-005", "i-006"]
}

locals {
  # Calculate the midpoint
  midpoint = floor(length(var.instances) / 2)

  # Split into two groups
  group_a = slice(var.instances, 0, local.midpoint)
  group_b = slice(var.instances, local.midpoint, length(var.instances))
}

# Group A gets one target group, Group B gets another
resource "aws_lb_target_group_attachment" "group_a" {
  for_each = toset(local.group_a)

  target_group_arn = aws_lb_target_group.blue.arn
  target_id        = each.value
}

resource "aws_lb_target_group_attachment" "group_b" {
  for_each = toset(local.group_b)

  target_group_arn = aws_lb_target_group.green.arn
  target_id        = each.value
}
```

## Common Pitfalls

### Out of Bounds Errors

The most common mistake with `slice` is providing indices that exceed the list length:

```hcl
# This will error because the list only has 3 elements
# slice(["a", "b", "c"], 0, 5)  # Error!

# Always guard with min()
> slice(["a", "b", "c"], 0, min(5, length(["a", "b", "c"])))
[
  "a",
  "b",
  "c",
]
```

### Start Index Greater Than End Index

```hcl
# This will also cause an error
# slice(["a", "b", "c"], 3, 1)  # Error!
```

### Empty Result is Valid

```hcl
# Slicing with equal start and end returns empty list
> slice(["a", "b", "c"], 2, 2)
[]
```

## slice vs chunklist

If you need to split a list into equal-sized chunks, `chunklist` might be a better fit:

```hcl
# chunklist splits into groups of N
> chunklist(["a", "b", "c", "d", "e"], 2)
[
  ["a", "b"],
  ["c", "d"],
  ["e"],
]

# slice extracts a specific range
> slice(["a", "b", "c", "d", "e"], 0, 2)
["a", "b"]
```

Use `slice` when you know the exact start and end positions. Use `chunklist` when you want to divide a list into groups of a fixed size.

## Real-World Example: Selecting Subnets for a Multi-AZ Deployment

```hcl
# Suppose you get a dynamic list of subnets from a data source
data "aws_subnets" "all" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

locals {
  # Only deploy to the first 3 subnets for cost control
  deployment_subnets = slice(
    sort(data.aws_subnets.all.ids),
    0,
    min(3, length(data.aws_subnets.all.ids))
  )
}

resource "aws_instance" "app" {
  count         = length(local.deployment_subnets)
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = local.deployment_subnets[count.index]

  tags = {
    Name = "app-${count.index + 1}"
  }
}
```

## Summary

The `slice` function is essential when you need to extract specific portions of a list in Terraform. It is particularly handy for distributing resources across subnets, batching deployments, and limiting the number of resources created from a dynamic list. Just remember that the start index is inclusive, the end index is exclusive, and always guard against out-of-bounds errors with `min` and `length`. For related list manipulation, take a look at the [sort function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sort-function-in-terraform/view) and [flatten function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-flatten-for-nested-data-structures-in-terraform/view).
