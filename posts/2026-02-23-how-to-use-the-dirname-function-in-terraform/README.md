# How to Use the dirname Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, dirname Function, File System, HCL, Infrastructure as Code, Path Manipulation

Description: Learn how to use the dirname function in Terraform to extract the directory portion from a file path for building dynamic and portable infrastructure configurations.

---

The `dirname` function extracts the directory portion of a file path, stripping away the filename at the end. If you have ever needed to determine which directory a file lives in, construct relative paths, or build directory structures from file listings, `dirname` is the right tool.

## What Is the dirname Function?

The `dirname` function takes a string containing a file path and returns everything except the last path component (the filename):

```hcl
# dirname(path)
# Returns the directory portion of a path
dirname("/etc/nginx/nginx.conf")    # Returns: "/etc/nginx"
dirname("configs/app/settings.yaml") # Returns: "configs/app"
dirname("file.txt")                  # Returns: "."
```

It works like the Unix `dirname` command and follows the same conventions.

## Exploring in terraform console

```hcl
# Launch with: terraform console

# Absolute paths
> dirname("/usr/local/bin/terraform")
"/usr/local/bin"

> dirname("/var/log/app.log")
"/var/log"

# Relative paths
> dirname("configs/production/app.yaml")
"configs/production"

> dirname("scripts/deploy.sh")
"scripts"

# File in current directory
> dirname("README.md")
"."

# Trailing slash behavior
> dirname("/var/log/")
"/var/log"

# Path with only the root
> dirname("/file.txt")
"/"

# Nested directories
> dirname("a/b/c/d/e/file.txt")
"a/b/c/d/e"
```

## Extracting Module Directories from File Paths

When you discover files using `fileset`, `dirname` helps you figure out which directory each file belongs to:

```hcl
locals {
  # Find all handler.py files in the functions directory
  lambda_handlers = fileset("${path.module}/functions", "*/handler.py")
  # Result: ["api/handler.py", "processor/handler.py", "notifier/handler.py"]

  # Extract the function names (directory names)
  function_names = distinct([
    for handler in local.lambda_handlers :
    dirname(handler)
  ])
  # Result: ["api", "processor", "notifier"]
}

resource "aws_lambda_function" "functions" {
  for_each = toset(local.function_names)

  function_name = each.value
  role          = aws_iam_role.lambda.arn
  handler       = "handler.main"
  runtime       = "python3.9"

  filename         = "${path.module}/functions/${each.value}/handler.zip"
  source_code_hash = filebase64sha256("${path.module}/functions/${each.value}/handler.zip")
}
```

## Building Directory Structures for S3

When uploading files to S3, `dirname` helps maintain the directory structure:

```hcl
locals {
  files = fileset("${path.module}/content", "**/*")

  # Get unique directories from the file paths
  directories = distinct([
    for f in local.files :
    dirname(f)
  ])
}

output "directory_structure" {
  value = local.directories
  # Output: [".", "images", "css", "js", "docs", "docs/api"]
}
```

## Constructing Relative Paths

When you need to reference files relative to other files:

```hcl
variable "config_file" {
  type    = string
  default = "environments/production/app.yaml"
}

locals {
  # Get the directory containing the config file
  config_dir = dirname(var.config_file)
  # Result: "environments/production"

  # Construct paths to sibling files in the same directory
  db_config    = "${local.config_dir}/database.yaml"
  cache_config = "${local.config_dir}/cache.yaml"
  secrets_file = "${local.config_dir}/secrets.yaml"
}

output "config_paths" {
  value = {
    app      = var.config_file
    database = local.db_config
    cache    = local.cache_config
    secrets  = local.secrets_file
  }
}
```

## Organizing Terraform State by Directory

When managing multiple configurations, `dirname` helps organize outputs:

```hcl
variable "state_files" {
  type = list(string)
  default = [
    "infrastructure/networking/terraform.tfstate",
    "infrastructure/compute/terraform.tfstate",
    "infrastructure/database/terraform.tfstate",
    "applications/web/terraform.tfstate",
    "applications/api/terraform.tfstate",
  ]
}

locals {
  # Group state files by their parent directory
  state_by_category = {
    for f in var.state_files :
    dirname(dirname(f)) => f...
  }
  # Result: {
  #   "infrastructure" = ["infrastructure/networking/terraform.tfstate", ...]
  #   "applications" = ["applications/web/terraform.tfstate", ...]
  # }
}

output "state_organization" {
  value = local.state_by_category
}
```

