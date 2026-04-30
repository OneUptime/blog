# How to Handle Complex Variable Types in OpenTofu - Handle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, HCL, Type Constraints, Infrastructure as Code, DevOps

Description: Learn how to handle complex variable types in OpenTofu, including objects, lists of objects, maps of objects, optional attributes, and nested type constraints.

---

OpenTofu supports rich type constraints that let you define variables with structured, nested shapes. Complex types - objects, tuples, lists of objects, and maps of objects - make your configurations self-documenting and help catch mismatches early before deployment.

---

## Object Variables

An `object` type variable describes a value with named attributes, each with its own type:

```hcl
variable "database_config" {
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    port           = number
    multi_az       = bool
  })
}
```

Access individual fields with dot notation:

```hcl
resource "aws_db_instance" "main" {
  engine         = var.database_config.engine
  engine_version = var.database_config.engine_version
  instance_class = var.database_config.instance_class
  port           = var.database_config.port
  multi_az       = var.database_config.multi_az
}
```

---

## Optional Object Attributes

Use `optional()` to mark fields as optional and give them defaults when needed:

```hcl
variable "service_config" {
  type = object({
    name        = string
    port        = number
    replicas    = optional(number, 1)
    enable_tls  = optional(bool, false)
    environment = optional(string, "production")
  })
}
```

When a caller omits `replicas`, OpenTofu fills in `1` automatically.

---

## List of Objects

Define a list where each item has a consistent shape:

```hcl
variable "ingress_rules" {
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = []
}

resource "aws_security_group_rule" "ingress" {
  count = length(var.ingress_rules)

  type        = "ingress"
  from_port   = var.ingress_rules[count.index].from_port
  to_port     = var.ingress_rules[count.index].to_port
  protocol    = var.ingress_rules[count.index].protocol
  cidr_blocks = var.ingress_rules[count.index].cidr_blocks

  security_group_id = aws_security_group.main.id
}
```

---

## Map of Objects

A map of objects is useful when each entry needs a unique key:

```hcl
variable "dns_records" {
  type = map(object({
    type  = string
    value = string
    ttl   = optional(number, 300)
  }))
  default = {}
}

resource "aws_route53_record" "records" {
  for_each = var.dns_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key
  type    = each.value.type
  ttl     = each.value.ttl
  records = [each.value.value]
}
```

---

## Nested Objects

Objects can contain other objects:

```hcl
variable "cluster_config" {
  type = object({
    name = string
    node_pool = object({
      min_count    = number
      max_count    = number
      machine_type = string
      disk_size_gb = optional(number, 100)
    })
    networking = object({
      vpc_id     = string
      subnet_ids = list(string)
    })
  })
}
```

Access nested fields by chaining dot notation:

```hcl
locals {
  node_min = var.cluster_config.node_pool.min_count
  vpc_id   = var.cluster_config.networking.vpc_id
}
```

---

## Tuple Variables

A `tuple` is a fixed-length positional sequence where each element can have its own type:

```hcl
variable "port_pair" {
  type = tuple([number, number])
  # [from_port, to_port]
  default = [80, 8080]
}

locals {
  from_port = var.port_pair[0]
  to_port   = var.port_pair[1]
}
```

Tuples are less common than objects. Use objects when fields have names; use tuples when you need a fixed-length positional sequence.

---

## Setting Complex Variables in .tfvars

Pass complex values using HCL syntax in a `.tfvars` file:

```hcl
# terraform.tfvars

database_config = {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  port           = 5432
  multi_az       = true
}

ingress_rules = [
  {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  },
  {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
]
```

---

## Summary

Complex variable types in OpenTofu use `object()`, `list(object())`, `map(object())`, and `tuple()` to enforce structured shapes. Use `optional()` to add optional fields, with default values when needed, without breaking callers. Access fields with dot notation for objects and index notation for lists and tuples. Pass complex values through `.tfvars` files using HCL syntax. Structured types make your module APIs explicit and validated before deployment.
