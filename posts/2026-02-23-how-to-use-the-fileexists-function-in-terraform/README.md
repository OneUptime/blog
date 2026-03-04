# How to Use the fileexists Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, fileexists Function, File Systems, HCL, Infrastructure as Code, Conditional Logic

Description: Learn how to use the fileexists function in Terraform to check whether a local file exists before reading it, enabling conditional configuration based on file presence.

---

The `fileexists` function checks whether a file exists at a given path on the local filesystem. It returns `true` if the file exists and `false` otherwise. This simple boolean check opens up a powerful pattern: conditional configuration based on what files are actually present in your project.

## What Is the fileexists Function?

The `fileexists` function takes a file path and returns a boolean:

```hcl
# fileexists(path)
# Returns true if the file exists, false otherwise
fileexists("/etc/hostname")            # true (on most Linux systems)
fileexists("/nonexistent/file.txt")    # false
```

It checks for the file at plan time, not apply time, so the file must exist on the machine running Terraform.

## Basic Usage

The most common pattern is checking for a file before trying to read it:

```hcl
locals {
  # Check if a custom configuration file exists
  has_custom_config = fileexists("${path.module}/configs/custom.conf")

  # Read the custom config if it exists, otherwise use the default
  config = local.has_custom_config ? (
    file("${path.module}/configs/custom.conf")
  ) : (
    file("${path.module}/configs/default.conf")
  )
}

resource "aws_s3_object" "config" {
  bucket  = aws_s3_bucket.config.id
  key     = "app/config.conf"
  content = local.config
}
```

## Conditional Resource Creation

You can use `fileexists` to conditionally create resources based on whether certain files are present:

```hcl
# Only create the TLS certificate resource if cert files exist locally
locals {
  has_cert = (
    fileexists("${path.module}/certs/server.crt") &&
    fileexists("${path.module}/certs/server.key")
  )
}

resource "aws_iam_server_certificate" "app" {
  count = local.has_cert ? 1 : 0

  name             = "app-certificate"
  certificate_body = file("${path.module}/certs/server.crt")
  private_key      = file("${path.module}/certs/server.key")

  # Chain file is optional
  certificate_chain = fileexists("${path.module}/certs/chain.crt") ? (
    file("${path.module}/certs/chain.crt")
  ) : null
}
```

## Environment-Specific Overrides

A great pattern is allowing environment-specific files to override defaults:

```hcl
variable "environment" {
  type    = string
  default = "staging"
}

locals {
  # Check for environment-specific override files
  env_config_path = "${path.module}/configs/${var.environment}.tfvars"
  has_env_config  = fileexists(local.env_config_path)

  # Environment-specific user data script
  env_script_path = "${path.module}/scripts/${var.environment}-startup.sh"
  default_script  = "${path.module}/scripts/default-startup.sh"

  startup_script = fileexists(local.env_script_path) ? (
    file(local.env_script_path)
  ) : (
    file(local.default_script)
  )
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  user_data     = local.startup_script

  tags = {
    Name        = "app-${var.environment}"
    CustomConfig = local.has_env_config ? "yes" : "no"
  }
}
```

## Checking for Optional Module Files

When building reusable modules, `fileexists` lets consumers optionally provide files:

```hcl
# modules/lambda-function/main.tf

variable "function_name" {
  type = string
}

variable "runtime" {
  type    = string
  default = "python3.9"
}

locals {
  # Check for optional files that customize behavior
  has_requirements = fileexists("${path.module}/requirements.txt")
  has_env_file     = fileexists("${path.module}/.env")
  has_layer_zip    = fileexists("${path.module}/layer.zip")
}

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = var.runtime

  filename         = "${path.module}/function.zip"
  source_code_hash = filebase64sha256("${path.module}/function.zip")

  # Attach a layer only if the layer zip exists
  layers = local.has_layer_zip ? [aws_lambda_layer_version.deps[0].arn] : []
}

resource "aws_lambda_layer_version" "deps" {
  count               = local.has_layer_zip ? 1 : 0
  layer_name          = "${var.function_name}-deps"
  filename            = "${path.module}/layer.zip"
  compatible_runtimes = [var.runtime]
  source_code_hash    = filebase64sha256("${path.module}/layer.zip")
}
```

## Validation with fileexists

Use `fileexists` in variable validation to ensure required files are in place:

```hcl
variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/id_rsa.pub"

  validation {
    condition     = fileexists(var.ssh_public_key_path)
    error_message = "SSH public key file not found at ${var.ssh_public_key_path}. Please generate an SSH key pair first."
  }
}

variable "config_directory" {
  type    = string
  default = "./configs"

  validation {
    condition     = fileexists("${var.config_directory}/main.conf")
    error_message = "Required configuration file main.conf not found in ${var.config_directory}."
  }
}
```

## Building Conditional IAM Policies

Load additional IAM policies only if they exist as local files:

```hcl
locals {
  # List of optional policy files
  optional_policy_files = [
    "extra-s3-policy.json",
    "extra-dynamodb-policy.json",
    "extra-sqs-policy.json",
    "extra-sns-policy.json",
  ]

  # Filter to only policies that actually exist
  existing_policies = [
    for f in local.optional_policy_files :
    f if fileexists("${path.module}/policies/${f}")
  ]
}

resource "aws_iam_role_policy" "extra" {
  for_each = toset(local.existing_policies)

  name   = replace(each.value, ".json", "")
  role   = aws_iam_role.app.id
  policy = file("${path.module}/policies/${each.value}")
}

output "loaded_policies" {
  value = local.existing_policies
}
```

## Checking for Configuration Completeness

Before deploying, verify that all required configuration files are present:

```hcl
locals {
  required_files = {
    "Application config"  = "${path.module}/configs/app.yaml"
    "Database config"     = "${path.module}/configs/database.yaml"
    "Nginx config"        = "${path.module}/configs/nginx.conf"
    "SSL certificate"     = "${path.module}/certs/server.crt"
    "SSL private key"     = "${path.module}/certs/server.key"
  }

  missing_files = {
    for name, path in local.required_files :
    name => path if !fileexists(path)
  }

  all_files_present = length(local.missing_files) == 0
}

# This will show which files are missing in the plan output
output "configuration_status" {
  value = local.all_files_present ? (
    "All configuration files present"
  ) : (
    "Missing files: ${join(", ", keys(local.missing_files))}"
  )
}
```

## Feature Detection Based on File Presence

You can use file existence as a lightweight feature flag mechanism:

```hcl
locals {
  # Feature flags based on marker files
  features = {
    monitoring = fileexists("${path.module}/.enable-monitoring")
    debugging  = fileexists("${path.module}/.enable-debug")
    canary     = fileexists("${path.module}/.enable-canary")
    ha_mode    = fileexists("${path.module}/.enable-ha")
  }
}

resource "aws_instance" "app" {
  count         = local.features.ha_mode ? 3 : 1
  ami           = var.ami_id
  instance_type = local.features.debugging ? "t3.large" : "t3.medium"

  tags = {
    Name       = "app-${count.index}"
    Monitoring = local.features.monitoring ? "enabled" : "disabled"
    Canary     = local.features.canary ? "yes" : "no"
  }
}
```

## Handling Platform-Specific Files

When your Terraform runs on different operating systems:

```hcl
locals {
  # Try platform-specific paths for SSH keys
  ssh_key_paths = {
    linux   = "/home/${var.username}/.ssh/id_rsa.pub"
    macos   = "/Users/${var.username}/.ssh/id_rsa.pub"
    windows = "C:/Users/${var.username}/.ssh/id_rsa.pub"
  }

  # Find which path exists
  ssh_key_path = coalesce([
    for platform, path in local.ssh_key_paths :
    fileexists(path) ? path : ""
  ]...)
}
```

## Important Notes

```hcl
# fileexists checks at plan time, not apply time
# The file must exist when you run terraform plan

# fileexists only checks regular files, not directories
# To check for a directory, you would need an external data source

# fileexists returns false for symbolic links pointing to non-existent targets
# But returns true for valid symbolic links

# The path follows the same resolution rules as file()
# Use path.module, path.root, or absolute paths
```

## Summary

The `fileexists` function is the guard you should always use before `file` when the file might not be present. It enables optional configuration files, environment-specific overrides, conditional resource creation, and pre-deployment validation. The pattern of `fileexists(path) ? file(path) : default_value` is one of the most practical patterns in Terraform for building flexible, robust configurations that adapt to what is actually available in the project directory.

For related functions, check out our posts on the [file function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-file-function-to-read-local-files-in-terraform/view) and the [fileset function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-fileset-function-to-find-files-by-pattern/view).
