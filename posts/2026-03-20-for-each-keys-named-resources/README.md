# How to Use for_each with Keys to Create Named Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, for_each, HCL, Infrastructure as Code, Named Resources, Map

Description: Learn how to use OpenTofu's for_each with map keys to create multiple named resources, manage them independently, and avoid the pitfalls of count-based resource creation.

---

`for_each` is the preferred way to create multiple instances of a resource in OpenTofu when each instance needs a stable identity. Unlike `count`, `for_each` uses keys to identify resources - adding or removing a key only affects that specific resource, not all others.

---

## for_each vs count

| Feature | count | for_each |
|---------|-------|----------|
| Resource identity | By index (0, 1, 2...) | By key ("web", "api"...) |
| Add/remove item | Shifts indices, may destroy others | Only affects changed key |
| Refer to resource | `aws_instance.web[0]` | `aws_instance.web["web"]` |
| Works with | Whole numbers | Maps, sets of strings |

---

## Basic for_each with a Map

```hcl
# Create one S3 bucket per environment

variable "buckets" {
  default = {
    "prod-data"    = "us-east-1"
    "staging-data" = "us-west-2"
    "dev-data"     = "us-east-1"
  }
}

resource "aws_s3_bucket" "envs" {
  for_each = var.buckets

  bucket = each.key
  tags = {
    Region = each.value
  }
}

# Reference a specific bucket
output "prod_bucket_arn" {
  value = aws_s3_bucket.envs["prod-data"].arn
}
```

---

## for_each with a Map of Objects

```hcl
variable "instances" {
  default = {
    "web-server" = {
      type    = "t3.medium"
      subnet  = "subnet-111"
      public  = true
    }
    "api-server" = {
      type    = "t3.large"
      subnet  = "subnet-222"
      public  = false
    }
    "worker" = {
      type    = "t3.small"
      subnet  = "subnet-222"
      public  = false
    }
  }
}

resource "aws_instance" "servers" {
  for_each = var.instances

  ami                         = data.aws_ami.ubuntu.id
  instance_type               = each.value.type
  subnet_id                   = each.value.subnet
  associate_public_ip_address = each.value.public

  tags = {
    Name = each.key
  }
}
```

---

## for_each with toset() (No Values Needed)

When you only need keys and don't need values:

```hcl
variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "public" {
  for_each = toset(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, index(var.availability_zones, each.key))

  tags = {
    Name = "public-${each.key}"
    AZ   = each.key
  }
}
```

---

## Referencing for_each Resources

```hcl
# Get all instance IDs
output "all_instance_ids" {
  value = {
    for name, instance in aws_instance.servers :
    name => instance.id
  }
}

# Reference a specific instance
output "web_server_ip" {
  value = aws_instance.servers["web-server"].private_ip
}

# Use in another resource
resource "aws_route53_record" "servers" {
  for_each = aws_instance.servers

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.key}.internal.example.com"
  type    = "A"
  ttl     = 300
  records = [each.value.private_ip]
}
```

---

## Dynamic Keys from Data Sources

```hcl
# Create security group ingress rules from a data source
data "aws_security_groups" "app_tiers" {
  tags = { Tier = "app" }
}

resource "aws_vpc_security_group_ingress_rule" "allow_from_app" {
  for_each = toset(data.aws_security_groups.app_tiers.ids)

  security_group_id            = aws_security_group.db.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = each.value
}
```

---

## Generating Maps with for Expressions

```hcl
# Convert a list to a map suitable for for_each
variable "user_names" {
  default = ["alice", "bob", "carol"]
}

locals {
  # Map of name => IAM-safe name
  users_map = {for name in var.user_names : name => replace(name, " ", "-")}
}

resource "aws_iam_user" "users" {
  for_each = local.users_map
  name     = each.value
}
```

---

## Moving from count to for_each

```hcl
# Old (count-based) - fragile
resource "aws_instance" "web" {
  count = 3
  ami   = "ami-xxx"
  # ...
}

# New (for_each-based) - stable
locals {
  web_instances = toset(["web-1", "web-2", "web-3"])
}

resource "aws_instance" "web" {
  for_each = local.web_instances
  ami      = "ami-xxx"
  tags     = { Name = each.key }
}
```

---

## Best Practices

1. **Prefer for_each over count** when instances need stable keys or distinct values
2. **Use meaningful string keys** - they become part of the resource address in state
3. **Use `toset()`** for simple lists without needing values
4. **Derive keys from attribute names** that users would recognize (environment names, region names)
5. **Use `moved` blocks** when converting existing `count` resources to `for_each` to avoid recreation

---

## Conclusion

`for_each` with map keys provides stable, named resource management in OpenTofu. Each resource is identified by its key, making additions and removals safe and predictable. Use it instead of `count` when instances need stable, meaningful identities.

---

*Deploy and monitor your infrastructure with [OneUptime](https://oneuptime.com).*
