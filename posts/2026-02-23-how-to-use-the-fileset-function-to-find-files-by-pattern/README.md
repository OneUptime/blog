# How to Use the fileset Function to Find Files by Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, fileset Function, File System, HCL, Infrastructure as Code, Glob Patterns

Description: Learn how to use the fileset function in Terraform to find files matching a glob pattern and use them for dynamic resource creation like S3 uploads and config management.

---

The `fileset` function in Terraform finds all files in a directory that match a given glob pattern. Instead of manually listing every file you want to upload, configure, or process, `fileset` discovers them automatically. This makes your configurations dynamic and self-updating as files are added or removed.

## What Is the fileset Function?

The `fileset` function takes a base directory path and a glob pattern, then returns a set of file paths (relative to the base directory) that match:

```hcl
# fileset(base_path, pattern)
# Returns a set of relative file paths matching the pattern
fileset("${path.module}/configs", "*.conf")
# Might return: ["app.conf", "nginx.conf", "redis.conf"]
```

The returned paths are relative to the base directory, not absolute paths.

## Glob Pattern Syntax

Before diving into examples, let's review the patterns `fileset` supports:

```hcl
# * matches any sequence of characters within a single directory
fileset(path.module, "*.tf")              # All .tf files in root
fileset(path.module, "scripts/*.sh")      # All .sh files in scripts/

# ** matches across directory boundaries
fileset(path.module, "**/*.json")         # All .json files, any depth

# ? matches a single character
fileset(path.module, "config-?.yaml")     # config-a.yaml, config-b.yaml, etc.

# {a,b} matches either a or b
fileset(path.module, "*.{json,yaml}")     # All .json and .yaml files

# [abc] matches any single character in the set
fileset(path.module, "log-[0-9].txt")     # log-0.txt through log-9.txt
```

## Uploading Files to S3

The most common use of `fileset` is uploading a directory of files to S3:

```hcl
locals {
  # Find all files in the static website directory
  website_files = fileset("${path.module}/website", "**/*")

  # Map file extensions to content types
  content_types = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
  }
}

resource "aws_s3_object" "website" {
  for_each = local.website_files

  bucket = aws_s3_bucket.website.id
  key    = each.value
  source = "${path.module}/website/${each.value}"
  etag   = filemd5("${path.module}/website/${each.value}")

  # Determine content type from file extension
  content_type = lookup(
    local.content_types,
    regex("\\.[^.]+$", each.value),
    "application/octet-stream"
  )
}
```

Every time you add a file to the `website/` directory, Terraform will automatically pick it up and upload it.

## Loading Multiple Configuration Files

Read and process all configuration files in a directory:

```hcl
locals {
  # Find all JSON configuration files
  config_files = fileset("${path.module}/configs", "*.json")

  # Read and decode each configuration file
  configs = {
    for f in local.config_files :
    trimsuffix(f, ".json") => jsondecode(file("${path.module}/configs/${f}"))
  }
}

output "loaded_configs" {
  value = keys(local.configs)
  # Output: ["app", "database", "cache"] (depending on what files exist)
}
```

## Creating IAM Policies from Files

Dynamically create IAM policies based on policy files in a directory:

```hcl
locals {
  policy_files = fileset("${path.module}/iam-policies", "*.json")
}

resource "aws_iam_policy" "from_file" {
  for_each = local.policy_files

  name   = trimsuffix(each.value, ".json")
  policy = file("${path.module}/iam-policies/${each.value}")
}

output "created_policies" {
  value = {
    for name, policy in aws_iam_policy.from_file :
    name => policy.arn
  }
}
```

Add a new `.json` file to the `iam-policies/` directory and it automatically becomes a new IAM policy on the next apply.

## Deploying Lambda Functions from a Directory

```hcl
locals {
  # Each subdirectory under functions/ is a separate Lambda function
  # with its own handler.zip
  lambda_zips = fileset("${path.module}/functions", "*/handler.zip")

  # Extract function names from the paths
  lambda_functions = {
    for zip_path in local.lambda_zips :
    dirname(zip_path) => {
      zip_path = "${path.module}/functions/${zip_path}"
      name     = dirname(zip_path)
    }
  }
}

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_functions

  function_name = each.key
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "python3.9"

  filename         = each.value.zip_path
  source_code_hash = filebase64sha256(each.value.zip_path)
}
```

