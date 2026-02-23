# How to Use the lower Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the lower function in Terraform to convert strings to lowercase, with practical examples for resource naming, validation, and normalization.

---

Many cloud resources require lowercase names. S3 bucket names must be lowercase. DNS records are case-insensitive but conventionally lowercase. Tags often need normalization. The `lower` function in Terraform converts all Unicode letters in a string to their lowercase equivalents, making it an essential tool for keeping your infrastructure configuration consistent.

## What Does lower Do?

The `lower` function takes a string and returns a new string with all cased letters converted to lowercase.

```hcl
# Basic syntax
lower(string)
```

It handles Unicode properly, so it works with international characters, not just ASCII.

## Basic Examples

```hcl
# Convert a simple string
> lower("HELLO")
"hello"

# Mixed case
> lower("Hello World")
"hello world"

# Already lowercase - no change
> lower("hello")
"hello"

# Numbers and special characters are unaffected
> lower("Hello-World_123")
"hello-world_123"

# Unicode support
> lower("BONJOUR")
"bonjour"
```

## Normalizing S3 Bucket Names

AWS S3 bucket names must be lowercase. Using `lower` ensures compliance regardless of how users provide the input.

```hcl
variable "bucket_name" {
  description = "Name for the S3 bucket"
  type        = string
}

resource "aws_s3_bucket" "main" {
  # Force lowercase to meet S3 naming requirements
  bucket = lower(var.bucket_name)
}

# If someone passes "MyApp-Data-Bucket", it becomes "myapp-data-bucket"
```

## Case-Insensitive Comparisons

Terraform string comparisons are case-sensitive by default. Use `lower` on both sides to make comparisons case-insensitive.

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
}

locals {
  # Normalize environment to lowercase for consistent comparison
  env = lower(var.environment)

  # Now comparisons work regardless of input case
  is_prod    = local.env == "production"
  is_staging = local.env == "staging"
  is_dev     = local.env == "development"
}

# Whether the user passes "Production", "PRODUCTION", or "production",
# the comparison works correctly
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.is_prod ? "m5.xlarge" : "t3.micro"

  tags = {
    Environment = local.env
  }
}
```

## Variable Validation

Combine `lower` with validation blocks to enforce naming standards.

```hcl
variable "project_name" {
  description = "Project name (must be lowercase)"
  type        = string

  validation {
    condition     = var.project_name == lower(var.project_name)
    error_message = "Project name must be lowercase. Got: ${var.project_name}"
  }

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]+$", var.project_name))
    error_message = "Project name must start with a letter and contain only lowercase letters, numbers, and hyphens."
  }
}
```

The first validation uses `lower` to check whether the input is already lowercase. If not, it fails with a clear message.

## Normalizing Tags

Tags across cloud resources often end up with inconsistent casing. Normalize them on the way in.

```hcl
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Team    = "Platform"
    Project = "MyApp"
    Owner   = "John.Doe"
  }
}

locals {
  # Normalize tag keys to lowercase
  normalized_tags = {
    for key, value in var.tags :
    lower(key) => value
  }

  # Normalize both keys and values
  fully_normalized_tags = {
    for key, value in var.tags :
    lower(key) => lower(value)
  }
}

# normalized_tags:
# { "team" = "Platform", "project" = "MyApp", "owner" = "John.Doe" }

# fully_normalized_tags:
# { "team" = "platform", "project" = "myapp", "owner" = "john.doe" }
```

## DNS Record Names

DNS is case-insensitive, but it is best practice to use lowercase for consistency.

```hcl
variable "dns_records" {
  type = map(string)
  default = {
    "API.Example.Com"   = "10.0.1.1"
    "Web.Example.Com"   = "10.0.1.2"
    "Admin.Example.Com" = "10.0.1.3"
  }
}

resource "aws_route53_record" "records" {
  for_each = var.dns_records

  zone_id = data.aws_route53_zone.main.zone_id
  name    = lower(each.key)
  type    = "A"
  ttl     = 300
  records = [each.value]
}
```

## Combining with Other String Functions

`lower` works well in combination with other functions.

```hcl
locals {
  raw_input = "  My Application Name  "

  # Normalize: trim whitespace and convert to lowercase
  clean_name = lower(trimspace(local.raw_input))
  # Result: "my application name"

  # Create a slug: lowercase, replace spaces with hyphens
  slug = replace(lower(trimspace(local.raw_input)), " ", "-")
  # Result: "my-application-name"

  # For S3 buckets: lowercase, replace spaces with hyphens, trim
  bucket_name = lower(replace(trimspace(local.raw_input), " ", "-"))
  # Result: "my-application-name"
}
```

For more on `trimspace`, see [how to use trimspace](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trimspace-function-in-terraform/view). For `replace`, see [how to use replace](https://oneuptime.com/blog/post/2026-02-23-how-to-use-replace-function-in-terraform/view).

## Case-Insensitive Lookups in Maps

When you have a map and need to look up values regardless of key casing.

```hcl
variable "region_map" {
  type = map(string)
  default = {
    "us-east-1" = "ami-0123456789abcdef0"
    "us-west-2" = "ami-0fedcba9876543210"
    "eu-west-1" = "ami-0abcdef1234567890"
  }
}

variable "selected_region" {
  type    = string
  default = "US-EAST-1"
}

locals {
  # Normalize the key for lookup
  ami_id = var.region_map[lower(var.selected_region)]
}
```

## Building Consistent Resource Identifiers

Ensure all resource identifiers follow the same casing convention.

```hcl
variable "app_name" {
  default = "MyWebApp"
}

variable "environment" {
  default = "Production"
}

locals {
  # Standard prefix used across all resources
  prefix = lower("${var.app_name}-${var.environment}")
  # Result: "mywebapp-production"
}

resource "aws_security_group" "app" {
  name        = "${local.prefix}-sg"
  description = "Security group for ${local.prefix}"
  vpc_id      = aws_vpc.main.id
}

resource "aws_lb" "app" {
  name               = "${local.prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.app.id]
  subnets            = aws_subnet.public[*].id
}
```

## Conditional Behavior Based on Normalized Input

Use `lower` in conditional expressions to handle varied user input gracefully.

```hcl
variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "INFO"
}

locals {
  # Normalize once, use everywhere
  normalized_log_level = lower(var.log_level)

  # Set verbosity flag based on log level
  verbose = contains(["debug", "trace"], local.normalized_log_level)

  # Map to numeric log level
  log_level_num = {
    "trace" = 0
    "debug" = 1
    "info"  = 2
    "warn"  = 3
    "error" = 4
  }[local.normalized_log_level]
}
```

## lower vs title vs upper

Here is a quick comparison of the three case-changing functions.

```hcl
locals {
  input = "hello World"

  lowered = lower(local.input)  # "hello world"
  uppered = upper(local.input)  # "HELLO WORLD"
  titled  = title(local.input)  # "Hello World"
}
```

Each has its place. Use `lower` for identifiers and resource names, `upper` for constants and some cloud resource properties, and `title` for display purposes.

## Summary

The `lower` function is one of the most frequently used string functions in Terraform. It ensures consistent casing for resource names, enables case-insensitive comparisons, and normalizes user input. Whenever you accept string input from variables or data sources that might have inconsistent casing, run it through `lower` early and use the normalized version throughout your configuration.
