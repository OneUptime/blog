# How to Use the startswith Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the startswith function in Terraform to check if a string begins with a specific prefix, with practical examples for validation, filtering, and routing.

---

Checking whether a string starts with a particular prefix is a common need in Terraform. Validating that ARNs belong to the right service, filtering resources by naming convention, routing configuration based on environment prefixes - the `startswith` function handles all of these cleanly. It was introduced in Terraform 1.5 alongside `endswith` and `strcontains`.

## What Does startswith Do?

The `startswith` function takes two arguments: a string and a prefix. It returns `true` if the string begins with that prefix, `false` otherwise. The check is case-sensitive.

```hcl
# Basic syntax
startswith(string, prefix)
```

## Basic Examples

```hcl
# Check if a string starts with a prefix
> startswith("terraform-project", "terraform")
true

> startswith("terraform-project", "ansible")
false

# Case-sensitive
> startswith("Terraform", "terraform")
false

# Empty prefix always returns true
> startswith("anything", "")
true

# Exact match
> startswith("hello", "hello")
true

# Prefix longer than string
> startswith("hi", "hello")
false
```

## Validating ARNs

One of the most useful applications is validating that ARNs belong to the expected AWS service.

```hcl
variable "lambda_arn" {
  description = "ARN of the Lambda function"
  type        = string

  validation {
    condition     = startswith(var.lambda_arn, "arn:aws:lambda:")
    error_message = "Must be a valid Lambda function ARN starting with 'arn:aws:lambda:'."
  }
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  type        = string

  validation {
    condition     = startswith(var.s3_bucket_arn, "arn:aws:s3:::")
    error_message = "Must be a valid S3 bucket ARN starting with 'arn:aws:s3:::'."
  }
}

variable "iam_role_arn" {
  description = "ARN of the IAM role"
  type        = string

  validation {
    condition     = startswith(var.iam_role_arn, "arn:aws:iam::")
    error_message = "Must be a valid IAM role ARN."
  }
}
```

## Filtering Resources by Name Prefix

Use `startswith` in `for` expressions to filter lists.

```hcl
variable "all_subnets" {
  type = list(string)
  default = [
    "public-subnet-1",
    "public-subnet-2",
    "private-subnet-1",
    "private-subnet-2",
    "database-subnet-1",
    "database-subnet-2"
  ]
}

locals {
  public_subnets = [
    for s in var.all_subnets : s
    if startswith(s, "public-")
  ]
  # Result: ["public-subnet-1", "public-subnet-2"]

  private_subnets = [
    for s in var.all_subnets : s
    if startswith(s, "private-")
  ]
  # Result: ["private-subnet-1", "private-subnet-2"]

  database_subnets = [
    for s in var.all_subnets : s
    if startswith(s, "database-")
  ]
  # Result: ["database-subnet-1", "database-subnet-2"]
}
```

## Environment Detection

Determine the environment from resource names or other identifiers.

```hcl
variable "workspace_name" {
  description = "Terraform workspace name"
  type        = string
  default     = "prod-us-east-1"
}

locals {
  is_production  = startswith(var.workspace_name, "prod")
  is_staging     = startswith(var.workspace_name, "staging")
  is_development = startswith(var.workspace_name, "dev")

  # Set instance sizing based on environment
  instance_type = (
    local.is_production ? "m5.xlarge" :
    local.is_staging ? "t3.large" :
    "t3.micro"
  )

  # Enable enhanced monitoring in production
  enhanced_monitoring = local.is_production
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.instance_type

  monitoring = local.enhanced_monitoring

  tags = {
    Environment = (
      local.is_production ? "production" :
      local.is_staging ? "staging" :
      "development"
    )
  }
}
```

## Validating Input Patterns

Use `startswith` for input validation where full regex would be overkill.

