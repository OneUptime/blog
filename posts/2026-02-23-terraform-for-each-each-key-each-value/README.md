# How to Use each.key and each.value in Terraform for_each

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, for_each, Loops, Infrastructure as Code

Description: Learn how to use each.key and each.value in Terraform for_each loops to create multiple resources from maps and sets with clean, readable configurations.

---

The `for_each` meta-argument in Terraform lets you create multiple instances of a resource from a map or set. Inside the resource block, `each.key` and `each.value` give you access to the current item being iterated over. These two references are how you customize each resource instance.

This post covers how `each.key` and `each.value` work, what they return for different input types, and practical patterns for using them.

## The Basics

When you use `for_each`, Terraform iterates over a map or set and creates one resource instance per item. Inside the block, you get two references:

- **each.key** - The map key (for maps) or the set element (for sets)
- **each.value** - The map value (for maps) or the set element (for sets)

```hcl
# Using for_each with a set of strings
resource "aws_iam_user" "team" {
  for_each = toset(["alice", "bob", "carol"])

  # For sets: each.key and each.value are the same
  name = each.key    # "alice", "bob", "carol"
  # name = each.value  # would give the same result
}
```

## for_each with a Set

When the input is a set, both `each.key` and `each.value` return the same thing - the current element:

```hcl
variable "environments" {
  type    = set(string)
  default = ["dev", "staging", "production"]
}

# Create an S3 bucket for each environment
resource "aws_s3_bucket" "env" {
  for_each = var.environments

  bucket = "myapp-${each.key}-data"  # each.key is the set element

  tags = {
    Environment = each.value  # same as each.key for sets
  }
}
```

If you have a list, you need to convert it to a set first:

```hcl
variable "subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

# Convert list to set for for_each
resource "aws_subnet" "this" {
  for_each = toset(var.subnet_cidrs)

  vpc_id     = aws_vpc.main.id
  cidr_block = each.value  # the CIDR string

  tags = {
    Name = "subnet-${each.key}"  # same as each.value
  }
}
```

## for_each with a Map

This is where `each.key` and `each.value` become truly distinct. The key is the map key, and the value is the map value:

```hcl
variable "instances" {
  type = map(string)
  default = {
    web    = "t3.micro"
    api    = "t3.small"
    worker = "t3.medium"
  }
}

resource "aws_instance" "app" {
  for_each = var.instances

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = each.value  # "t3.micro", "t3.small", "t3.medium"

  tags = {
    Name = each.key  # "web", "api", "worker"
  }
}
```

## for_each with a Map of Objects

The most powerful pattern is using a map of objects. `each.value` gives you the entire object, and you access its fields with dot notation:

```hcl
variable "services" {
  type = map(object({
    port          = number
    instance_type = string
    replicas      = number
    public        = bool
  }))
  default = {
    web = {
      port          = 80
      instance_type = "t3.small"
      replicas      = 3
      public        = true
    }
    api = {
      port          = 8080
      instance_type = "t3.medium"
      replicas      = 2
      public        = true
    }
    worker = {
      port          = 9090
      instance_type = "t3.large"
      replicas      = 1
      public        = false
    }
  }
}

# Create instances for each service
resource "aws_instance" "service" {
  for_each = var.services

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = each.value.instance_type  # access object field

  tags = {
    Name    = "${each.key}-server"           # map key: "web", "api", "worker"
    Port    = tostring(each.value.port)      # object field
    Public  = tostring(each.value.public)    # object field
  }
}

# Create security group rules for public services only
resource "aws_security_group_rule" "ingress" {
  for_each = { for name, svc in var.services : name => svc if svc.public }

  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.main.id
}
```

## each.key and each.value in Nested Blocks

You can use `each.key` and `each.value` anywhere inside the resource block, including in nested blocks and dynamic blocks:

```hcl
variable "dns_records" {
  type = map(object({
    type    = string
    ttl     = number
    records = list(string)
  }))
  default = {
    "www.example.com" = {
      type    = "A"
      ttl     = 300
      records = ["93.184.216.34"]
    }
    "mail.example.com" = {
      type    = "MX"
      ttl     = 3600
      records = ["10 mail.example.com"]
    }
  }
}

resource "aws_route53_record" "this" {
  for_each = var.dns_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key                  # the domain name (map key)
  type    = each.value.type           # "A" or "MX"
  ttl     = each.value.ttl            # 300 or 3600
  records = each.value.records        # the record values
}
```

## Referencing for_each Resource Instances

When other resources need to reference a specific instance created with `for_each`, they use the map key in brackets:

```hcl
resource "aws_instance" "app" {
  for_each = var.services
  # ...
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = each.value.instance_type
}

# Reference a specific instance by key
resource "aws_eip" "web" {
  instance = aws_instance.app["web"].id  # reference the "web" instance
  domain   = "vpc"
}

# Build outputs from for_each resources
output "instance_ips" {
  value = { for name, instance in aws_instance.app : name => instance.private_ip }
}
```

## Transforming Data for for_each

Sometimes your input data is not in the right shape. Use `for` expressions to transform it:

```hcl
variable "users" {
  type = list(object({
    name   = string
    groups = list(string)
  }))
  default = [
    { name = "alice", groups = ["admins", "developers"] },
    { name = "bob", groups = ["developers"] },
  ]
}

# Flatten the list into a map for for_each
locals {
  # Create a flat map of user-group pairs
  user_group_memberships = {
    for pair in flatten([
      for user in var.users : [
        for group in user.groups : {
          key   = "${user.name}-${group}"
          user  = user.name
          group = group
        }
      ]
    ]) : pair.key => pair
  }
}

# Create group memberships
resource "aws_iam_user_group_membership" "this" {
  for_each = local.user_group_memberships

  user   = each.value.user    # "alice" or "bob"
  groups = [each.value.group] # "admins" or "developers"
}
```

## for_each in Modules

Modules support `for_each` just like resources:

```hcl
variable "microservices" {
  type = map(object({
    port     = number
    cpu      = number
    memory   = number
    replicas = number
  }))
}

module "service" {
  for_each = var.microservices
  source   = "./modules/ecs-service"

  service_name = each.key           # the microservice name
  port         = each.value.port
  cpu          = each.value.cpu
  memory       = each.value.memory
  replicas     = each.value.replicas
}

# Reference a specific module instance
output "web_service_url" {
  value = module.service["web"].service_url
}
```

## Common Pitfalls

One thing to watch for: `for_each` keys must be known at plan time. If a key depends on a value that is only computed during apply, Terraform will throw an error.

```hcl
# This will NOT work if the instance IDs are not yet known
resource "aws_eip" "this" {
  for_each = { for i in aws_instance.app : i.id => i }  # IDs unknown at plan
}

# Instead, use the same keys you used for the instances
resource "aws_eip" "this" {
  for_each = var.services  # same map used for the instances
  instance = aws_instance.app[each.key].id
  domain   = "vpc"
}
```

## Wrapping Up

The `each.key` and `each.value` references are the building blocks of `for_each` loops in Terraform. For sets, they are identical. For maps, `each.key` gives you the map key and `each.value` gives you the value. For maps of objects, `each.value` gives you the full object with dot-notation access to its fields. Master these two references and you can create dynamic, data-driven infrastructure configurations.

For the index-based alternative, see [How to Use count.index in Terraform Resource Creation](https://oneuptime.com/blog/post/2026-02-23-terraform-count-index/view). For other reference types, check [How to Reference Resource Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-resource-attributes/view).
