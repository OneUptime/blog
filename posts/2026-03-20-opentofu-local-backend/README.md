# How to Configure the Local Backend in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend

Description: Learn how to configure the local backend in OpenTofu to store state on the filesystem, and when it is appropriate to use it.

## Introduction

The local backend is OpenTofu's default - state is stored as a file on the local filesystem. It requires no external services and is ideal for personal projects, learning, and single-developer scenarios. For team environments, a remote backend is preferred.

## Default Behavior

Without any backend configuration, OpenTofu uses local state:

```bash
# After tofu apply, state is created here:

ls -la terraform.tfstate
ls -la terraform.tfstate.backup  # Backup of previous state
```

## Explicit Local Backend Configuration

```hcl
# backend.tf
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

## Custom State File Path

```hcl
terraform {
  backend "local" {
    path = "/var/terraform/production.tfstate"
  }
}
```

## Environment-Specific State Files

Use workspace-aware paths or separate directories:

```hcl
# Use a path per environment
terraform {
  backend "local" {
    path = "environments/${var.environment}/terraform.tfstate"
  }
}
```

Or use the workspace system with local backend:

```bash
# Create workspaces with local state
tofu workspace new dev
# Creates: terraform.tfstate.d/dev/terraform.tfstate

tofu workspace new prod
# Creates: terraform.tfstate.d/prod/terraform.tfstate
```

## When to Use Local Backend

| Scenario | Local Backend | Remote Backend |
|---|---|---|
| Personal project | Appropriate | Overkill |
| Learning OpenTofu | Ideal | Not needed |
| Single developer | Acceptable | Preferred |
| Team collaboration | Avoid | Required |
| CI/CD pipeline | Risky | Required |

## Limitations

- **Locking is local only**: the local backend locks state via OS file locks, so it protects against concurrent runs on the same machine but cannot coordinate runs across different machines or users
- **Not shareable**: state lives on one machine
- **No versioning**: only one backup exists
- **No remote access**: CI/CD requires state file transfer

## Migrating from Local to Remote

When you are ready to switch to a remote backend:

```hcl
# Update backend.tf to use S3
terraform {
  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Run init with migration flag
tofu init -migrate-state
# OpenTofu uploads your local state to S3
```

## Protecting Local State

```bash
# Never commit state to version control
echo "*.tfstate" >> .gitignore
echo "*.tfstate.backup" >> .gitignore

# Encrypt at the filesystem level if storing sensitive infrastructure
# Consider using OpenTofu's built-in state encryption
```

## Using -state Flag for Temporary Overrides

The `-state` flag is a legacy option preserved for backward compatibility with the local backend. It is not recommended for new systems, but it can still be used for one-off operations:

```bash
# Use a different state file for one-off operations
tofu plan -state=/tmp/emergency-recovery.tfstate
tofu apply -state=/tmp/test-state.tfstate
```

## Conclusion

The local backend is simple and zero-configuration - perfect for individual use and learning. It stores state as `terraform.tfstate` in your project directory. Switch to a remote backend (S3, GCS, azurerm) as soon as you work in a team or automate deployments through CI/CD. Migration is straightforward using `tofu init -migrate-state`.
