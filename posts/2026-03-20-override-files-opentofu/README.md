# How to Use Override Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Override Files, HCL, Infrastructure as Code, DevOps

Description: A guide to using override files in OpenTofu to override resource configurations without modifying the original files.

## Introduction

Override files in OpenTofu allow you to override specific resource attributes, variable values, or other configuration elements without modifying the original files. They are loaded last and their contents are merged with the existing configuration. This is useful for temporary modifications, testing, and developer-specific customizations.

## How Override Files Work

OpenTofu automatically loads files named with `_override.tf` or `override.tf` suffix. These files are processed after all regular `.tf` files, and their contents override the values in the original files.

Override files that OpenTofu looks for:
- `override.tf` / `override.tofu`
- `override.tf.json` / `override.tofu.json`
- `*_override.tf` / `*_override.tofu` (e.g., `dev_override.tf`)
- `*_override.tf.json` / `*_override.tofu.json`

## Basic Override Example

```hcl
# main.tf - Original configuration

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"  # Production size

  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}
```

```hcl
# dev_override.tf - Developer override for local testing
# Override the production instance type with a smaller one
resource "aws_instance" "web" {
  instance_type = "t3.micro"  # Smaller for development

  tags = {
    Environment = "development"  # Override tag
  }
}
```

After merging, the effective configuration is:
```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # From main.tf
  instance_type = "t3.micro"               # Overridden by dev_override.tf
  tags = {
    Environment = "development"            # tags is an attribute, so the whole map is replaced
  }
}
```

Note that `tags` is an attribute argument (assigned with `=`), so the override replaces the entire map rather than merging it key-by-key. The `Name` tag from `main.tf` is gone in the merged result. The same rule applies to all attribute arguments: an override replaces the original argument outright. Nested blocks (introduced without `=`) are also replaced as a whole, with a few documented exceptions such as `lifecycle` and `required_providers`.

## Common Use Cases

### Development Overrides

```hcl
# dev_override.tf - For local development
# Add to .gitignore to keep it developer-specific

variable "environment" {
  default = "dev"  # Override the default environment
}

# Skip slow resources during development
resource "aws_cloudwatch_log_group" "app" {
  retention_in_days = 1  # Short retention for dev
}
```

### Disabling Resources During Testing

```hcl
# test_override.tf - Override for testing
# Use a mock or disabled resource

resource "aws_security_group" "web" {
  description = "OVERRIDE: Using permissive rules for testing"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/8"]  # Only internal access for testing
  }
}
```

### Module Source Override

```hcl
# override.tf - Override module source during development
module "networking" {
  source = "../modules/networking"  # Override to local path during dev
  # Original in main.tf:
  # source = "git::https://github.com/org/terraform-modules.git//networking"
}
```

## .gitignore Override Files

```gitignore
# .gitignore
# Ignore personal override files
*_override.tf
*_override.tf.json
override.tf
override.tf.json

# But keep examples
!example_override.tf
```

## A Note on Visibility

OpenTofu does not print a special warning when override files are applied - they are loaded silently as part of the normal configuration. The official documentation cautions that over-use of override files hurts readability, since a reader looking only at the original files cannot easily see that some portions have been overridden. Inspect the merged result with `tofu plan` (and check which `*_override.tf` / `override.tf` files exist in the working directory) before applying changes.

## Override Variables

```hcl
# override.tf - Override variable defaults
variable "aws_region" {
  default = "eu-west-1"  # Override default region for local testing
}

variable "instance_count" {
  default = 1  # Use just 1 instance during development
}
```

## Alternatives to Override Files

For production use, prefer explicit environment-specific variable files:

```bash
# Instead of override files, use -var-file
tofu plan -var-file="dev.tfvars"
tofu plan -var-file="prod.tfvars"
```

## Conclusion

Override files are a flexible tool for temporary configuration changes without modifying the original source files. They are best suited for development workflows, local testing, and scenarios where multiple developers need different configurations from the same base code. For production deployments, use proper variable files and environment-specific configurations rather than override files.
