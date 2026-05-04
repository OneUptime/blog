# How to Use count and for_each with Data Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Count, for_each, HCL, Infrastructure as Code, DevOps

Description: Learn how to use count and for_each meta-arguments with data sources in OpenTofu to query multiple resources dynamically.

---

Like resources, data sources support the `count` and `for_each` meta-arguments, allowing you to query multiple data sources dynamically based on a list or map. This is useful when you need to look up several existing resources by name or key.

---

## Using count with Data Sources

`count` creates multiple instances of a data source, each indexed numerically.

```hcl
variable "ami_name_patterns" {
  type = list(string)
  default = [
    "amzn2-ami-hvm-*-x86_64-gp2",
    "ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*",
  ]
}

# Look up an AMI for each name pattern

data "aws_ami" "instances" {
  count = length(var.ami_name_patterns)

  most_recent = true
  owners      = ["amazon", "099720109477"]

  filter {
    name   = "name"
    values = [var.ami_name_patterns[count.index]]
  }
}

# Reference by index
output "ami_ids" {
  value = data.aws_ami.instances[*].id   # splat expression
}
```

---

## Using for_each with Data Sources

`for_each` is more common than `count` for data sources because it provides stable keys instead of numeric indices.

```hcl
variable "bucket_names" {
  type    = set(string)
  default = ["data-archive", "app-assets", "logs"]
}

# Look up each bucket by name
data "aws_s3_bucket" "buckets" {
  for_each = var.bucket_names

  bucket = each.key   # each.key is the bucket name
}

# Output the ARN of each bucket
output "bucket_arns" {
  value = { for k, v in data.aws_s3_bucket.buckets : k => v.arn }
}
```

---

## for_each with a Map of Configurations

Using a map gives you both a key and additional configuration values.

```hcl
variable "zones" {
  type = map(object({
    name    = string
    private = bool
  }))
  default = {
    public_zone  = { name = "example.com.", private = false }
    private_zone = { name = "internal.example.com.", private = true }
  }
}

data "aws_route53_zone" "zones" {
  for_each = var.zones

  name         = each.value.name
  private_zone = each.value.private
}

# Add records to each zone
resource "aws_route53_record" "health" {
  for_each = data.aws_route53_zone.zones

  zone_id = each.value.zone_id
  name    = "health.${each.value.name}"
  type    = "A"
  ttl     = 60
  records = ["127.0.0.1"]
}
```

---

## Combining count Data Sources with Resources

```hcl
variable "secret_names" {
  type    = list(string)
  default = ["db_password", "api_key", "jwt_secret"]
}

# Read each secret
data "aws_secretsmanager_secret_version" "secrets" {
  count     = length(var.secret_names)
  secret_id = "production/${var.secret_names[count.index]}"
}

# Pass all secrets to an ECS task as environment variables
locals {
  env_vars = [
    for i, name in var.secret_names : {
      name  = upper(name)
      value = data.aws_secretsmanager_secret_version.secrets[i].secret_string
    }
  ]
}
```

---

## Accessing Results from for_each Data Sources

```hcl
data "aws_iam_policy" "managed" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
  ])

  arn = each.key
}

resource "aws_iam_role_policy_attachment" "attachments" {
  for_each = data.aws_iam_policy.managed

  role       = aws_iam_role.app.name
  policy_arn = each.value.arn
}
```

---

## count vs for_each with Data Sources

| | count | for_each |
|---|---|---|
| Index type | Numeric (0, 1, 2...) | String key |
| Stability | Order-sensitive | Key-stable |
| Best for | Sequential lookups | Named lookups |
| Reference syntax | `data.type.name[0].attr` | `data.type.name["key"].attr` |

---

## Summary

Use `count` with data sources when iterating over a list by position, and `for_each` when iterating over a set or map with stable string keys. `for_each` is generally preferred because adding or removing items doesn't affect other instances. Both meta-arguments work identically on data sources as they do on resources.
