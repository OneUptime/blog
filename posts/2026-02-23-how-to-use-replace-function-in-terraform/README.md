# How to Use the replace Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the replace function in Terraform to substitute parts of strings using literal text or regular expressions, with practical examples for naming and cleanup.

---

String replacement is one of those operations you reach for constantly in Terraform. Replacing spaces with hyphens for resource names, swapping environment identifiers, removing unwanted characters, converting between naming conventions - the `replace` function handles all of these. It supports both literal string replacement and regular expression patterns.

## What Does replace Do?

The `replace` function searches a string for a substring (or regex pattern) and replaces all occurrences with a replacement string.

```hcl
# Basic syntax
replace(string, search, replacement)
```

If the search string is wrapped in forward slashes, it is treated as a regular expression. Otherwise, it is a literal string match.

## Basic Examples

```hcl
# Literal replacement
> replace("hello world", "world", "terraform")
"hello terraform"

# Replace all occurrences
> replace("one-two-three", "-", "_")
"one_two_three"

# Replace with empty string (deletion)
> replace("hello 123 world", "123", "")
"hello  world"

# No match - string returned unchanged
> replace("hello", "xyz", "abc")
"hello"

# Regex replacement (note the forward slashes)
> replace("hello123world", "/[0-9]+/", "-")
"hello-world"
```

## Creating Resource-Safe Names

Many cloud resources have strict naming requirements. `replace` helps you create compliant names.

```hcl
variable "project_name" {
  description = "Project name (may contain spaces)"
  type        = string
  default     = "My Web Application"
}

locals {
  # Convert to a resource-safe name
  # Step 1: Replace spaces with hyphens
  # Step 2: Convert to lowercase
  resource_name = lower(replace(var.project_name, " ", "-"))
  # Result: "my-web-application"

  # For S3 buckets (no underscores allowed)
  bucket_name = lower(replace(replace(var.project_name, " ", "-"), "_", "-"))
}

resource "aws_s3_bucket" "app" {
  bucket = "${local.bucket_name}-data"
  # Result: "my-web-application-data"
}
```

## Converting Between Naming Conventions

Switch between kebab-case, snake_case, and other conventions.

```hcl
locals {
  kebab_name = "my-web-application"

  # Kebab to snake case
  snake_name = replace(local.kebab_name, "-", "_")
  # Result: "my_web_application"

  # Snake to kebab case
  back_to_kebab = replace(local.snake_name, "_", "-")
  # Result: "my-web-application"

  # Remove all hyphens and underscores
  compact_name = replace(replace(local.kebab_name, "-", ""), "_", "")
  # Result: "mywebapplication"
}
```

## Regex Replacement

When you need pattern-based replacement, wrap the search term in forward slashes.

```hcl
locals {
  # Remove all non-alphanumeric characters
  dirty_name = "my-app_name (v2.0)!"
  clean_name = replace(local.dirty_name, "/[^a-zA-Z0-9]/", "-")
  # Result: "my-app-name--v2-0--"

  # Remove all digits
  no_digits = replace("server42-prod", "/[0-9]/", "")
  # Result: "server-prod"

  # Replace multiple consecutive hyphens with a single one
  normalized = replace("my---app---name", "/-+/", "-")
  # Result: "my-app-name"

  # Remove trailing hyphens after cleaning
  final_name = replace(
    replace("my-app (test)", "/[^a-z0-9-]/", ""),
    "/-+$/", ""
  )
}
```

## Sanitizing User Input

Clean up variable values for use in resource names.

```hcl
variable "team_name" {
  description = "Team name"
  type        = string
  default     = "Platform & Infrastructure Team"
}

locals {
  # Create a clean identifier from a team name
  team_id = lower(replace(
    replace(
      replace(var.team_name, "/[^a-zA-Z0-9 ]/", ""),  # Remove special chars
      " ", "-"                                           # Spaces to hyphens
    ),
    "/-+/", "-"  # Collapse multiple hyphens
  ))
  # Result: "platform-infrastructure-team"
}
```

## Swapping Environment References

Replace environment-specific values in configuration strings.

