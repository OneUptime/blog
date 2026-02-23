# How to Use the for_each Meta-Argument with Sets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, for_each, Sets, Infrastructure as Code

Description: Learn how to use the Terraform for_each meta-argument with sets of strings to create multiple resources, understand the difference between sets and maps in for_each, and handle common conversion patterns.

---

The `for_each` meta-argument accepts two types of collections: maps and sets of strings. While maps are more common because they let you attach structured data to each key, sets are useful when you just need to create a resource per unique string value.

This post covers using `for_each` with sets, when sets make sense over maps, and how to work with the `each.key` and `each.value` variables in set-based iteration.

## How Sets Work with for_each

When you pass a set of strings to `for_each`, each string becomes both the key and the value:

```hcl
resource "aws_iam_user" "this" {
  for_each = toset(["alice", "bob", "charlie"])

  name = each.key   # "alice", "bob", "charlie"
  # each.value is the same as each.key for sets
}
```

This creates:
- `aws_iam_user.this["alice"]`
- `aws_iam_user.this["bob"]`
- `aws_iam_user.this["charlie"]`

Since sets are unordered and contain unique values, you get stable resource addresses without worrying about duplicates or ordering.

## Sets from Variables

Define a variable as a set:

```hcl
variable "iam_users" {
  description = "Set of IAM user names to create"
  type        = set(string)
  default     = ["alice", "bob", "charlie"]
}

resource "aws_iam_user" "this" {
  for_each = var.iam_users

  name = each.key

  tags = {
    ManagedBy = "terraform"
  }
}
```

Or convert a list variable to a set:

```hcl
variable "namespaces" {
  description = "List of Kubernetes namespaces"
  type        = list(string)
  default     = ["frontend", "backend", "monitoring", "logging"]
}

resource "kubernetes_namespace" "this" {
  for_each = toset(var.namespaces)

  metadata {
    name = each.key

    labels = {
      "managed-by" = "terraform"
    }
  }
}
```

## Practical Examples

### Creating IAM Groups

```hcl
variable "groups" {
  type    = set(string)
  default = ["engineering", "platform", "security", "data"]
}

resource "aws_iam_group" "this" {
  for_each = var.groups
  name     = each.key
  path     = "/teams/"
}
```

### Creating S3 Buckets

```hcl
variable "bucket_purposes" {
  type    = set(string)
  default = ["data", "logs", "backups", "artifacts", "reports"]
}

resource "aws_s3_bucket" "this" {
  for_each = var.bucket_purposes
  bucket   = "${var.project}-${var.environment}-${each.key}"

  tags = merge(local.common_tags, {
    Name    = each.key
    Purpose = each.key
  })
}
```

### Creating Security Group Rules

```hcl
variable "allowed_ports" {
  description = "Set of ports to allow inbound"
  type        = set(string)
  default     = ["443", "8080", "8443"]
}

resource "aws_security_group_rule" "ingress" {
  for_each = var.allowed_ports

  type              = "ingress"
  from_port         = tonumber(each.key)
  to_port           = tonumber(each.key)
  protocol          = "tcp"
  cidr_blocks       = [var.vpc_cidr]
  security_group_id = aws_security_group.app.id
  description       = "Allow port ${each.key}"
}
```

Note that sets in `for_each` must be sets of strings. The ports are stored as strings and converted with `tonumber()` where needed.

### Creating CloudWatch Log Groups

```hcl
variable "log_groups" {
  type = set(string)
  default = [
    "/ecs/api",
    "/ecs/web",
    "/ecs/worker",
    "/lambda/processor",
    "/lambda/authorizer",
  ]
}

resource "aws_cloudwatch_log_group" "this" {
  for_each = var.log_groups

  name              = "${var.project}/${var.environment}${each.key}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}
```

### Creating DNS Records

```hcl
variable "subdomains" {
  type    = set(string)
  default = ["api", "www", "admin", "docs"]
}

resource "aws_route53_record" "this" {
  for_each = var.subdomains

  zone_id = var.hosted_zone_id
  name    = "${each.key}.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.alb_dns_name]
}
```

## Sets vs. Maps: When to Use Which

Use a **set** when:
- Each resource only needs a single string identifier
- You do not need to attach different configuration to each item
- The items are naturally a list of unique names

Use a **map** when:
- Each resource needs multiple configuration attributes
- Different items have different settings
- You need to pass structured data

