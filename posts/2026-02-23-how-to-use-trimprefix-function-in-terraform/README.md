# How to Use the trimprefix Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the trimprefix function in Terraform to remove a specific prefix from the beginning of a string, with practical examples for ARNs, URLs, and paths.

---

When working with cloud resource identifiers, URLs, or file paths in Terraform, you often need to strip a known prefix from a string to extract the meaningful part. The `trimprefix` function does exactly this - it removes a specified prefix from the start of a string, leaving the rest intact.

## What Does trimprefix Do?

The `trimprefix` function removes a word from the start of a string. If the string does not start with the given prefix, it is returned unchanged.

```hcl
# Basic syntax
trimprefix(string, prefix)
```

This is different from `trim`, which removes individual characters. `trimprefix` removes an exact substring from the beginning.

## Basic Examples

```hcl
# Remove a prefix
> trimprefix("helloworld", "hello")
"world"

# Prefix not found - string returned unchanged
> trimprefix("helloworld", "goodbye")
"helloworld"

# Remove a URL protocol
> trimprefix("https://example.com", "https://")
"example.com"

# Only removes from the start, not the middle
> trimprefix("hello-hello-world", "hello-")
"hello-world"

# Case-sensitive
> trimprefix("HelloWorld", "hello")
"HelloWorld"

# Empty prefix - no change
> trimprefix("hello", "")
"hello"
```

## Extracting Resource Names from ARNs

AWS ARNs follow a predictable structure. You can strip the prefix to get the resource name.

```hcl
locals {
  lambda_arn = "arn:aws:lambda:us-east-1:123456789012:function:my-processor"

  # Extract just the function name
  function_name = trimprefix(
    local.lambda_arn,
    "arn:aws:lambda:us-east-1:123456789012:function:"
  )
  # Result: "my-processor"
}

# More dynamic approach with format
variable "account_id" {
  default = "123456789012"
}

variable "region" {
  default = "us-east-1"
}

locals {
  role_arn = "arn:aws:iam::123456789012:role/deployment-role"

  role_name = trimprefix(
    local.role_arn,
    format("arn:aws:iam::%s:role/", var.account_id)
  )
  # Result: "deployment-role"
}
```

## Removing URL Protocols

Strip protocol prefixes to get bare hostnames.

```hcl
variable "endpoints" {
  type = map(string)
  default = {
    api     = "https://api.example.com"
    website = "https://www.example.com"
    docs    = "http://docs.example.com"
  }
}

locals {
  # Remove https:// or http:// prefixes
  hostnames = {
    for name, url in var.endpoints :
    name => trimprefix(trimprefix(url, "https://"), "http://")
  }
  # {
  #   api     = "api.example.com"
  #   website = "www.example.com"
  #   docs    = "docs.example.com"
  # }
}
```

Notice the nested `trimprefix` calls - first try removing `https://`, then try `http://`. Since `trimprefix` returns the string unchanged when the prefix is not found, this works cleanly.

## Stripping Path Prefixes

Remove base paths from file paths to get relative paths.

```hcl
variable "config_files" {
  type    = list(string)
  default = [
    "/opt/app/config/database.yaml",
    "/opt/app/config/cache.yaml",
    "/opt/app/config/logging.yaml"
  ]
}

locals {
  # Get just the filenames relative to the config directory
  relative_paths = [
    for path in var.config_files :
    trimprefix(path, "/opt/app/config/")
  ]
  # Result: ["database.yaml", "cache.yaml", "logging.yaml"]
}
```

## Cleaning Up S3 Keys

When working with S3 objects, you often need to remove key prefixes.

```hcl
variable "s3_objects" {
  type = list(string)
  default = [
    "data/raw/2026/01/file1.csv",
    "data/raw/2026/01/file2.csv",
    "data/raw/2026/02/file3.csv"
  ]
}

locals {
  # Remove the common prefix to get relative keys
  relative_keys = [
    for key in var.s3_objects :
    trimprefix(key, "data/raw/")
  ]
  # Result: ["2026/01/file1.csv", "2026/01/file2.csv", "2026/02/file3.csv"]
}
```

