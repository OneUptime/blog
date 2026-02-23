# How to Use the formatlist Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the formatlist function in Terraform to apply printf-style formatting to lists of values, with practical examples for bulk resource creation.

---

While the `format` function formats a single string, `formatlist` applies the same format specification to every element in a list. This is extremely handy when you need to generate a batch of formatted strings from a list of values - think naming multiple resources, generating IAM policy ARNs, or building lists of connection strings.

## What Does formatlist Do?

The `formatlist` function works like `format`, but it operates on lists instead of individual values. It applies a format string to each element (or combination of elements) and returns a list of formatted strings.

```hcl
# Basic syntax
formatlist(spec, values...)
```

If one of the arguments is a list and another is a scalar, the scalar is reused for every list element. If multiple lists are provided, they are processed in parallel (element by element).

## Basic Examples

Let us look at some simple cases first.

```hcl
# Format each element in a list
> formatlist("Hello, %s!", ["Alice", "Bob", "Charlie"])
[
  "Hello, Alice!",
  "Hello, Bob!",
  "Hello, Charlie!",
]

# Format numbers with padding
> formatlist("server-%03d", [1, 2, 3, 10, 42])
[
  "server-001",
  "server-002",
  "server-003",
  "server-010",
  "server-042",
]

# Mix a scalar with a list
> formatlist("%s-%s", "prod", ["web", "api", "db"])
[
  "prod-web",
  "prod-api",
  "prod-db",
]
```

## Parallel List Processing

When you pass multiple lists, `formatlist` zips them together.

```hcl
locals {
  names = ["web", "api", "worker"]
  ports = [80, 8080, 9090]

  # Both lists are processed in parallel
  descriptions = formatlist("%s listens on port %d", local.names, local.ports)
  # Result: [
  #   "web listens on port 80",
  #   "api listens on port 8080",
  #   "worker listens on port 9090"
  # ]
}
```

Both lists must have the same length when used this way. If they differ, Terraform will throw an error.

## Generating S3 Bucket Names

A common pattern is generating a set of bucket names with a consistent naming scheme.

```hcl
variable "project" {
  default = "myapp"
}

variable "environment" {
  default = "prod"
}

variable "bucket_purposes" {
  default = ["data", "logs", "backups", "artifacts", "config"]
}

locals {
  # Generate bucket names: myapp-prod-data, myapp-prod-logs, etc.
  bucket_names = formatlist(
    "%s-%s-%s",
    var.project,
    var.environment,
    var.bucket_purposes
  )
}

# Create all the buckets
resource "aws_s3_bucket" "buckets" {
  for_each = toset(local.bucket_names)
  bucket   = each.value
}

output "bucket_names" {
  value = local.bucket_names
  # ["myapp-prod-data", "myapp-prod-logs", "myapp-prod-backups",
  #  "myapp-prod-artifacts", "myapp-prod-config"]
}
```

## Building IAM Policy ARNs

When attaching multiple AWS managed policies to a role, `formatlist` saves a lot of repetition.

```hcl
variable "policy_names" {
  description = "List of AWS managed policy names to attach"
  type        = list(string)
  default = [
    "AmazonS3ReadOnlyAccess",
    "AmazonDynamoDBReadOnlyAccess",
    "CloudWatchLogsFullAccess",
    "AmazonSQSFullAccess"
  ]
}

locals {
  # Build full ARNs for all managed policies
  policy_arns = formatlist(
    "arn:aws:iam::aws:policy/%s",
    var.policy_names
  )
}

resource "aws_iam_role_policy_attachment" "policies" {
  for_each   = toset(local.policy_arns)
  role       = aws_iam_role.app.name
  policy_arn = each.value
}
```

## Security Group Rules

Generate descriptions or CIDR blocks for security group rules.

```hcl
variable "allowed_ips" {
  description = "IP addresses allowed to access the application"
  type        = list(string)
  default     = ["203.0.113.10", "198.51.100.20", "192.0.2.30"]
}

locals {
  # Convert IP addresses to CIDR notation
  allowed_cidrs = formatlist("%s/32", var.allowed_ips)
  # Result: ["203.0.113.10/32", "198.51.100.20/32", "192.0.2.30/32"]
}

resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = local.allowed_cidrs
  }
}
```

