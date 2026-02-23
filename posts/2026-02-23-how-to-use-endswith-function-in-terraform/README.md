# How to Use the endswith Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the endswith function in Terraform to check if a string ends with a specific suffix, with practical examples and real-world patterns.

---

Checking whether a string ends with a particular suffix is something you will find yourself doing surprisingly often in Terraform. Whether you are validating domain names, filtering resources by naming convention, or checking file extensions, the `endswith` function handles it cleanly.

## What Does endswith Do?

The `endswith` function takes two arguments: a string and a suffix. It returns `true` if the string ends with the given suffix, and `false` otherwise. The check is case-sensitive.

```hcl
# Basic syntax
endswith(string, suffix)
```

This function was introduced in Terraform 1.5, so make sure you are running at least that version.

## Basic Examples

Here are some simple examples you can test in the Terraform console.

```hcl
# Check if a string ends with a suffix
> endswith("hello-world", "world")
true

> endswith("hello-world", "hello")
false

# Case-sensitive comparison
> endswith("MyFile.TXT", ".txt")
false

> endswith("MyFile.TXT", ".TXT")
true

# Empty suffix always returns true
> endswith("anything", "")
true

# Exact match works too
> endswith("test", "test")
true
```

## Validating Domain Names

One of the most practical uses of `endswith` is validating domain names in your variables.

```hcl
variable "domain_name" {
  description = "The domain name for the application"
  type        = string

  validation {
    condition     = endswith(var.domain_name, ".com") || endswith(var.domain_name, ".io") || endswith(var.domain_name, ".net")
    error_message = "Domain name must end with .com, .io, or .net."
  }
}

# Usage in a resource
resource "aws_route53_zone" "main" {
  name = var.domain_name
}
```

This catches misconfigurations early, before Terraform even tries to create the resource.

## Filtering Resources by Naming Convention

You can combine `endswith` with `for` expressions to filter lists based on suffixes.

```hcl
variable "s3_buckets" {
  description = "List of S3 bucket names"
  type        = list(string)
  default = [
    "myapp-logs-prod",
    "myapp-data-prod",
    "myapp-logs-staging",
    "myapp-backups-prod",
    "myapp-data-staging"
  ]
}

locals {
  # Filter only production buckets
  prod_buckets = [
    for bucket in var.s3_buckets : bucket
    if endswith(bucket, "-prod")
  ]

  # Filter staging buckets
  staging_buckets = [
    for bucket in var.s3_buckets : bucket
    if endswith(bucket, "-staging")
  ]
}

output "prod_buckets" {
  value = local.prod_buckets
  # ["myapp-logs-prod", "myapp-data-prod", "myapp-backups-prod"]
}
```

## Checking File Extensions

When working with file paths in Terraform, you can use `endswith` to verify file types.

```hcl
variable "config_file" {
  description = "Path to the configuration file"
  type        = string

  validation {
    condition     = endswith(var.config_file, ".json") || endswith(var.config_file, ".yaml") || endswith(var.config_file, ".yml")
    error_message = "Configuration file must be a JSON or YAML file."
  }
}

locals {
  # Determine the file type based on extension
  is_json = endswith(var.config_file, ".json")
  is_yaml = endswith(var.config_file, ".yaml") || endswith(var.config_file, ".yml")
}
```

## Conditional Logic Based on Suffixes

Use `endswith` in conditional expressions to drive resource configuration.

```hcl
variable "instance_name" {
  description = "Name of the compute instance"
  type        = string
}

locals {
  # Determine instance type based on naming convention
  is_database = endswith(var.instance_name, "-db")
  is_cache    = endswith(var.instance_name, "-cache")
  is_web      = endswith(var.instance_name, "-web")

  # Assign instance type based on role
  instance_type = (
    local.is_database ? "r6g.xlarge" :
    local.is_cache ? "r6g.large" :
    local.is_web ? "t3.medium" :
    "t3.micro"
  )
}

resource "aws_instance" "server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.instance_type

  tags = {
    Name = var.instance_name
    Role = (
      local.is_database ? "database" :
      local.is_cache ? "cache" :
      local.is_web ? "webserver" :
      "general"
    )
  }
}
```

## Combining endswith with startswith

These two functions complement each other nicely for string pattern matching.

```hcl
variable "resource_arn" {
  description = "ARN of the AWS resource"
  type        = string

  validation {
    # Validate that it looks like a valid ARN
    condition = (
      startswith(var.resource_arn, "arn:aws:") &&
      !endswith(var.resource_arn, "/")
    )
    error_message = "Must be a valid AWS ARN that does not end with a trailing slash."
  }
}
```

For more on `startswith`, see our post on [how to use the startswith function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-startswith-function-in-terraform/view).

## Working with Maps

You can use `endswith` to process maps and filter or transform entries.

```hcl
variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    "app:name"      = "myapp"
    "app:env"       = "production"
    "cost:center"   = "engineering"
    "cost:project"  = "platform"
    "owner:team"    = "devops"
  }
}

locals {
  # Extract tags that end with specific patterns
  app_tags = {
    for key, value in var.tags : key => value
    if startswith(key, "app:")
  }

  # Find values ending with "tion"
  tion_values = {
    for key, value in var.tags : key => value
    if endswith(value, "tion")
  }
}
```

## Case-Insensitive Matching

Since `endswith` is case-sensitive, you need to normalize the case if you want case-insensitive matching.

```hcl
locals {
  filename = "Report.PDF"

  # Case-sensitive check fails
  is_pdf_strict = endswith(local.filename, ".pdf")
  # Result: false

  # Case-insensitive check using lower()
  is_pdf = endswith(lower(local.filename), ".pdf")
  # Result: true
}
```

Combining `endswith` with [lower](https://oneuptime.com/blog/post/2026-02-23-how-to-use-lower-function-in-terraform/view) is a common pattern when you cannot guarantee the case of your input data.

## Using endswith in for_each

You can use `endswith` to conditionally create resources.

```hcl
variable "dns_records" {
  description = "DNS records to create"
  type        = map(string)
  default = {
    "api.example.com"     = "10.0.1.1"
    "web.example.com"     = "10.0.1.2"
    "api.internal.local"  = "192.168.1.1"
    "db.internal.local"   = "192.168.1.2"
  }
}

# Only create Route53 records for .com domains
resource "aws_route53_record" "public" {
  for_each = {
    for name, ip in var.dns_records : name => ip
    if endswith(name, ".com")
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key
  type    = "A"
  ttl     = 300
  records = [each.value]
}
```

## Error Handling Patterns

Since `endswith` returns a boolean, it integrates smoothly with Terraform's validation blocks for clear error messages.

```hcl
variable "bucket_name" {
  description = "S3 bucket name"
  type        = string

  validation {
    condition     = !endswith(var.bucket_name, "-")
    error_message = "Bucket name must not end with a hyphen."
  }

  validation {
    condition     = !endswith(var.bucket_name, ".")
    error_message = "Bucket name must not end with a period."
  }
}
```

## Summary

The `endswith` function is a straightforward way to check string suffixes in Terraform. It shines in variable validation, resource filtering, and conditional logic. Pair it with `startswith` for prefix checks and `lower` for case-insensitive comparisons to build robust string matching in your configurations.
