# How to Fix Terraform Count and for_each Conflict Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, HCL

Description: Resolve Terraform count and for_each conflict errors, understand when to use each, and learn how to migrate between them without destroying resources.

---

Terraform provides two meta-arguments for creating multiple instances of a resource: `count` and `for_each`. You cannot use both on the same resource, and choosing the wrong one or trying to switch between them creates headaches. This guide covers the conflict error itself and the broader set of issues that arise when working with these two features.

## The Error

If you try to use both `count` and `for_each` on the same resource:

```hcl
resource "aws_instance" "web" {
  count    = 3
  for_each = toset(["a", "b", "c"])

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

Terraform responds with:

```text
Error: Invalid combination of "count" and "for_each"

  on main.tf line 1, in resource "aws_instance" "web":
   1: resource "aws_instance" "web" {

The "count" and "for_each" meta-arguments are mutually exclusive.
```

The same applies to modules and data sources. You must pick one or the other.

## When to Use count

Use `count` when:
- You need a simple numeric quantity of identical resources
- The resources are truly interchangeable (any instance is as good as another)
- You do not need stable identity for each instance

```hcl
variable "instance_count" {
  type    = number
  default = 3
}

resource "aws_instance" "web" {
  count = var.instance_count

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-${count.index}"
  }
}
```

Resources are addressed by numeric index: `aws_instance.web[0]`, `aws_instance.web[1]`, etc.

## When to Use for_each

Use `for_each` when:
- Each instance is meaningfully different
- Instances have a natural key (like a name, region, or environment)
- You need to add or remove specific instances without affecting others

```hcl
variable "environments" {
  type = map(object({
    instance_type = string
    ami           = string
  }))
  default = {
    dev = {
      instance_type = "t3.micro"
      ami           = "ami-0c55b159cbfafe1f0"
    }
    staging = {
      instance_type = "t3.small"
      ami           = "ami-0c55b159cbfafe1f0"
    }
    prod = {
      instance_type = "t3.large"
      ami           = "ami-0c55b159cbfafe1f0"
    }
  }
}

resource "aws_instance" "env" {
  for_each = var.environments

  ami           = each.value.ami
  instance_type = each.value.instance_type

  tags = {
    Name        = "web-${each.key}"
    Environment = each.key
  }
}
```

Resources are addressed by key: `aws_instance.env["dev"]`, `aws_instance.env["staging"]`, etc.

## The Conditional Resource Problem

A common source of the conflict error is trying to make a resource conditional while also iterating:

```hcl
# This does NOT work - you cannot combine count and for_each
resource "aws_security_group_rule" "ingress" {
  count    = var.enable_ingress ? 1 : 0
  for_each = var.ingress_rules

  # ...
}
```

**Fix:** Use `for_each` with a conditional expression:

```hcl
resource "aws_security_group_rule" "ingress" {
  for_each = var.enable_ingress ? var.ingress_rules : {}

  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  cidr_blocks       = each.value.cidrs
  security_group_id = aws_security_group.main.id
}
```

Or with a list:

```hcl
resource "aws_security_group_rule" "ingress" {
  for_each = var.enable_ingress ? toset(var.ingress_ports) : toset([])

  type              = "ingress"
  from_port         = each.value
  to_port           = each.value
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.main.id
}
```

## Migrating from count to for_each

This is where things get painful. Changing from `count` to `for_each` changes the resource addresses, which means Terraform wants to destroy and recreate everything.

Before migration (using count):

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  tags = {
    Name = "web-${count.index}"
  }
}
# Addresses: aws_instance.web[0], aws_instance.web[1], aws_instance.web[2]
```

After migration (using for_each):

```hcl
resource "aws_instance" "web" {
  for_each      = toset(["web-0", "web-1", "web-2"])
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  tags = {
    Name = each.key
  }
}
# Addresses: aws_instance.web["web-0"], aws_instance.web["web-1"], aws_instance.web["web-2"]
```

Without state manipulation, Terraform will destroy three instances and create three new ones. To avoid this, use `moved` blocks:

```hcl
moved {
  from = aws_instance.web[0]
  to   = aws_instance.web["web-0"]
}

moved {
  from = aws_instance.web[1]
  to   = aws_instance.web["web-1"]
}

moved {
  from = aws_instance.web[2]
  to   = aws_instance.web["web-2"]
}
```

Or use `terraform state mv` commands:

```bash
terraform state mv 'aws_instance.web[0]' 'aws_instance.web["web-0"]'
terraform state mv 'aws_instance.web[1]' 'aws_instance.web["web-1"]'
terraform state mv 'aws_instance.web[2]' 'aws_instance.web["web-2"]'
```

## The count Index Shift Problem

One of the biggest reasons to prefer `for_each` over `count` is the index shift problem. With `count`, removing an item from the middle reindexes everything after it:

```hcl
# Original - 3 instances
variable "names" {
  default = ["web", "api", "worker"]
}

resource "aws_instance" "app" {
  count = length(var.names)
  tags = {
    Name = var.names[count.index]
  }
}
# web=>[0], api=>[1], worker=>[2]

# After removing "api"
variable "names" {
  default = ["web", "worker"]
}
# Now: web=>[0], worker=>[1]
# Terraform wants to: modify [1] from api to worker, destroy [2]
# This is wrong - it should destroy the api instance, not the worker one
```

With `for_each`, each instance has a stable key:

```hcl
resource "aws_instance" "app" {
  for_each = toset(["web", "api", "worker"])
  tags = {
    Name = each.key
  }
}
# Removing "api" only destroys aws_instance.app["api"]
```

## for_each Type Requirements

`for_each` accepts maps and sets of strings. It does not accept lists directly:

```hcl
# Wrong - list is not allowed
resource "aws_instance" "web" {
  for_each = ["a", "b", "c"]
}

# Right - convert to a set
resource "aws_instance" "web" {
  for_each = toset(["a", "b", "c"])
}

# Right - use a map
resource "aws_instance" "web" {
  for_each = {
    web    = "t3.micro"
    api    = "t3.small"
    worker = "t3.medium"
  }
  instance_type = each.value
}
```

If your data is a list of objects, convert it to a map:

```hcl
variable "servers" {
  type = list(object({
    name          = string
    instance_type = string
  }))
}

resource "aws_instance" "servers" {
  for_each = { for s in var.servers : s.name => s }

  instance_type = each.value.instance_type
  tags = {
    Name = each.key
  }
}
```

## Nested count and for_each

You cannot nest `count` and `for_each` on the same resource, but you can use them at different levels of your module hierarchy:

```hcl
# Root module uses for_each on the module
module "environment" {
  for_each = toset(["dev", "staging", "prod"])
  source   = "./modules/environment"
  env_name = each.key
}

# Inside the module, resources use count
# modules/environment/main.tf
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = var.ami
  instance_type = var.instance_type
}
```

This pattern gives you the benefits of both: stable module keys with `for_each` and simple numeric scaling with `count`.

## Conclusion

The count and for_each conflict is a straightforward Terraform limitation: pick one per resource. The real challenge is choosing the right one and handling migrations between them. Use `count` for simple quantities of identical resources and `for_each` for anything with a natural key or where you need stable identity. When you need conditional creation combined with iteration, use a conditional expression inside `for_each` instead of trying to add `count`. And when migrating from `count` to `for_each`, always use `moved` blocks or state commands to avoid unnecessary resource destruction.
