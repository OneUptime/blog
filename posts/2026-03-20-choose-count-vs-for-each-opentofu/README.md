# How to Choose Between count and for_each in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Count, for_each, Infrastructure as Code, DevOps

Description: A guide to deciding whether to use count or for_each when creating multiple resources in OpenTofu.

## Introduction

Both `count` and `for_each` create multiple resource instances, but they have different addressing models and behaviors. Choosing the right one depends on whether your resources are interchangeable or have unique identities.

## Key Differences

| Feature | count | for_each |
|---------|-------|----------|
| Addressing | By index [0], [1], [2] | By key ["name"] |
| Stability | Shifting index on insertion | Stable keys |
| Input type | Whole number | Map or Set of strings |
| Best for | Identical resources | Named resources |

## When to Use count

```hcl
# Use count when:

# 1. Resources are interchangeable (any instance can serve any purpose)
# 2. The exact count is what matters, not the identity

resource "aws_instance" "web" {
  count         = var.instance_count  # Simple number
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type

  # All instances are identical - any can handle any request
  tags = {
    Name  = "web-${count.index}"
    Index = count.index
  }
}

# Subnets across AZs - all are equal
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]
}

# Conditional resource - create or not
resource "aws_instance" "bastion" {
  count         = var.create_bastion ? 1 : 0
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

## When to Use for_each

```hcl
# Use for_each when:
# 1. Resources have unique identities (specific names, purposes)
# 2. Items might be added/removed from the middle of the collection
# 3. You want to reference resources by name

resource "aws_iam_user" "team" {
  for_each = toset(["alice", "bob", "charlie"])
  name     = each.key
  # aws_iam_user.team["alice"] - meaningful reference
}

resource "aws_vpc_security_group_ingress_rule" "ports" {
  for_each = {
    http  = 80
    https = 443
    api   = 8080
  }

  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = each.value
  ip_protocol       = "tcp"
  to_port           = each.value
}
```

## The Stability Difference

```hcl
# count problem: adding element shifts indices
variable "server_names" {
  default = ["web-1", "web-2", "web-3"]
}

resource "aws_instance" "web" {
  count         = length(var.server_names)
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = var.server_names[count.index]
  }
  # [0] has Name=web-1, [1] has Name=web-2, [2] has Name=web-3
}

# After: insert "web-0" at position 0:
# server_names = ["web-0", "web-1", "web-2", "web-3"]
# OpenTofu: [0] now wants Name=web-0, [1] wants Name=web-1, etc.
# This causes UNWANTED changes to multiple instances and may force
# replacement, depending on which arguments use count.index.

# for_each solution: stable by key
resource "aws_instance" "web" {
  for_each      = toset(var.server_names)
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = each.key
  }
  # Adding "web-0" only creates that resource
  # Other resources are unchanged
}
```

## Practical Decision Guide

```hcl
# Question 1: Is the input a simple number or a keyed collection?
# Whole number -> count
# Map or set of strings -> for_each

# Question 2: Are resources interchangeable or named?
# Interchangeable -> count
# Named -> for_each

# Question 3: Could items be inserted/removed from the middle?
# Yes -> for_each
# No -> either works

# Examples:
# "I need 3 web servers" -> count = 3
# "I need servers named web-1, web-2, web-3" -> for_each with set
# "I need buckets for dev, staging, prod" -> for_each with map
# "I need this resource optionally" -> count = bool ? 1 : 0
```

## Combining Both

```hcl
# Use count for the outer structure
resource "aws_subnet" "public" {
  count             = 3
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.azs[count.index]
}

# Use for_each for resources with specific names
resource "aws_route53_record" "app" {
  for_each = {
    "api"   = "api.example.com"
    "web"   = "www.example.com"
    "admin" = "admin.example.com"
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value
  type    = "CNAME"
  ttl     = 300
  records = [aws_lb.main.dns_name]
}
```

## Conclusion

The choice between `count` and `for_each` often comes down to stability and identity. Use `count` for simple numeric scaling and conditional resource creation. Use `for_each` when resources have unique identities, when you need stable state addressing, or when items might be added or removed from the collection without affecting other resources. When in doubt, `for_each` is generally the more robust choice for production infrastructure.