## Removing Environment Prefixes from Names

Strip environment prefixes when you need the base resource name.

```hcl
variable "tagged_resources" {
  type = list(string)
  default = [
    "prod-web-server-01",
    "prod-api-server-01",
    "prod-db-server-01"
  ]
}

variable "environment" {
  default = "prod"
}

locals {
  # Remove the environment prefix to get base names
  base_names = [
    for name in var.tagged_resources :
    trimprefix(name, "${var.environment}-")
  ]
  # Result: ["web-server-01", "api-server-01", "db-server-01"]
}
```

## Variable Validation

Ensure variables do not contain unwanted prefixes.

```hcl
variable "database_name" {
  description = "Database name without the db- prefix"
  type        = string

  validation {
    condition     = var.database_name == trimprefix(var.database_name, "db-")
    error_message = "Do not include the 'db-' prefix. Just provide the database name."
  }
}

variable "s3_path" {
  description = "S3 path without leading slash"
  type        = string

  validation {
    condition     = var.s3_path == trimprefix(var.s3_path, "/")
    error_message = "S3 path must not start with a leading slash."
  }
}
```

## Docker Image Name Processing

Extract image names from fully qualified container registry URLs.

```hcl
variable "container_images" {
  type = list(string)
  default = [
    "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
    "123456789012.dkr.ecr.us-east-1.amazonaws.com/worker:v2.1",
    "123456789012.dkr.ecr.us-east-1.amazonaws.com/cron:v1.5"
  ]
}

variable "ecr_registry" {
  default = "123456789012.dkr.ecr.us-east-1.amazonaws.com/"
}

locals {
  # Extract image:tag from full ECR URLs
  image_tags = [
    for image in var.container_images :
    trimprefix(image, var.ecr_registry)
  ]
  # Result: ["myapp:latest", "worker:v2.1", "cron:v1.5"]
}
```

## Conditional Prefix Removal

Combine `trimprefix` with conditions for more complex processing.

```hcl
variable "resource_ids" {
  type = list(string)
  default = [
    "sg-0123456789abcdef0",
    "vpc-0fedcba9876543210",
    "subnet-0abcdef1234567890",
    "igw-0111222333444555"
  ]
}

locals {
  # Remove AWS resource type prefixes
  prefixes = ["sg-", "vpc-", "subnet-", "igw-", "eni-", "rtb-"]

  # Strip the first matching prefix from each ID
  clean_ids = [
    for id in var.resource_ids : [
      for prefix in local.prefixes :
      trimprefix(id, prefix)
      if trimprefix(id, prefix) != id
    ][0]
  ]
  # Result: ["0123456789abcdef0", "0fedcba9876543210", ...]
}
```

## trimprefix vs trimsuffix vs trim

Use the right function for each job:

```hcl
locals {
  arn = "arn:aws:s3:::my-bucket/data/file.txt"

  # trimprefix: remove exact string from the beginning
  after_prefix = trimprefix(local.arn, "arn:aws:s3:::")
  # "my-bucket/data/file.txt"

  # trimsuffix: remove exact string from the end
  without_ext = trimsuffix("file.txt", ".txt")
  # "file"

  # trim: remove individual characters from both ends
  cleaned = trim("///path///", "/")
  # "path"
}
```

`trimprefix` and `trimsuffix` work with substrings (exact sequences). `trim` works with character sets (any individual character).

## Summary

The `trimprefix` function is essential for extracting meaningful parts from strings with known prefixes. It comes up constantly when parsing ARNs, URLs, file paths, and resource names. The function is safe to use even when the prefix might not be present, since it simply returns the original string unchanged. For removing suffixes, see [trimsuffix](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trimsuffix-function-in-terraform/view).
