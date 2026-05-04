# How to Configure the Local Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to configure and customize the OpenTofu local backend for storing state files on your local filesystem, including custom paths and workspace behavior.

## Introduction

The local backend is OpenTofu's default backend - it stores state in a file on your local filesystem. While not suitable for team environments, it's ideal for personal projects, local development, and testing. Understanding its configuration helps you customize state file locations and manage local workspaces.

## Default Behavior

Without any backend configuration, OpenTofu uses the local backend with default settings:

```text
Project directory:
├── main.tf
├── terraform.tfstate        ← State file (auto-created)
├── terraform.tfstate.backup ← Previous state (auto-created)
└── .terraform/
```

## Explicit Local Backend Configuration

You can explicitly configure the local backend with a custom path:

```hcl
# backend.tf

terraform {
  backend "local" {
    path = "terraform.tfstate"  # Default: terraform.tfstate in current directory
  }
}
```

## Custom State File Paths

Store the state file in a specific location:

```hcl
terraform {
  backend "local" {
    # Absolute path
    path = "/var/terraform/states/prod/terraform.tfstate"

    # Or relative path
    path = "../../states/prod/terraform.tfstate"
  }
}
```

This is useful when you want to:
- Keep state files outside the project directory
- Share state files between configurations (though remote backends are better for this)
- Organize state files in a central location

## Workspace Behavior with Local Backend

When using workspaces with the local backend, state files are stored in a `terraform.tfstate.d` subdirectory:

```bash
# Create workspaces
tofu workspace new production
tofu workspace new staging
tofu workspace new development

# State file structure:
# terraform.tfstate           ← default workspace
# terraform.tfstate.d/
#   ├── production/
#   │   └── terraform.tfstate
#   ├── staging/
#   │   └── terraform.tfstate
#   └── development/
#       └── terraform.tfstate
```

With a custom `path`, only the *default* workspace uses that path. Non-default workspace states are stored under `workspace_dir`, which defaults to `terraform.tfstate.d` relative to the current working directory regardless of `path`. To keep all workspace states alongside the default state, set `workspace_dir` explicitly:

```hcl
terraform {
  backend "local" {
    path          = "/var/terraform/states/terraform.tfstate"
    workspace_dir = "/var/terraform/states/terraform.tfstate.d"
  }
}

# Workspace states:
# /var/terraform/states/terraform.tfstate              ← default (uses `path`)
# /var/terraform/states/terraform.tfstate.d/
#   ├── production/terraform.tfstate
#   └── staging/terraform.tfstate
```

Note that for non-default workspaces, the state file is always named `terraform.tfstate` (the basename of `path` is not reused).

## Workspace-Aware Path Configuration

`workspace_dir` controls where non-default workspace state files live. Set it explicitly when you want workspace states to live somewhere other than `./terraform.tfstate.d`:

```hcl
terraform {
  backend "local" {
    path          = "states/terraform.tfstate"
    workspace_dir = "states/terraform.tfstate.d"
  }
}
```

## Locking with Local Backend

The local backend uses file-based locking via a `.terraform.tfstate.lock.info` file:

```bash
# Lock file appears during operations
ls -la
# .terraform.tfstate.lock.info  ← Created during plan/apply
# terraform.tfstate

# If locked, unlock with:
tofu force-unlock <lock-id>
# Or manually:
rm .terraform.tfstate.lock.info
```

## Initializing with the Local Backend

```bash
# Initialize (creates .terraform directory)
tofu init

# Output:
# Initializing the backend...
# Initializing provider plugins...
# OpenTofu has been successfully initialized!

# No backend config needed - local is the default
```

## When to Use the Local Backend

Use local backend for:
- Solo development and testing
- Learning OpenTofu concepts
- Quick infrastructure experiments
- CI environments where state is not persisted (regenerated fresh)

Avoid for:
- Team environments (no collaboration support)
- Production infrastructure (no versioning; file locking only protects same-machine concurrency)
- Any setup where state needs to survive beyond the local machine

## Migrating from Local to Remote

When ready to collaborate, migrate to a remote backend:

```hcl
# Update backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Run init to migrate
tofu init

# OpenTofu asks: Copy existing state to the new backend?
# Enter yes
```

## Conclusion

The local backend is simple, requires no configuration, and works well for individual developers and testing. Understanding its workspace directory structure and locking mechanism helps you troubleshoot issues. For any collaborative or production use, plan your migration to a remote backend early - OpenTofu makes this migration straightforward through `tofu init`.
