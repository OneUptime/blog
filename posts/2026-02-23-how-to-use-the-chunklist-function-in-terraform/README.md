# How to Use the chunklist Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the chunklist function in Terraform to split a list into fixed-size sublists, with practical examples for batch processing and resource distribution.

---

When managing infrastructure with Terraform, you sometimes need to split a large list into smaller groups of a fixed size. The `chunklist` function is designed for exactly this purpose. It takes a flat list and divides it into a list of sublists, each containing up to a specified number of elements.

This post walks through the syntax of `chunklist`, demonstrates its behavior with various inputs, and shows practical use cases where splitting lists comes in handy.

## What is the chunklist Function?

The `chunklist` function splits a single list into multiple smaller lists (chunks) of a given size. The last chunk may contain fewer elements if the original list does not divide evenly.

```hcl
# Syntax: chunklist(list, chunk_size)
chunklist(list, size)
```

The first argument is the list to split, and the second argument is the maximum number of elements per chunk.

## Basic Usage in Terraform Console

Let us explore the function with some simple examples.

```hcl
# Split a list of 6 elements into chunks of 2
> chunklist(["a", "b", "c", "d", "e", "f"], 2)
[
  ["a", "b"],
  ["c", "d"],
  ["e", "f"],
]

# When the list doesn't divide evenly, the last chunk is smaller
> chunklist(["a", "b", "c", "d", "e"], 2)
[
  ["a", "b"],
  ["c", "d"],
  ["e"],
]

# Chunk size of 1 gives each element its own list
> chunklist(["a", "b", "c"], 1)
[
  ["a"],
  ["b"],
  ["c"],
]

# Chunk size larger than the list returns one chunk
> chunklist(["a", "b"], 5)
[
  ["a", "b"],
]

# Empty list returns an empty list of lists
> chunklist([], 3)
[]
```

## Distributing Subnets Across Availability Zones

A classic use case for `chunklist` is distributing resources across availability zones or groups. Suppose you have a flat list of CIDR blocks that need to be split evenly across three availability zones.

```hcl
variable "subnet_cidrs" {
  type    = list(string)
  default = [
    "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24",
    "10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24",
    "10.0.7.0/24", "10.0.8.0/24", "10.0.9.0/24",
  ]
}

locals {
  # Split 9 subnets into 3 groups of 3, one per AZ
  az_count       = 3
  subnets_per_az = ceil(length(var.subnet_cidrs) / local.az_count)
  subnet_groups  = chunklist(var.subnet_cidrs, local.subnets_per_az)
}

output "subnet_distribution" {
  value = {
    az_a = local.subnet_groups[0]
    az_b = local.subnet_groups[1]
    az_c = local.subnet_groups[2]
  }
}
```

This gives you a clean mapping of subnets to availability zones without manual slicing.

## Batch Processing with chunklist

When you need to create resources in batches - perhaps because of API rate limits or organizational requirements - `chunklist` makes this straightforward.

```hcl
variable "dns_records" {
  type = list(object({
    name  = string
    type  = string
    value = string
  }))
  description = "DNS records to create"
}

locals {
  # Process DNS records in batches of 10 to avoid API throttling
  dns_batches = chunklist(var.dns_records, 10)
}

# Create a null resource for each batch to introduce delays
resource "null_resource" "dns_batch" {
  count = length(local.dns_batches)

  triggers = {
    batch_index = count.index
    batch_size  = length(local.dns_batches[count.index])
  }

  provisioner "local-exec" {
    # Add a delay between batches
    command = "sleep ${count.index * 5}"
  }
}
```

## Splitting Security Group Rules

AWS security groups have limits on the number of rules per group. You can use `chunklist` to distribute rules across multiple security groups if your list exceeds the limit.

```hcl
variable "allowed_cidrs" {
  type        = list(string)
  description = "CIDR blocks to allow inbound access"
  default     = [
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
    "100.64.0.0/10", "198.18.0.0/15", "203.0.113.0/24",
  ]
}

locals {
  # AWS allows up to 60 rules per security group
  # Split CIDRs into groups of 50 to stay under the limit
  cidr_groups = chunklist(var.allowed_cidrs, 50)
}

resource "aws_security_group" "allow_inbound" {
  count = length(local.cidr_groups)

  name        = "allow-inbound-${count.index}"
  description = "Allow inbound traffic - group ${count.index + 1}"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.cidr_groups[count.index]
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }
}
```

## Creating Resource Groups

Sometimes you want to organize resources into logical groups for management purposes. `chunklist` can help distribute instances across groups.

