# How to Use the basename Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, basename Function, File Systems, HCL, Infrastructure as Code, Path Manipulation

Description: Learn how to use the basename function in Terraform to extract the filename from a path for naming resources, processing file lists, and building clean infrastructure configurations.

---

The `basename` function extracts the last component of a file path - typically the filename. It is the complement to `dirname`, which extracts the directory portion. Together, they give you complete control over path manipulation in Terraform.

## What Is the basename Function?

The `basename` function takes a string containing a file path and returns only the last element - usually the filename:

```hcl
# basename(path)
# Returns the last component of a path
basename("/etc/nginx/nginx.conf")     # Returns: "nginx.conf"
basename("configs/app/settings.yaml") # Returns: "settings.yaml"
basename("/usr/local/bin/terraform")  # Returns: "terraform"
```

## Exploring in terraform console

```hcl
# Launch with: terraform console

# Extract filename from absolute path
> basename("/var/log/syslog")
"syslog"

> basename("/home/user/.ssh/id_rsa.pub")
"id_rsa.pub"

# Relative paths
> basename("configs/production/app.yaml")
"app.yaml"

> basename("scripts/deploy.sh")
"deploy.sh"

# File with no directory
> basename("README.md")
"README.md"

# Directory path (trailing slash)
> basename("/var/log/")
"log"

# Just a directory name
> basename("mydir")
"mydir"

# Root path
> basename("/")
"/"
```

## Naming Resources from File Paths

The most common use of `basename` is deriving resource names from file paths:

```hcl
locals {
  policy_files = fileset("${path.module}/policies", "*.json")
  # Result: ["admin-access.json", "read-only.json", "deploy-access.json"]
}

resource "aws_iam_policy" "from_file" {
  for_each = local.policy_files

  # Use basename (without extension) as the policy name
  name   = trimsuffix(basename(each.value), ".json")
  policy = file("${path.module}/policies/${each.value}")
}

# Creates policies named: admin-access, read-only, deploy-access
```

## Processing Lambda Function Packages

When deploying multiple Lambda functions from zip files:

```hcl
locals {
  lambda_zips = fileset("${path.module}/dist", "*.zip")
  # Result: ["api-handler.zip", "data-processor.zip", "event-notifier.zip"]
}

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_zips

  # Extract function name from zip filename
  function_name = trimsuffix(basename(each.value), ".zip")
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "python3.9"

  filename         = "${path.module}/dist/${each.value}"
  source_code_hash = filebase64sha256("${path.module}/dist/${each.value}")
}

output "deployed_functions" {
  value = [for f in local.lambda_zips : trimsuffix(basename(f), ".zip")]
  # Output: ["api-handler", "data-processor", "event-notifier"]
}
```

## Uploading Files with Clean S3 Keys

When uploading files to S3, you might want to flatten the directory structure:

```hcl
locals {
  config_files = fileset("${path.module}/configs/production", "**/*.yaml")
  # Result: ["app/settings.yaml", "database/connection.yaml", "cache/redis.yaml"]
}

resource "aws_s3_object" "configs" {
  for_each = local.config_files

  bucket  = aws_s3_bucket.config.id
  # Use just the filename as the S3 key (flat structure)
  key     = "configs/${basename(each.value)}"
  source  = "${path.module}/configs/production/${each.value}"
  etag    = filemd5("${path.module}/configs/production/${each.value}")
}

# Uploads to: configs/settings.yaml, configs/connection.yaml, configs/redis.yaml
```

## Extracting Service Names from Paths

When your directory structure encodes service names:

```hcl
variable "service_config_paths" {
  type = list(string)
  default = [
    "/opt/services/web-frontend/config.yaml",
    "/opt/services/api-gateway/config.yaml",
    "/opt/services/auth-service/config.yaml",
    "/opt/services/data-pipeline/config.yaml",
  ]
}

locals {
  # Extract service names from the paths
  # dirname gives us /opt/services/web-frontend, basename gives us web-frontend
  service_names = [
    for path in var.service_config_paths :
    basename(dirname(path))
  ]
  # Result: ["web-frontend", "api-gateway", "auth-service", "data-pipeline"]
}

output "services" {
  value = local.service_names
}
```

## Building Dynamic ECS Task Definitions

```hcl
variable "container_image_uri" {
  type    = string
  default = "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.2.3"
}

locals {
  # Extract the image name and tag from the full URI
  # basename gives us "myapp:v1.2.3"
  image_name_tag = basename(var.container_image_uri)
  image_name     = split(":", local.image_name_tag)[0]
  image_tag      = split(":", local.image_name_tag)[1]
}

resource "aws_ecs_task_definition" "app" {
  family = local.image_name

  container_definitions = jsonencode([
    {
      name  = local.image_name
      image = var.container_image_uri
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "APP_VERSION"
          value = local.image_tag
        }
      ]
    }
  ])

  cpu                      = 256
  memory                   = 512
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
}
```

## File Extension Handling