## Building Connection Strings

Generate connection strings for multiple databases or services.

```hcl
variable "db_hosts" {
  default = ["db-1.internal", "db-2.internal", "db-3.internal"]
}

variable "db_port" {
  default = 5432
}

variable "db_name" {
  default = "appdb"
}

locals {
  # Build connection strings for each database host
  connection_strings = formatlist(
    "postgresql://app_user@%s:%d/%s",
    var.db_hosts,
    var.db_port,
    var.db_name
  )
  # Result: [
  #   "postgresql://app_user@db-1.internal:5432/appdb",
  #   "postgresql://app_user@db-2.internal:5432/appdb",
  #   "postgresql://app_user@db-3.internal:5432/appdb"
  # ]
}
```

Notice how `db_port` and `db_name` are scalars. They get reused for every element in `db_hosts`.

## Generating DNS Records

Build a list of fully qualified domain names from short hostnames.

```hcl
variable "hostnames" {
  default = ["web", "api", "admin", "grafana", "prometheus"]
}

variable "domain" {
  default = "example.com"
}

locals {
  fqdns = formatlist("%s.%s", var.hostnames, var.domain)
  # Result: ["web.example.com", "api.example.com", "admin.example.com",
  #          "grafana.example.com", "prometheus.example.com"]
}

resource "aws_route53_record" "services" {
  for_each = toset(local.fqdns)

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value
  type    = "CNAME"
  ttl     = 300
  records = [aws_lb.main.dns_name]
}
```

## Combining formatlist with join

A powerful pattern is using `formatlist` to generate list items and then `join` to combine them.

```hcl
variable "env_vars" {
  type = map(string)
  default = {
    APP_ENV  = "production"
    LOG_LEVEL = "info"
    PORT      = "8080"
  }
}

locals {
  # Generate KEY=VALUE pairs
  env_pairs = formatlist(
    "%s=%s",
    keys(var.env_vars),
    values(var.env_vars)
  )

  # Join them into a single string
  env_string = join("\n", local.env_pairs)
}
```

For more on the `join` function, see [how to use the join function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-join-function-in-terraform/view).

## Tag Generation

Generate tag maps for multiple resources programmatically.

```hcl
variable "service_names" {
  default = ["frontend", "backend", "scheduler"]
}

variable "team" {
  default = "platform"
}

locals {
  # Generate Name tags for each service
  service_name_tags = formatlist("%s-%s-service", var.team, var.service_names)
  # Result: ["platform-frontend-service", "platform-backend-service",
  #          "platform-scheduler-service"]
}
```

## formatlist with Count

Use `formatlist` alongside the `range` function to generate numbered sequences.

```hcl
locals {
  # Generate 10 availability zone-aware subnet names
  az_suffixes    = ["a", "b", "c"]
  subnet_types   = ["public", "private"]

  # Create names like "subnet-public-a", "subnet-private-b", etc.
  public_subnets = formatlist("subnet-public-%s", local.az_suffixes)
  private_subnets = formatlist("subnet-private-%s", local.az_suffixes)
}
```

## Error Handling

Keep in mind that when passing multiple lists, they must all have the same length.

```hcl
# This will fail because the lists have different lengths
# formatlist("%s-%s", ["a", "b"], ["x", "y", "z"])
# Error: arguments must have the same length

# This works because scalars are repeated for each list element
> formatlist("%s-%s", "prefix", ["x", "y", "z"])
[
  "prefix-x",
  "prefix-y",
  "prefix-z",
]
```

## Summary

The `formatlist` function is one of the most useful tools for generating batches of formatted strings in Terraform. It eliminates repetitive code when you need to apply the same naming pattern, ARN structure, or format specification across a list of values. Combined with `for_each` and `toset`, it enables clean, DRY resource definitions. For formatting individual strings, see the companion [format function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-format-function-in-terraform/view).