```hcl
variable "instance_names" {
  type    = list(string)
  default = [
    "web-1", "web-2", "web-3", "web-4",
    "web-5", "web-6", "web-7", "web-8",
  ]
}

locals {
  # Split instances into groups of 3 for rolling deployments
  deployment_groups = chunklist(var.instance_names, 3)
}

output "rolling_deployment_plan" {
  value = {
    for idx, group in local.deployment_groups :
    "wave_${idx + 1}" => group
  }
}

# Output:
# {
#   "wave_1" = ["web-1", "web-2", "web-3"]
#   "wave_2" = ["web-4", "web-5", "web-6"]
#   "wave_3" = ["web-7", "web-8"]
# }
```

## Working with Nested chunklist Results

Since `chunklist` returns a list of lists, you often need to iterate through the nested structure. Here is how you can flatten or process the chunks.

```hcl
locals {
  items  = ["a", "b", "c", "d", "e", "f", "g"]
  chunks = chunklist(local.items, 3)

  # Access a specific chunk
  first_chunk = local.chunks[0]   # ["a", "b", "c"]
  last_chunk  = local.chunks[length(local.chunks) - 1]  # ["g"]

  # Create a map from chunk index to chunk contents
  chunk_map = {
    for idx, chunk in local.chunks :
    "group_${idx}" => chunk
  }
}
```

## Combining chunklist with Other Functions

The `chunklist` function works well alongside other collection functions like `flatten`, `concat`, and `length`.

```hcl
locals {
  # Original flat list
  all_servers = ["srv-1", "srv-2", "srv-3", "srv-4", "srv-5", "srv-6"]

  # Chunk into groups
  server_groups = chunklist(local.all_servers, 2)

  # Get the number of groups
  num_groups = length(local.server_groups)

  # Flatten back to original list (useful for verification)
  flattened = flatten(local.server_groups)

  # Combine two chunked lists
  extra_servers = chunklist(["srv-7", "srv-8", "srv-9", "srv-10"], 2)
  all_groups    = concat(local.server_groups, local.extra_servers)
}
```

## Edge Cases to Watch For

There are a few behaviors to be aware of:

- **Chunk size must be positive**: Passing `0` or a negative number as the chunk size will cause an error.
- **Empty lists**: `chunklist([], n)` returns an empty list, which is safe to iterate over.
- **Single-element chunks**: Using a chunk size of `1` effectively wraps each element in its own list.
- **Large chunk sizes**: If the chunk size exceeds the list length, you get a single chunk containing all elements.

```hcl
# These are all valid
> chunklist(["a"], 1)
[["a"]]

> chunklist(["a", "b"], 100)
[["a", "b"]]

> chunklist([], 5)
[]
```

## Real-World Scenario: Route Table Entries

Cloud providers often have limits on the number of routes per route table. You can use `chunklist` to split routes across multiple tables.

```hcl
variable "vpn_routes" {
  type        = list(string)
  description = "CIDR blocks to route through VPN"
  default     = [
    "10.1.0.0/16", "10.2.0.0/16", "10.3.0.0/16",
    "10.4.0.0/16", "10.5.0.0/16", "10.6.0.0/16",
    "172.16.0.0/16", "172.17.0.0/16", "172.18.0.0/16",
    "172.19.0.0/16", "172.20.0.0/16", "172.21.0.0/16",
  ]
}

locals {
  # Split routes into groups of 5 per route table
  route_groups = chunklist(var.vpn_routes, 5)
}

resource "aws_route_table" "vpn" {
  count  = length(local.route_groups)
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "vpn-routes-${count.index + 1}"
  }
}

resource "aws_route" "vpn" {
  for_each = {
    for pair in flatten([
      for table_idx, routes in local.route_groups : [
        for route in routes : {
          key            = "${table_idx}-${route}"
          route_table_id = aws_route_table.vpn[table_idx].id
          cidr_block     = route
        }
      ]
    ]) : pair.key => pair
  }

  route_table_id         = each.value.route_table_id
  destination_cidr_block = each.value.cidr_block
  gateway_id             = aws_vpn_gateway.main.id
}
```

## Summary

The `chunklist` function is a practical utility for dividing flat lists into manageable sublists of a fixed size. It is particularly valuable when dealing with API rate limits, resource group limits, batch deployments, and resource distribution across zones.

Key takeaways:

- `chunklist(list, size)` splits a list into sublists of the specified maximum size
- The last chunk may be smaller than the specified size
- Empty lists produce an empty result
- Chunk size must be a positive integer
- Works well with `for` expressions, `flatten`, and `length` for post-processing

Whenever you find yourself manually splitting lists or using complex index arithmetic, reach for `chunklist` instead.
