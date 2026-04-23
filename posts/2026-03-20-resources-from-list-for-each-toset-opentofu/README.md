# How to Create Resources from a List with for_each and toset in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, for_each, Toset, List, HCL

Description: Learn how to use toset with for_each in OpenTofu to create resources from a list of unique string values with stable, name-based identities.

## Introduction

`for_each` requires a map or set of strings - not a list. The `toset()` function converts a list of strings to a set of unique strings, enabling `for_each` iteration over lists while giving each resource a stable string identity (the element value itself) rather than a numeric index.

## Basic toset Usage

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

# Convert list to set so for_each has stable string keys

resource "aws_s3_bucket" "env_config" {
  for_each = toset(var.environments)

  # each.key == each.value for sets (both equal the element value)
  bucket = "myapp-config-${each.key}"

  tags = {
    Environment = each.key
  }
}
```

## Creating IAM Users from a List

```hcl
variable "iam_users" {
  description = "List of IAM usernames to create"
  type        = list(string)
  default     = ["alice", "bob", "carol"]
}

resource "aws_iam_user" "team" {
  for_each = toset(var.iam_users)

  name = each.key
  path = "/users/"

  tags = {
    Name = each.key
  }
}

# Attach the same policy to all users
resource "aws_iam_user_policy_attachment" "readonly" {
  for_each = toset(var.iam_users)

  user       = aws_iam_user.team[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

## Security Group Rules from Port List

```hcl
variable "allowed_ports" {
  description = "TCP ports to allow inbound access to"
  type        = list(number)
  default     = [80, 443, 8080]
}

# for_each requires a set of strings; convert numbers to strings first
resource "aws_security_group_rule" "ingress" {
  for_each = toset([for p in var.allowed_ports : tostring(p)])

  type              = "ingress"
  from_port         = tonumber(each.key)
  to_port           = tonumber(each.key)
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
  description       = "Allow port ${each.key} inbound"
}
```

## Route53 Records from a List of Subdomains

```hcl
variable "subdomains" {
  type    = list(string)
  default = ["api", "www", "admin", "metrics"]
}

resource "aws_route53_record" "subdomains" {
  for_each = toset(var.subdomains)

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${each.key}.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

## Deduplication with toset

`toset` automatically deduplicates the list before creating the set.

```hcl
variable "regions" {
  # May contain duplicates from module composition
  type    = list(string)
  default = ["us-east-1", "us-west-2", "us-east-1"]
}

resource "aws_s3_bucket" "regional" {
  # toset deduplicates: ["us-east-1", "us-west-2"]
  for_each = toset(var.regions)

  provider = aws.regional[each.key]
  bucket   = "myapp-${each.key}-artifacts"
}
```

## Outputs from toset-Based Resources

```hcl
output "env_bucket_arns" {
  description = "Map of environment name to S3 bucket ARN"
  value = {
    for env, bucket in aws_s3_bucket.env_config : env => bucket.arn
  }
}

output "env_bucket_list" {
  description = "List of all environment bucket ARNs"
  value = values(aws_s3_bucket.env_config)[*].arn
}
```

## Conclusion

`toset` bridges the gap between lists (which users naturally provide as input) and the set/map that `for_each` requires. The resulting resources use the string element value as their identity, making them stable against list reordering. Remember that sets are unordered and deduplicated - if element order matters outside of `for_each`, keep the original list for ordered operations.