## Processing Configuration Files by Directory

Group and process files based on their parent directory:

```hcl
locals {
  all_configs = fileset("${path.module}/services", "**/config.yaml")
  # Example: ["web/config.yaml", "api/config.yaml", "worker/config.yaml"]

  service_configs = {
    for config in local.all_configs :
    dirname(config) => yamldecode(file("${path.module}/services/${config}"))
  }
  # Result: { "web" = {...}, "api" = {...}, "worker" = {...} }
}

output "services" {
  value = keys(local.service_configs)
}
```

## Creating Directory-Based Resource Names

Generate resource names based on directory hierarchy:

```hcl
variable "resource_path" {
  type    = string
  default = "services/production/us-east-1/web-api"
}

locals {
  # Extract each level of the path
  resource_name = basename(var.resource_path)        # "web-api"
  region        = basename(dirname(var.resource_path))  # "us-east-1"
  environment   = basename(dirname(dirname(var.resource_path)))  # "production"
  category      = basename(dirname(dirname(dirname(var.resource_path))))  # "services"
}

output "path_components" {
  value = {
    category    = local.category
    environment = local.environment
    region      = local.region
    resource    = local.resource_name
  }
}
```

## Building Parent Directory References

When a module needs to reference files in its parent directory:

```hcl
# modules/app/main.tf

locals {
  # Get the parent directory of this module
  module_dir = path.module
  parent_dir = dirname(path.module)

  # Reference shared configurations in the parent
  shared_config_path = "${local.parent_dir}/shared/common.yaml"
}

output "paths" {
  value = {
    module_dir  = local.module_dir
    parent_dir  = local.parent_dir
    shared_path = local.shared_config_path
  }
}
```

## Grouping Files by Directory for Batch Processing

```hcl
locals {
  all_files = fileset("${path.module}/data", "**/*.json")

  # Group files by their immediate parent directory
  files_by_dir = {
    for f in local.all_files :
    dirname(f) => f...
  }
}

# Process each directory as a batch
resource "null_resource" "process_batch" {
  for_each = local.files_by_dir

  triggers = {
    files = join(",", each.value)
  }

  provisioner "local-exec" {
    command = "echo 'Processing ${length(each.value)} files in directory: ${each.key}'"
  }
}
```

## dirname vs basename

These two functions are complementary:

```hcl
locals {
  path = "environments/production/configs/app.yaml"

  # dirname strips the last component (filename)
  dir = dirname(local.path)
  # Result: "environments/production/configs"

  # basename strips the directory, keeping only the filename
  name = basename(local.path)
  # Result: "app.yaml"

  # Together they decompose a path into directory + filename
  reconstructed = "${local.dir}/${local.name}"
  # Result: "environments/production/configs/app.yaml"
}
```

## Working with Nested dirname Calls

You can nest `dirname` calls to walk up the directory tree:

```hcl
locals {
  full_path = "/opt/apps/myapp/v2.1/config/app.yaml"

  level_0 = full_path                       # /opt/apps/myapp/v2.1/config/app.yaml
  level_1 = dirname(local.full_path)        # /opt/apps/myapp/v2.1/config
  level_2 = dirname(local.level_1)          # /opt/apps/myapp/v2.1
  level_3 = dirname(local.level_2)          # /opt/apps/myapp
  level_4 = dirname(local.level_3)          # /opt/apps
  level_5 = dirname(local.level_4)          # /opt
}
```

## Important Notes

```hcl
# dirname works purely on strings - it does not check if the path exists
# It simply strips the last path component

# dirname of a path with no slashes returns "."
> dirname("file.txt")
"."

# dirname handles both forward and back slashes
# but always returns forward slashes

# dirname does not normalize paths
# dirname("a/b/../c/file.txt") returns "a/b/../c"
# The ".." is preserved as-is

# dirname is evaluated at plan time
# No filesystem access is required
```

## Summary

The `dirname` function extracts the directory portion of a file path by removing the last component. It is invaluable for working with `fileset` results, constructing sibling file paths, organizing resources by directory hierarchy, and building dynamic module configurations. Pair it with `basename` for complete path decomposition, and chain multiple `dirname` calls to walk up directory trees. Remember that it operates purely on strings and does not check whether the path actually exists on the filesystem.

For the complementary function, see our post on the [basename function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-basename-function-in-terraform/view).
