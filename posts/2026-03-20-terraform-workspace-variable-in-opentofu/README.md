# How to Use terraform.workspace in Configuration Logic in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Workspaces, Configuration Logic, HCL, Infrastructure as Code

Description: Learn how to use the terraform.workspace built-in value in OpenTofu to write a single configuration that behaves differently across environments.

`terraform.workspace` is a built-in string value that always holds the name of the currently selected workspace. By referencing it in your HCL, you can drive environment-specific behavior - instance sizes, replica counts, feature flags - from a single configuration without duplicating code.

## Reading the Current Workspace

Access the value directly in any expression:

```hcl
# Output the active workspace name for debugging

output "current_workspace" {
  value = terraform.workspace
}
```

## Selecting Instance Sizes by Workspace

Use a `locals` map to look up settings by workspace name:

```hcl
locals {
  # Map each workspace to the appropriate instance type
  instance_types = {
    default    = "t3.micro"
    dev        = "t3.micro"
    staging    = "t3.medium"
    production = "m5.large"
  }

  # Fall back to "t3.micro" if workspace is not in the map
  instance_type = lookup(local.instance_types, terraform.workspace, "t3.micro")
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = local.instance_type

  tags = {
    Environment = terraform.workspace
  }
}
```

## Enabling or Disabling Resources by Workspace

Use `count` to conditionally create resources only in specific workspaces:

```hcl
# Only create a read replica in production
resource "aws_db_instance" "replica" {
  count = terraform.workspace == "production" ? 1 : 0

  identifier     = "myapp-replica"
  instance_class = "db.r5.large"
  replicate_source_db = aws_db_instance.primary.id
}
```

## Setting Variable Values Based on Workspace

Combine `terraform.workspace` with locals to avoid separate `.tfvars` files:

```hcl
locals {
  config = {
    default = {
      min_capacity     = 1
      max_capacity     = 2
      retention_days   = 7
      enable_waf       = false
    }
    staging = {
      min_capacity     = 2
      max_capacity     = 5
      retention_days   = 14
      enable_waf       = false
    }
    production = {
      min_capacity     = 5
      max_capacity     = 50
      retention_days   = 90
      enable_waf       = true
    }
  }

  # Merge defaults with workspace-specific overrides
  env_config = merge(local.config["default"], lookup(local.config, terraform.workspace, {}))
}

resource "aws_autoscaling_group" "app" {
  min_size         = local.env_config.min_capacity
  max_size         = local.env_config.max_capacity
  # ... other config
}
```

## Using workspace in Resource Naming

Include the workspace name in resource names to avoid conflicts when multiple workspaces share the same AWS account:

```hcl
resource "aws_s3_bucket" "data" {
  # e.g., "myapp-production-data" or "myapp-staging-data"
  bucket = "myapp-${terraform.workspace}-data"
}

resource "aws_iam_role" "lambda" {
  name = "myapp-${terraform.workspace}-lambda-role"
  # ...
}
```

## Guarding Against Default Workspace in Production

Prevent accidental applies to the `default` workspace when your convention uses named environments:

```hcl
resource "terraform_data" "workspace_guard" {
  input = terraform.workspace

  lifecycle {
    precondition {
      condition     = terraform.workspace != "default"
      error_message = "Do not apply in the 'default' workspace. Use 'staging' or 'production'."
    }
  }
}
```

## Limitations

- `terraform.workspace` cannot be used to generate dynamic `provider` block `alias` names; provider configuration references are not normal expressions.
- Avoid complex business logic solely based on workspace - prefer variable files for configurations that change frequently.
- Workspaces use the same backend and are not a strong isolation boundary for deployments that require separate credentials and access controls.

## Conclusion

`terraform.workspace` is a simple but powerful tool for writing DRY configurations that adapt to different environments. Pair it with `locals` maps for clean, readable environment-specific logic, and use naming conventions to keep multi-workspace deployments predictable.
