# How to Use the trimsuffix Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the trimsuffix function in Terraform to remove a specific suffix from the end of a string, with practical examples for file extensions, domains, and paths.

---

The `trimsuffix` function in Terraform removes a specific suffix from the end of a string. If the string does not end with that suffix, it comes back unchanged. This is the mirror image of `trimprefix` and is incredibly useful for stripping file extensions, removing trailing slashes, cleaning up domain names, and more.

## What Does trimsuffix Do?

The `trimsuffix` function takes a string and a suffix to remove. If the string ends with the suffix, it is stripped. Otherwise, the string is returned as-is.

```hcl
# Basic syntax
trimsuffix(string, suffix)
```

## Basic Examples

```hcl
# Remove a suffix
> trimsuffix("helloworld", "world")
"hello"

# Suffix not found - string returned unchanged
> trimsuffix("helloworld", "planet")
"helloworld"

# Remove file extension
> trimsuffix("config.json", ".json")
"config"

# Only removes from the end
> trimsuffix("world-hello-world", "world")
"world-hello-"

# Case-sensitive
> trimsuffix("HelloWorld", "WORLD")
"HelloWorld"

# Empty suffix - no change
> trimsuffix("hello", "")
"hello"
```

## Removing File Extensions

This is one of the most common use cases for `trimsuffix`.

```hcl
variable "template_files" {
  type = list(string)
  default = [
    "nginx.conf.tpl",
    "app.env.tpl",
    "docker-compose.yaml.tpl"
  ]
}

locals {
  # Generate output filenames by removing the .tpl extension
  output_files = [
    for f in var.template_files :
    trimsuffix(f, ".tpl")
  ]
  # Result: ["nginx.conf", "app.env", "docker-compose.yaml"]
}

# Render templates and write to files
resource "local_file" "configs" {
  for_each = {
    for f in var.template_files :
    trimsuffix(f, ".tpl") => f
  }

  filename = "${path.module}/output/${each.key}"
  content  = templatefile("${path.module}/templates/${each.value}", {
    environment = "production"
  })
}
```

## Removing Trailing Slashes

APIs and paths sometimes come with trailing slashes that need to be removed.

```hcl
variable "api_endpoint" {
  description = "API base URL"
  type        = string
  default     = "https://api.example.com/v2/"
}

locals {
  # Remove trailing slash for consistent URL construction
  base_url = trimsuffix(var.api_endpoint, "/")
  # Result: "https://api.example.com/v2"

  # Now appending paths works correctly
  users_url  = "${local.base_url}/users"
  orders_url = "${local.base_url}/orders"
  # "https://api.example.com/v2/users" (no double slash)
}
```

## Stripping Domain Suffixes

Extract subdomains or hostnames by removing the domain suffix.

```hcl
variable "fqdns" {
  type = list(string)
  default = [
    "api.example.com",
    "web.example.com",
    "admin.example.com",
    "grafana.example.com"
  ]
}

variable "domain" {
  default = ".example.com"
}

locals {
  # Extract just the hostname part
  hostnames = [
    for fqdn in var.fqdns :
    trimsuffix(fqdn, var.domain)
  ]
  # Result: ["api", "web", "admin", "grafana"]
}
```

## Cleaning Up DNS Zone Names

Route53 zone names often have a trailing dot that needs to be removed for other uses.

```hcl
data "aws_route53_zone" "main" {
  name = "example.com."
}

locals {
  # Route53 returns zone names with a trailing dot
  zone_name_raw = data.aws_route53_zone.main.name
  # "example.com."

  # Remove the trailing dot for use in resource names
  zone_name = trimsuffix(local.zone_name_raw, ".")
  # "example.com"
}

resource "aws_acm_certificate" "main" {
  domain_name       = local.zone_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${local.zone_name}"
  ]
}
```

## Processing Container Image Tags

Strip image tags or digests to get the base image name.

```hcl
variable "images" {
  type = list(string)
  default = [
    "nginx:latest",
    "redis:7.0",
    "postgres:15-alpine"
  ]
}

locals {
  # This approach uses split, but for known suffixes trimsuffix works well
  # Remove ":latest" from images that use the latest tag
  images_without_latest = [
    for img in var.images :
    trimsuffix(img, ":latest")
  ]
  # Result: ["nginx", "redis:7.0", "postgres:15-alpine"]
  # Only the ":latest" suffix was removed
}
```

## Removing Environment Suffixes

Strip environment-specific suffixes to get base resource names.

```hcl
variable "resource_names" {
  type = list(string)
  default = [
    "web-server-prod",
    "api-server-prod",
    "worker-prod",
    "scheduler-prod"
  ]
}

locals {
  base_names = [
    for name in var.resource_names :
    trimsuffix(name, "-prod")
  ]
  # Result: ["web-server", "api-server", "worker", "scheduler"]

  # Rebuild with a different environment suffix
  staging_names = [
    for name in local.base_names :
    "${name}-staging"
  ]
  # Result: ["web-server-staging", "api-server-staging", ...]
}
```

## Variable Validation

Ensure that input values do not contain unwanted suffixes.

```hcl
variable "bucket_name" {
  description = "S3 bucket name"
  type        = string

  validation {
    condition     = var.bucket_name == trimsuffix(var.bucket_name, "/")
    error_message = "Bucket name must not end with a slash."
  }

  validation {
    condition     = var.bucket_name == trimsuffix(var.bucket_name, "-")
    error_message = "Bucket name must not end with a hyphen."
  }
}
```

## Chaining trimsuffix Calls

You can nest `trimsuffix` calls to try removing multiple possible suffixes.

```hcl
variable "hostname" {
  default = "myserver.internal.local"
}

locals {
  # Try removing different domain suffixes
  short_name = trimsuffix(
    trimsuffix(
      trimsuffix(var.hostname, ".internal.local"),
      ".internal"
    ),
    ".local"
  )
  # Result: "myserver"
}
```

The function simply returns the string unchanged if the suffix does not match, so chaining is safe.

## Combining trimsuffix with trimsuffix in for Expressions

Process lists where items might have different suffixes.

```hcl
variable "config_files" {
  type = list(string)
  default = [
    "app.conf.bak",
    "db.conf.bak",
    "nginx.conf",
    "redis.conf.bak"
  ]
}

locals {
  # Remove .bak suffix where present
  active_configs = [
    for f in var.config_files :
    trimsuffix(f, ".bak")
  ]
  # Result: ["app.conf", "db.conf", "nginx.conf", "redis.conf"]
}
```

## trimsuffix with endswith for Conditional Processing

Sometimes you want to do different things depending on the suffix.

```hcl
variable "files" {
  type = list(string)
  default = [
    "data.json",
    "config.yaml",
    "template.tpl",
    "readme.md"
  ]
}

locals {
  processed = {
    for f in var.files :
    trimsuffix(trimsuffix(trimsuffix(trimsuffix(f, ".json"), ".yaml"), ".tpl"), ".md") => {
      original  = f
      extension = endswith(f, ".json") ? "json" : endswith(f, ".yaml") ? "yaml" : endswith(f, ".tpl") ? "tpl" : "md"
      type      = endswith(f, ".json") ? "data" : endswith(f, ".yaml") ? "config" : endswith(f, ".tpl") ? "template" : "docs"
    }
  }
}
```

## Summary

The `trimsuffix` function is the counterpart to [trimprefix](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trimprefix-function-in-terraform/view) and handles the common task of stripping known endings from strings. Whether you are removing file extensions, trailing slashes, domain suffixes, or environment labels, it does the job simply and safely. Since it returns the string unchanged when the suffix is not found, you can use it without worrying about conditional checks.