Combine `basename` with string functions to work with file extensions:

```hcl
locals {
  files = [
    "archive/data-2024.tar.gz",
    "logs/application.log",
    "configs/nginx.conf",
    "scripts/deploy.sh",
  ]

  file_info = {
    for f in local.files : basename(f) => {
      full_path = f
      filename  = basename(f)
      # Get the extension (everything after the last dot)
      extension = regex("\\.[^.]+$", basename(f))
      # Get the name without extension
      name_only = trimsuffix(basename(f), regex("\\.[^.]+$", basename(f)))
    }
  }
}

output "file_details" {
  value = local.file_info
}
```

## Creating CloudWatch Log Groups from Paths

Generate log group names from application paths:

```hcl
variable "application_paths" {
  type = list(string)
  default = [
    "/opt/apps/web-frontend",
    "/opt/apps/api-backend",
    "/opt/apps/worker-service",
    "/opt/apps/scheduler",
  ]
}

resource "aws_cloudwatch_log_group" "apps" {
  for_each = toset(var.application_paths)

  # Use basename to create clean log group names
  name              = "/apps/${basename(each.value)}"
  retention_in_days = 30

  tags = {
    Application = basename(each.value)
    FullPath    = each.value
  }
}
```

## basename vs dirname - Complementary Functions

These two functions together decompose any path:

```hcl
locals {
  path = "/var/log/nginx/access.log"

  # dirname extracts the directory
  directory = dirname(local.path)
  # Result: "/var/log/nginx"

  # basename extracts the filename
  filename = basename(local.path)
  # Result: "access.log"

  # Reconstruct the full path
  reconstructed = "${local.directory}/${local.filename}"
  # Result: "/var/log/nginx/access.log"
}
```

## Processing Data Source Outputs

When data sources return full ARNs or paths, `basename` extracts the resource name:

```hcl
# Example: extract resource name from an ARN-like string
variable "arn_like_paths" {
  type = list(string)
  default = [
    "arn:aws:s3:::my-bucket/path/to/object.json",
    "arn:aws:lambda:us-east-1:123456:function:my-function",
  ]
}

locals {
  # This is a simplified example - real ARN parsing needs more logic
  resource_names = [
    for arn in var.arn_like_paths :
    basename(arn)
  ]
  # Result: ["object.json", "my-function"]
}
```

## Dynamic Module Naming

When calling modules from different directories:

```hcl
variable "module_sources" {
  type = list(string)
  default = [
    "./modules/networking",
    "./modules/compute",
    "./modules/database",
  ]
}

locals {
  module_names = {
    for source in var.module_sources :
    basename(source) => source
  }
  # Result: {
  #   "networking" = "./modules/networking"
  #   "compute"    = "./modules/compute"
  #   "database"   = "./modules/database"
  # }
}

output "modules" {
  value = keys(local.module_names)
}
```

## SSH Key Management

Extract key names from file paths:

```hcl
locals {
  key_files = fileset("${path.module}/keys", "*.pub")
  # Result: ["deploy.pub", "admin.pub", "ci-cd.pub"]
}

resource "aws_key_pair" "keys" {
  for_each = local.key_files

  # Use the filename (without .pub) as the key name
  key_name   = trimsuffix(basename(each.value), ".pub")
  public_key = file("${path.module}/keys/${each.value}")

  tags = {
    Source = each.value
  }
}

# Creates key pairs named: deploy, admin, ci-cd
```

## Generating Tags from File Sources

When you want to track which files created which resources:

```hcl
locals {
  configs = {
    "web"     = "${path.module}/configs/web-server.yaml"
    "api"     = "${path.module}/configs/api-gateway.yaml"
    "worker"  = "${path.module}/configs/background-worker.yaml"
  }

  # Create tags that reference the source configuration file
  config_tags = {
    for name, path in local.configs : name => {
      ConfigFile    = basename(path)
      ConfigDir     = basename(dirname(path))
      ConfigVersion = substr(filesha256(path), 0, 8)
    }
  }
}
```

## Important Notes

```hcl
# basename operates on strings - no filesystem access needed
# It does not check if the path exists

# basename of a path with no slashes returns the path itself
> basename("file.txt")
"file.txt"

# basename of a path ending in slash returns the last directory name
> basename("/var/log/")
"log"

# basename does not handle URL query parameters
# basename("file.txt?v=2") returns "file.txt?v=2"

# basename works with both forward and back slashes
# But always returns just the last component
```

## Summary

The `basename` function extracts the last component of a file path, which is typically the filename. It is essential for deriving resource names from file paths, creating clean S3 keys from nested directory structures, extracting service names from configuration paths, and processing `fileset` results into meaningful identifiers. Pair it with `trimsuffix` to strip file extensions, with `dirname` for complete path decomposition, and with `split` to parse complex path-like strings. Like `dirname`, it operates purely on strings and requires no filesystem access.

For the complementary function, see our post on the [dirname function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-dirname-function-in-terraform/view).