## Recursive File Discovery

Using the `**` pattern to find files at any depth:

```hcl
locals {
  # Find all Terraform files in the project (useful for documentation)
  all_tf_files = fileset(path.module, "**/*.tf")

  # Find all shell scripts at any depth
  all_scripts = fileset(path.module, "**/*.sh")

  # Find all YAML files under a specific directory tree
  k8s_manifests = fileset("${path.module}/kubernetes", "**/*.yaml")
}

output "file_counts" {
  value = {
    terraform_files = length(local.all_tf_files)
    shell_scripts   = length(local.all_scripts)
    k8s_manifests   = length(local.k8s_manifests)
  }
}
```

## Uploading Multiple SSL Certificates

```hcl
locals {
  # Find all certificate files
  cert_files = fileset("${path.module}/certs", "*.crt")
  key_files  = fileset("${path.module}/certs", "*.key")

  # Match certificates with their keys
  cert_pairs = {
    for cert in local.cert_files :
    trimsuffix(cert, ".crt") => {
      cert_path = "${path.module}/certs/${cert}"
      key_path  = "${path.module}/certs/${trimsuffix(cert, ".crt")}.key"
      has_key   = contains(local.key_files, "${trimsuffix(cert, ".crt")}.key")
    }
  }

  # Only process certs that have matching keys
  valid_certs = {
    for name, pair in local.cert_pairs :
    name => pair if pair.has_key
  }
}

resource "aws_acm_certificate" "imported" {
  for_each = local.valid_certs

  certificate_body = file(each.value.cert_path)
  private_key      = file(each.value.key_path)

  tags = {
    Name = each.key
  }
}
```

## Copying Configuration Templates

```hcl
locals {
  # Find all template files
  templates = fileset("${path.module}/templates", "**/*.tftpl")
}

# Render each template and upload to a config bucket
resource "aws_s3_object" "rendered_configs" {
  for_each = local.templates

  bucket = aws_s3_bucket.config.id
  key    = "configs/${trimsuffix(each.value, ".tftpl")}"

  content = templatefile(
    "${path.module}/templates/${each.value}",
    {
      environment = var.environment
      region      = var.region
      app_name    = var.app_name
    }
  )
}
```

## Combining fileset with for_each and Conditions

Filter the results of `fileset` before using them:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

locals {
  # Find all config files
  all_configs = fileset("${path.module}/configs", "**/*.yaml")

  # Filter out test configs in production
  active_configs = var.environment == "production" ? (
    toset([for f in local.all_configs : f if !startswith(f, "test-")])
  ) : local.all_configs
}

resource "aws_s3_object" "configs" {
  for_each = local.active_configs

  bucket  = aws_s3_bucket.config.id
  key     = "configs/${each.value}"
  content = file("${path.module}/configs/${each.value}")
}
```

## Managing CloudWatch Dashboards

Load dashboard definitions from files:

```hcl
locals {
  dashboard_files = fileset("${path.module}/dashboards", "*.json")
}

resource "aws_cloudwatch_dashboard" "from_file" {
  for_each = local.dashboard_files

  dashboard_name = trimsuffix(each.value, ".json")
  dashboard_body = file("${path.module}/dashboards/${each.value}")
}
```

## Important Behavior Notes

```hcl
# fileset only returns files, not directories
# An empty directory will not appear in results

# fileset evaluates at plan time
# Files must exist when you run terraform plan

# The returned paths are relative to the base directory
# fileset("/abs/path", "*.txt") returns ["file.txt"], not ["/abs/path/file.txt"]

# fileset returns a set (unordered), not a list
# If you need ordering, convert: sort(fileset(...))

# fileset does not follow symbolic links into directories
# But it does return symbolic links that match the pattern
```

## Summary

The `fileset` function is essential for building Terraform configurations that automatically adapt to the files in your project. Instead of hardcoding file lists that become stale, `fileset` discovers files matching a glob pattern and returns them as a set you can iterate over with `for_each`. Use it for S3 uploads, dynamic IAM policy creation, Lambda deployments, configuration management, and any scenario where the number of files might change over time. Combine it with `file`, `filemd5`, and `templatefile` for a complete file-handling toolkit.

For related functions, see our posts on the [file function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-file-function-to-read-local-files-in-terraform/view) and the [fileexists function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-fileexists-function-in-terraform/view).