```hcl
variable "s3_path" {
  description = "S3 object path"
  type        = string

  validation {
    condition     = !startswith(var.s3_path, "/")
    error_message = "S3 path must not start with a leading slash."
  }

  validation {
    condition     = !startswith(var.s3_path, "s3://")
    error_message = "Provide just the key path, not the full S3 URI."
  }
}

variable "docker_image" {
  description = "Docker image reference"
  type        = string

  validation {
    condition = (
      startswith(var.docker_image, "docker.io/") ||
      startswith(var.docker_image, "gcr.io/") ||
      startswith(var.docker_image, "ghcr.io/") ||
      startswith(var.docker_image, "public.ecr.aws/")
    )
    error_message = "Docker image must be from an approved registry."
  }
}
```

## Routing Based on Prefix

Direct resources to different configurations based on their name prefix.

```hcl
variable "service_endpoints" {
  type = map(string)
  default = {
    "internal-api"     = "10.0.1.10"
    "internal-auth"    = "10.0.1.11"
    "external-web"     = "203.0.113.10"
    "external-cdn"     = "203.0.113.20"
  }
}

locals {
  # Separate internal and external endpoints
  internal_endpoints = {
    for name, ip in var.service_endpoints : name => ip
    if startswith(name, "internal-")
  }

  external_endpoints = {
    for name, ip in var.service_endpoints : name => ip
    if startswith(name, "external-")
  }
}

# Create internal DNS records in a private zone
resource "aws_route53_record" "internal" {
  for_each = local.internal_endpoints

  zone_id = aws_route53_zone.private.zone_id
  name    = each.key
  type    = "A"
  ttl     = 60
  records = [each.value]
}

# Create external DNS records in a public zone
resource "aws_route53_record" "external" {
  for_each = local.external_endpoints

  zone_id = aws_route53_zone.public.zone_id
  name    = each.key
  type    = "A"
  ttl     = 300
  records = [each.value]
}
```

## Combining startswith with endswith

These two functions pair naturally for pattern matching.

```hcl
variable "resource_identifier" {
  type    = string
  default = "arn:aws:s3:::my-bucket-prod"
}

locals {
  # Check both prefix and suffix
  is_prod_s3 = startswith(var.resource_identifier, "arn:aws:s3") && endswith(var.resource_identifier, "-prod")

  is_staging_lambda = (
    startswith(var.resource_identifier, "arn:aws:lambda") &&
    endswith(var.resource_identifier, "-staging")
  )
}
```

For more on suffix matching, see [how to use endswith](https://oneuptime.com/blog/post/2026-02-23-how-to-use-endswith-function-in-terraform/view).

## Case-Insensitive Prefix Check

Since `startswith` is case-sensitive, normalize case first if needed.

```hcl
variable "protocol" {
  default = "HTTPS"
}

locals {
  # Case-insensitive check
  is_secure = startswith(lower(var.protocol), "https")
  # true - works regardless of input casing
}
```

## Processing Tags

Filter tags based on key prefixes.

```hcl
variable "all_tags" {
  type = map(string)
  default = {
    "aws:cloudformation:stack-name" = "my-stack"
    "aws:cloudformation:stack-id"   = "stack-123"
    "app:name"                      = "myapp"
    "app:version"                   = "2.1.0"
    "cost:center"                   = "engineering"
    "cost:project"                  = "platform"
  }
}

locals {
  # Filter out AWS-managed tags
  custom_tags = {
    for key, value in var.all_tags : key => value
    if !startswith(key, "aws:")
  }
  # Result: { "app:name" = "myapp", "app:version" = "2.1.0", ... }

  # Get only app tags
  app_tags = {
    for key, value in var.all_tags : key => value
    if startswith(key, "app:")
  }
}
```

## Summary

The `startswith` function is a clean, readable way to check string prefixes in Terraform. It shines in variable validation (ensuring ARNs match expected services), resource filtering (separating internal from external endpoints), and conditional logic (determining environment from naming conventions). Pair it with `endswith` for matching both ends of a string, and with `lower` for case-insensitive checks.