```hcl
variable "template_url" {
  default = "https://api-staging.example.com/v1"
}

variable "target_env" {
  default = "production"
}

locals {
  # Map environment to URL subdomain
  env_subdomain = {
    production = "api"
    staging    = "api-staging"
    dev        = "api-dev"
  }

  # Replace staging with production
  prod_url = replace(
    var.template_url,
    "api-staging",
    local.env_subdomain[var.target_env]
  )
  # Result: "https://api.example.com/v1"
}
```

## Modifying File Paths

Transform file paths for different environments or platforms.

```hcl
locals {
  # Convert Windows paths to Unix paths
  windows_path = "C:\\Users\\app\\config\\settings.ini"
  unix_path    = replace(local.windows_path, "\\", "/")
  # Result: "C:/Users/app/config/settings.ini"

  # Remove file extensions
  filename     = "report-2026-02-23.csv"
  name_no_ext  = replace(local.filename, "/\\.[^.]+$/", "")
  # Result: "report-2026-02-23"
}
```

## Building Docker Image Tags

Clean up and transform image names.

```hcl
variable "git_branch" {
  default = "feature/user-auth-v2"
}

locals {
  # Git branch names often contain characters invalid in Docker tags
  docker_tag = lower(replace(
    replace(var.git_branch, "/", "-"),  # Slashes to hyphens
    "/[^a-z0-9-]/", ""                  # Remove other invalid chars
  ))
  # Result: "feature-user-auth-v2"
}

resource "aws_ecr_repository" "app" {
  name = "myapp"
}

# Use the sanitized tag
locals {
  image_uri = "${aws_ecr_repository.app.repository_url}:${local.docker_tag}"
}
```

## Masking Sensitive Data in Outputs

Replace portions of sensitive strings for safe display.

```hcl
locals {
  api_key = "sk-1234567890abcdef"

  # Mask all but the last 4 characters
  masked_key = "${replace(substr(local.api_key, 0, length(local.api_key) - 4), "/./", "*")}${substr(local.api_key, length(local.api_key) - 4, 4)}"
  # Result: "**************cdef"
}

output "api_key_masked" {
  value = local.masked_key
}
```

## Replacing in Lists with for Expressions

Apply replacements across a list of strings.

```hcl
variable "hostnames" {
  default = [
    "web_server_01",
    "api_server_01",
    "db_server_01"
  ]
}

locals {
  # Convert all underscores to hyphens in every hostname
  normalized_hostnames = [
    for h in var.hostnames :
    replace(h, "_", "-")
  ]
  # Result: ["web-server-01", "api-server-01", "db-server-01"]
}
```

## Replacing in Maps

Process map values with replacements.

```hcl
variable "endpoints" {
  type = map(string)
  default = {
    api  = "http://localhost:8080"
    web  = "http://localhost:3000"
    docs = "http://localhost:4000"
  }
}

locals {
  # Replace localhost with actual hostname for production
  prod_endpoints = {
    for name, url in var.endpoints :
    name => replace(url, "localhost", "prod.internal.example.com")
  }
  # {
  #   api  = "http://prod.internal.example.com:8080"
  #   web  = "http://prod.internal.example.com:3000"
  #   docs = "http://prod.internal.example.com:4000"
  # }
}
```

## replace vs regex vs regexall

Here is when to use each:

```hcl
locals {
  text = "Hello World 123"

  # replace: substitute matches with new text
  replaced = replace(local.text, "/[0-9]+/", "456")
  # "Hello World 456"

  # regex: extract the first match
  matched = regex("[0-9]+", local.text)
  # "123"

  # regexall: extract all matches
  all_matched = regexall("[0-9]+", local.text)
  # ["123"]
}
```

Use `replace` to modify strings. Use [regex](https://oneuptime.com/blog/post/2026-02-23-how-to-use-regex-function-in-terraform/view) and [regexall](https://oneuptime.com/blog/post/2026-02-23-how-to-use-regexall-function-in-terraform/view) to extract patterns.

## Summary

The `replace` function is indispensable for string manipulation in Terraform. Use literal replacement for simple character swaps, and regex replacement for complex pattern matching. It is particularly valuable for creating resource-safe names, converting naming conventions, sanitizing input, and transforming configuration values between environments. Chain multiple `replace` calls together for multi-step transformations.