```hcl
# Set is enough - each namespace just needs a name
resource "kubernetes_namespace" "this" {
  for_each = toset(["frontend", "backend", "monitoring"])

  metadata {
    name = each.key
  }
}

# Map is needed - each database has different settings
resource "aws_db_instance" "this" {
  for_each = {
    orders = { engine = "postgres", size = "db.r5.large" }
    users  = { engine = "postgres", size = "db.r5.xlarge" }
    logs   = { engine = "mysql", size = "db.t3.medium" }
  }

  identifier     = "${var.project}-${each.key}"
  engine         = each.value.engine
  instance_class = each.value.size
}
```

## Computing Sets in Locals

Build sets dynamically from other data:

```hcl
variable "services" {
  type = map(object({
    port   = number
    public = bool
  }))
}

locals {
  # Extract unique ports from the services map
  unique_ports = toset([for name, svc in var.services : tostring(svc.port)])

  # Get names of public services only
  public_service_names = toset([
    for name, svc in var.services : name
    if svc.public
  ])

  # Combine multiple lists into a unique set
  all_environments = toset(concat(
    var.primary_environments,
    var.secondary_environments
  ))
}

# Create security group rules for unique ports
resource "aws_security_group_rule" "service_ports" {
  for_each = local.unique_ports

  type              = "ingress"
  from_port         = tonumber(each.key)
  to_port           = tonumber(each.key)
  protocol          = "tcp"
  security_group_id = aws_security_group.app.id
  cidr_blocks       = [var.vpc_cidr]
}
```

## Sets in Module Calls

```hcl
variable "regions" {
  type    = set(string)
  default = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

module "regional_resources" {
  for_each = var.regions
  source   = "./modules/regional"

  region      = each.key
  project     = var.project
  environment = var.environment
}
```

## Referencing Set-Based Resources

```hcl
# Reference a specific instance
output "api_log_group_arn" {
  value = aws_cloudwatch_log_group.this["/ecs/api"].arn
}

# Collect all values into a map
output "all_log_group_arns" {
  value = {
    for name, lg in aws_cloudwatch_log_group.this : name => lg.arn
  }
}

# Collect into a list
output "all_bucket_names" {
  value = [for name, bucket in aws_s3_bucket.this : bucket.id]
}

# Collect into a set
output "all_user_arns" {
  value = toset([for name, user in aws_iam_user.this : user.arn])
}
```

## Set Operations

Terraform provides set operations that are useful for building `for_each` inputs:

```hcl
variable "all_users" {
  type    = set(string)
  default = ["alice", "bob", "charlie", "diana", "eve"]
}

variable "admin_users" {
  type    = set(string)
  default = ["alice", "diana"]
}

locals {
  # Set difference - users who are NOT admins
  regular_users = setsubtract(var.all_users, var.admin_users)
  # Result: ["bob", "charlie", "eve"]

  # Set intersection - users who ARE admins (same as admin_users here)
  confirmed_admins = setintersection(var.all_users, var.admin_users)
  # Result: ["alice", "diana"]

  # Set union - combine two sets
  all_privileged = setunion(var.admin_users, toset(["frank"]))
  # Result: ["alice", "diana", "frank"]
}

# Create admin policies only for admin users
resource "aws_iam_user_policy_attachment" "admin" {
  for_each = local.confirmed_admins

  user       = aws_iam_user.this[each.key].name
  policy_arn = aws_iam_policy.admin.arn
}

# Create standard policies for regular users
resource "aws_iam_user_policy_attachment" "standard" {
  for_each = local.regular_users

  user       = aws_iam_user.this[each.key].name
  policy_arn = aws_iam_policy.standard.arn
}
```

## The String Requirement

A key constraint: `for_each` sets must be sets of strings. If you have numbers, booleans, or objects, you need to convert them:

```hcl
# Numbers need tostring()
variable "ports" {
  type    = list(number)
  default = [80, 443, 8080]
}

resource "aws_security_group_rule" "this" {
  for_each = toset([for p in var.ports : tostring(p)])

  from_port = tonumber(each.key)
  to_port   = tonumber(each.key)
  # ...
}
```

For complex data, convert to a map instead of a set.

## Summary

Sets provide a clean way to use `for_each` when each resource instance is identified by a single unique string. They handle deduplication automatically, work naturally with IAM users, namespaces, bucket names, log groups, and similar resources that are defined by their name alone. When you need to attach different configuration to each item, switch to a map. Use `toset()` to convert lists, and leverage set operations like `setsubtract`, `setintersection`, and `setunion` to build exactly the set of resources you need.

For more on `for_each`, see our posts on [using for_each with maps](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-for-each-meta-argument-with-maps-in-terraform/view) and [converting lists to sets](https://oneuptime.com/blog/post/2026-02-23-how-to-convert-lists-to-sets-for-for-each-in-terraform/view).
