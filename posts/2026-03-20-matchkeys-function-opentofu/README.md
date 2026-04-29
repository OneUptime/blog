# How to Use the matchkeys Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Matchkeys, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the matchkeys function in OpenTofu to filter one list based on matching values in another list, like a SQL WHERE IN clause.

---

`matchkeys()` takes three arguments: a list of values to return, a list of keys to search, and a list of keys to match against. The first two lists must be the same length. It returns the values from the first list where the corresponding key appears in the third list - similar to a SQL `WHERE key IN (...)` operation.

---

## Syntax

```hcl
matchkeys(values_list, keys_list, search_set)
```

Returns elements from `values_list` where the corresponding element in `keys_list` is also in `search_set`.

`values_list` and `keys_list` must be the same length.

---

## Basic Example

```hcl
locals {
  names  = ["alice", "bob", "charlie", "diana"]
  roles  = ["admin", "user", "admin", "user"]

  # Get names of all admins
  admins = matchkeys(local.names, local.roles, ["admin"])
  # ["alice", "charlie"]
}
```

---

## Filtering Instance IDs by Availability Zone

```hcl
resource "aws_instance" "web" {
  count             = 4
  ami               = data.aws_ami.amazon_linux.id
  instance_type     = "t3.micro"
  availability_zone = element(["us-east-1a", "us-east-1b"], count.index % 2)
}

locals {
  instance_ids  = aws_instance.web[*].id
  instance_azs  = aws_instance.web[*].availability_zone

  # Get IDs of instances in us-east-1a only
  us_east_1a_ids = matchkeys(
    local.instance_ids,
    local.instance_azs,
    ["us-east-1a"]
  )
}
```

---

## Filtering Subnets by Type Tag

```hcl
data "aws_subnets" "all" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

data "aws_subnet" "details" {
  for_each = toset(data.aws_subnets.all.ids)
  id       = each.value
}

locals {
  subnet_ids  = [for s in data.aws_subnet.details : s.id]
  subnet_types = [for s in data.aws_subnet.details : lookup(s.tags, "Type", "unknown")]

  # Get only private subnet IDs
  private_subnet_ids = matchkeys(
    local.subnet_ids,
    local.subnet_types,
    ["private"]
  )
}
```

---

## Getting Values Matching Multiple Keys

```hcl
variable "server_types" {
  type    = list(string)
  default = ["web", "api", "worker", "web", "api"]
}

variable "server_ids" {
  type    = list(string)
  default = ["srv-1", "srv-2", "srv-3", "srv-4", "srv-5"]
}

locals {
  # Get IDs of all web and api servers
  frontend_server_ids = matchkeys(
    var.server_ids,
    var.server_types,
    ["web", "api"]
  )
  # ["srv-1", "srv-2", "srv-4", "srv-5"]
}
```

---

## matchkeys vs for Expression Filter

```hcl
locals {
  # These produce equivalent results:

  # Using matchkeys
  result1 = matchkeys(values_list, keys_list, filter_set)

  # Using a for expression
  result2 = [
    for i, key in keys_list :
    values_list[i]
    if contains(filter_set, key)
  ]
}
```

`matchkeys()` is more concise when you have parallel lists. A for expression is more flexible when working with objects or needing transformation.

---

## Summary

`matchkeys(values, keys, search)` filters `values` by returning only those whose corresponding `keys` element is found in the `search` list. It's a compact way to do "look up values where key is in set" operations on parallel lists. Common uses include filtering instance IDs by availability zone, selecting subnet IDs by type tag, or filtering resource names by category. Use a for expression when you need more flexibility or are working with a single list of objects.
