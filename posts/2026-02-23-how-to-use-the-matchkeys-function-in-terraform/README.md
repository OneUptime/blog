# How to Use the matchkeys Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the matchkeys function in Terraform to filter one list based on matching values in another list, with practical examples for resource selection.

---

Filtering resources based on criteria from related lists is a common need in Terraform. The `matchkeys` function does exactly this - it filters a list of values based on whether corresponding elements in a keys list match any value in a search set. This is particularly useful for selecting resources by attributes, filtering subnets by availability zone, and building conditional configurations from parallel data.

This post covers the `matchkeys` function's mechanics, its syntax, and practical applications.

## What is the matchkeys Function?

The `matchkeys` function takes three arguments: a values list, a keys list, and a search set. It returns elements from the values list where the corresponding element in the keys list appears in the search set.

```hcl
# matchkeys(values, keys, searchset)
matchkeys(values, keys, searchset)
```

The values and keys lists must have the same length. The function checks each element in keys against the search set, and if it matches, the corresponding element from values is included in the result.

## Basic Usage in Terraform Console

```hcl
# Filter values where the corresponding key is in the search set
> matchkeys(["a", "b", "c"], ["x", "y", "z"], ["x", "z"])
["a", "c"]

# The values at positions 0 and 2 are returned because
# keys[0]="x" and keys[2]="z" are in the search set ["x", "z"]

# No matches returns empty list
> matchkeys(["a", "b", "c"], ["x", "y", "z"], ["q"])
[]

# All match returns full list
> matchkeys(["a", "b", "c"], ["x", "y", "z"], ["x", "y", "z"])
["a", "b", "c"]

# Works with numbers
> matchkeys([10, 20, 30], [1, 2, 3], [1, 3])
[10, 30]
```

## Filtering Subnets by Availability Zone

The classic use case for `matchkeys` is selecting subnets that belong to specific availability zones.

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-aaa", "subnet-bbb", "subnet-ccc", "subnet-ddd"]
}

variable "subnet_azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1a"]
}

variable "target_azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

locals {
  # Get subnet IDs that are in the target availability zones
  filtered_subnets = matchkeys(
    var.subnet_ids,    # values to filter
    var.subnet_azs,    # keys to match against
    var.target_azs     # search set
  )
  # Result: ["subnet-aaa", "subnet-bbb", "subnet-ddd"]
  # subnet-aaa and subnet-ddd are in us-east-1a, subnet-bbb is in us-east-1b
}

resource "aws_lb" "app" {
  name               = "app-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = local.filtered_subnets
}
```

## Selecting Instances by Type

You can use `matchkeys` to pick instances of specific types from a mixed fleet.

```hcl
locals {
  instance_ids   = ["i-001", "i-002", "i-003", "i-004", "i-005"]
  instance_types = ["t3.micro", "m5.large", "t3.micro", "m5.large", "t3.small"]

  # Select only the m5.large instances
  large_instances = matchkeys(
    local.instance_ids,
    local.instance_types,
    ["m5.large"]
  )
  # Result: ["i-002", "i-004"]

  # Select t3 family instances
  t3_instances = matchkeys(
    local.instance_ids,
    local.instance_types,
    ["t3.micro", "t3.small"]
  )
  # Result: ["i-001", "i-003", "i-005"]
}
```

## Using matchkeys with Data Sources

A practical pattern is filtering data source results using `matchkeys`.

```hcl
data "aws_subnets" "all" {
  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]
  }
}

data "aws_subnet" "details" {
  for_each = toset(data.aws_subnets.all.ids)
  id       = each.key
}

locals {
  subnet_ids = [for s in data.aws_subnet.details : s.id]
  subnet_azs = [for s in data.aws_subnet.details : s.availability_zone]

  # Select subnets only in specific AZs
  target_azs       = ["us-east-1a", "us-east-1c"]
  selected_subnets = matchkeys(local.subnet_ids, local.subnet_azs, local.target_azs)
}

resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3

  network_configuration {
    subnets = local.selected_subnets
  }
}
```

## Filtering by Tags or Labels

You can filter resources based on tag values using `matchkeys`.

```hcl
locals {
  server_names = ["web-1", "web-2", "api-1", "worker-1", "worker-2"]
  server_roles = ["frontend", "frontend", "backend", "backend", "backend"]

  # Select only frontend servers
  frontend_servers = matchkeys(
    local.server_names,
    local.server_roles,
    ["frontend"]
  )
  # Result: ["web-1", "web-2"]

  # Select backend servers
  backend_servers = matchkeys(
    local.server_names,
    local.server_roles,
    ["backend"]
  )
  # Result: ["api-1", "worker-1", "worker-2"]
}
```

## Combining matchkeys with Other Functions

The `matchkeys` function works well in combination with other list and map functions.

```hcl
locals {
  all_cidrs    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24", "10.0.4.0/24"]
  cidr_types   = ["public", "private", "public", "private"]
  cidr_regions = ["east", "east", "west", "west"]

  # Get public CIDRs
  public_cidrs = matchkeys(local.all_cidrs, local.cidr_types, ["public"])
  # Result: ["10.0.1.0/24", "10.0.3.0/24"]

  # Get east CIDRs
  east_cidrs = matchkeys(local.all_cidrs, local.cidr_regions, ["east"])
  # Result: ["10.0.1.0/24", "10.0.2.0/24"]

  # For intersection (public AND east), use matchkeys twice
  # First get public CIDRs, then filter those by region
  public_cidr_regions = matchkeys(local.cidr_regions, local.cidr_types, ["public"])
  # We need a different approach for AND logic - see below
}
```

For AND logic (matching multiple criteria), you typically use a `for` expression with multiple conditions rather than chaining `matchkeys` calls.

```hcl
locals {
  # AND logic: public AND east
  public_east_cidrs = [
    for i, cidr in local.all_cidrs :
    cidr
    if local.cidr_types[i] == "public" && local.cidr_regions[i] == "east"
  ]
  # Result: ["10.0.1.0/24"]
}
```

## matchkeys with Dynamic Resource Filtering

Here is a scenario where you need to selectively attach resources based on their properties.

```hcl
variable "ebs_volumes" {
  type = list(object({
    device  = string
    size_gb = number
    type    = string
  }))
  default = [
    { device = "/dev/sdb", size_gb = 100, type = "gp3" },
    { device = "/dev/sdc", size_gb = 500, type = "io2" },
    { device = "/dev/sdd", size_gb = 200, type = "gp3" },
    { device = "/dev/sde", size_gb = 1000, type = "st1" },
  ]
}

locals {
  volume_devices = [for v in var.ebs_volumes : v.device]
  volume_types   = [for v in var.ebs_volumes : v.type]

  # Get devices for high-performance volumes only
  high_perf_devices = matchkeys(
    local.volume_devices,
    local.volume_types,
    ["gp3", "io2"]
  )
  # Result: ["/dev/sdb", "/dev/sdc", "/dev/sdd"]
}
```

## Real-World Scenario: Multi-Tier Network

Here is a complete example using `matchkeys` to build a multi-tier network where different subnet types get different route tables.

```hcl
locals {
  subnet_names = ["web-a", "web-b", "app-a", "app-b", "db-a", "db-b"]
  subnet_ids   = [for name in local.subnet_names : aws_subnet.all[name].id]
  subnet_tiers = ["public", "public", "private", "private", "private", "private"]

  # Public subnets get the internet-facing route table
  public_subnet_ids = matchkeys(
    local.subnet_ids,
    local.subnet_tiers,
    ["public"]
  )

  # Private subnets get the NAT gateway route table
  private_subnet_ids = matchkeys(
    local.subnet_ids,
    local.subnet_tiers,
    ["private"]
  )
}

resource "aws_route_table_association" "public" {
  count = length(local.public_subnet_ids)

  subnet_id      = local.public_subnet_ids[count.index]
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = length(local.private_subnet_ids)

  subnet_id      = local.private_subnet_ids[count.index]
  route_table_id = aws_route_table.private.id
}
```

## Edge Cases and Considerations

- **Lists must have equal length**: The values and keys lists must be the same length, or Terraform raises an error.
- **Search set can be any size**: The search set can have any number of elements, including zero (which returns an empty result).
- **Order is preserved**: The result maintains the relative order of the original values list.
- **Duplicates in search set**: Duplicate values in the search set are fine and have no effect.

```hcl
# Empty search set returns empty list
> matchkeys(["a", "b", "c"], ["x", "y", "z"], [])
[]

# Duplicates in search set are harmless
> matchkeys(["a", "b", "c"], ["x", "y", "z"], ["x", "x", "x"])
["a"]
```

## Summary

The `matchkeys` function provides a clean way to filter one list based on matching criteria in a parallel list. It is especially useful when working with data sources that return parallel lists of IDs and attributes.

Key takeaways:

- `matchkeys(values, keys, searchset)` returns values where corresponding keys match the search set
- Values and keys lists must have the same length
- Order of results matches the original values list
- Perfect for filtering subnets by AZ, instances by type, or resources by tag
- For AND logic across multiple criteria, use `for` expressions instead
- Search set can be any size, including empty

Use `matchkeys` whenever you have parallel lists and need to filter one based on values in the other.
