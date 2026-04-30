# How to Use the flatten Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Flatten, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the flatten function in OpenTofu to convert nested lists of lists into a single flat list.

---

`flatten()` takes a list that may contain nested lists and returns a single flat list containing all the elements. This is especially useful for creating a flat list of objects from nested data structures before using them with `for_each`.

---

## Syntax

```hcl
flatten(list)
```

---

## Basic Examples

```hcl
locals {
  nested   = [["a", "b"], ["c", "d"], ["e"]]
  flat     = flatten(local.nested)
  # ["a", "b", "c", "d", "e"]

  # Mixed nesting depths
  deep     = [["a", ["b", "c"]], ["d"]]
  flat_deep = flatten(local.deep)
  # ["a", "b", "c", "d"]
}
```

---

## Flattening Security Group Rules from Multiple Sources

```hcl
variable "services" {
  type = list(object({
    name  = string
    ports = list(number)
  }))
  default = [
    { name = "web",  ports = [80, 443] },
    { name = "api",  ports = [8080, 8443] },
    { name = "admin", ports = [9090] },
  ]
}

locals {
  # Create a flat list of {service, port} objects
  all_port_rules = flatten([
    for service in var.services : [
      for port in service.ports : {
        service = service.name
        port    = port
      }
    ]
  ])
  # [
  #   { service = "web",   port = 80   },
  #   { service = "web",   port = 443  },
  #   { service = "api",   port = 8080 },
  #   { service = "api",   port = 8443 },
  #   { service = "admin", port = 9090 },
  # ]
}

resource "aws_vpc_security_group_ingress_rule" "ports" {
  for_each = { for rule in local.all_port_rules : "${rule.service}-${rule.port}" => rule }

  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = each.value.port
  to_port           = each.value.port
  ip_protocol       = "tcp"
  description       = "Allow ${each.value.service} on port ${each.value.port}"
}
```

---

## Subnet Rules Across VPCs

```hcl
variable "vpcs" {
  type = list(object({
    name    = string
    subnets = list(string)
  }))
}

locals {
  # Flatten to get all subnets from all VPCs as a flat list
  all_subnet_cidrs = flatten([
    for vpc in var.vpcs : vpc.subnets
  ])
}
```

---

## Combining Module Outputs

```hcl
module "web" {
  source     = "./modules/app"
  count      = 2
  # ...
}

locals {
  # module.web is a list (count=2), each has a list of instance_ids
  # Flatten to get a single list of all instance IDs
  all_instance_ids = flatten([
    for m in module.web : m.instance_ids
  ])
}
```

---

## flatten in for_each Pattern

The most powerful pattern: flatten nested data, then use `for_each`:

```hcl
variable "environments" {
  type = map(object({
    buckets = list(string)
  }))
  default = {
    prod    = { buckets = ["data", "logs", "backups"] }
    staging = { buckets = ["data", "logs"] }
  }
}

locals {
  all_buckets = flatten([
    for env, config in var.environments : [
      for bucket in config.buckets : {
        env  = env
        name = "${env}-${bucket}"
      }
    ]
  ])
}

resource "aws_s3_bucket" "buckets" {
  for_each = { for b in local.all_buckets : b.name => b }

  bucket = each.value.name
  tags = {
    Environment = each.value.env
  }
}
```

---

## Summary

`flatten(list)` recursively flattens nested lists into a single list. Its primary use is preparing nested data structures for use with `for_each`. The typical pattern is: use a nested for expression to create lists of objects from nested variables, then flatten the result to get a flat list of objects, then convert to a map with `for_each`. This lets you create resources for every combination of items in nested variable structures.
