# How to Use Workspaces for Environment Separation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Workspaces, Environment Separation, Infrastructure as Code, State Management

Description: Learn how to use OpenTofu workspaces to maintain separate state files for each environment using a single configuration, and understand the trade-offs versus separate directories.

---

OpenTofu workspaces allow multiple state files from a single configuration directory. Each workspace is isolated - resources created in the `production` workspace don't affect the `staging` workspace. This guide covers workspace-based environment separation and when to choose it over directory-based separation.

## Creating and Switching Workspaces

```bash
# List all workspaces (default is created automatically)

tofu workspace list

# Create a new workspace
tofu workspace new production
tofu workspace new staging
tofu workspace new development

# Switch workspaces
tofu workspace select production

# Show current workspace
tofu workspace show
```

## Workspace-Aware Configuration

```hcl
# main.tf
locals {
  # Use workspace name to drive configuration
  env = terraform.workspace

  # Lookup environment-specific config
  env_config = {
    production = {
      instance_type = "t3.large"
      min_count     = 2
      max_count     = 10
    }
    staging = {
      instance_type = "t3.medium"
      min_count     = 1
      max_count     = 5
    }
    development = {
      instance_type = "t3.micro"
      min_count     = 1
      max_count     = 2
    }
  }

  config = local.env_config[local.env]
}

resource "aws_autoscaling_group" "app" {
  name             = "app-${local.env}"
  min_size         = local.config.min_count
  max_size         = local.config.max_count
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## Backend Configuration for Workspaces

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket = "my-tofu-state"
    # OpenTofu automatically appends workspace name:
    # s3://my-tofu-state/env:/production/app/terraform.tfstate
    key    = "app/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Workspace vs Directory-Based Separation

| Approach | Pros | Cons |
|----------|------|------|
| Workspaces | Single codebase, easy to DRY | Hard to have truly different configs |
| Separate dirs | Clear separation, different providers possible | Code duplication |

## When to Use Workspaces

- Simple environments with minor differences (instance size, count)
- Feature branch environments with identical architecture
- Short-lived environments (preview, testing)

## When NOT to Use Workspaces

- Environments in different AWS accounts (use separate provider configs)
- Environments with fundamentally different architectures
- When different teams manage different environments

## Best Practices

- Don't use the `default` workspace for production - its name gives no context.
- Add `terraform.workspace` to all resource names and tags to make resources identifiable.
- Use workspace validation to prevent applying dev-only configs to production.
- Consider directory-based separation if environments diverge significantly over time.
