# How to Use the basename and dirname Functions in OpenTofu - Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Function, Filesystem

Description: Learn how to use the basename and dirname functions in OpenTofu to extract the filename and directory components of file paths.

## Overview

OpenTofu provides two complementary path manipulation functions:

- `basename(path)` - returns the final component of a path (the filename)
- `dirname(path)` - returns the directory portion of a path (everything before the last component)

These are useful when working with file paths that come from variables, data sources, or computed values.

## basename

`basename` strips all directory components and returns only the file name.

```hcl
locals {
  full_path   = "/var/app/releases/v2.1.0/app.tar.gz"

  # Extract just the filename
  filename    = basename(local.full_path)
  # Result: "app.tar.gz"
}

output "artifact_filename" {
  value = local.filename
}
```

## dirname

`dirname` returns everything except the final component of the path.

```hcl
locals {
  full_path = "/var/app/releases/v2.1.0/app.tar.gz"

  # Extract the directory portion
  directory = dirname(local.full_path)
  # Result: "/var/app/releases/v2.1.0"
}
```

## Practical Example: Uploading Files to S3 with Organized Keys

```hcl
variable "artifact_path" {
  type        = string
  description = "Full local path to the artifact file"
  default     = "/ci/builds/2026-03-20/my-app-v1.2.3.zip"
}

locals {
  # Extract the filename to use as the S3 object key
  artifact_name = basename(var.artifact_path)

  # Extract the version directory name
  version_dir   = basename(dirname(var.artifact_path))
}

resource "aws_s3_object" "artifact" {
  bucket = aws_s3_bucket.artifacts.bucket

  # Organize uploads by version: releases/2026-03-20/my-app-v1.2.3.zip
  key    = "releases/${local.version_dir}/${local.artifact_name}"
  source = var.artifact_path
  etag   = filemd5(var.artifact_path)
}
```

## Working with Module Paths

```hcl
locals {
  # Get the module directory name (useful for naming resources after the module)
  module_name = basename(path.module)

  # Get the parent directory of the module
  parent_dir  = dirname(path.module)
}

output "module_info" {
  value = {
    module_name = local.module_name
    parent_dir  = local.parent_dir
  }
}
```

## Processing a List of File Paths

```hcl
variable "config_files" {
  type    = list(string)
  default = [
    "/configs/prod/database.yaml",
    "/configs/prod/cache.yaml",
    "/configs/prod/app.yaml",
  ]
}

locals {
  # Extract just the filenames from a list of paths
  config_filenames = [for path in var.config_files : basename(path)]
  # Result: ["database.yaml", "cache.yaml", "app.yaml"]
}

resource "aws_s3_object" "configs" {
  for_each = zipmap(local.config_filenames, var.config_files)

  bucket = aws_s3_bucket.config.bucket
  key    = "config/${each.key}"
  source = each.value
}
```

## Important Notes

- `basename` and `dirname` are platform-aware: on Unix they use forward slashes (`/`), and on Windows they use backslashes (`\`). Avoid relying on a specific separator if your modules run on multiple operating systems.
- `dirname` on a path with no directory component (e.g., just a filename) returns `"."`.
- `basename` strips trailing slashes before returning the last component, so `basename("/foo/bar/")` returns `"bar"` rather than an empty string.
- These functions perform pure string manipulation; they do not check whether the path exists on disk.

## Conclusion

The `basename` and `dirname` functions provide simple path manipulation for extracting filename and directory components from string paths. They are most useful when computing S3 keys, resource names, or any situation where you need to split a path into its constituent parts.
