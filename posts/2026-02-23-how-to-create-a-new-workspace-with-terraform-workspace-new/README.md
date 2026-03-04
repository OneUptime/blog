# How to Create a New Workspace with terraform workspace new

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, CLI Commands, State Management, Infrastructure as Code

Description: A detailed guide to creating new Terraform workspaces using the terraform workspace new command, including practical examples, state initialization, and integration with backends.

---

The `terraform workspace new` command creates a fresh workspace with an empty state file and immediately switches you into it. It is the starting point for any workspace-based workflow, whether you are spinning up a new environment, testing infrastructure changes, or creating an isolated space for a feature branch. This post covers the command in detail, including the options you might not know about.

## Basic Usage

The simplest form of the command takes just a workspace name:

```bash
# Create a new workspace called "dev"
terraform workspace new dev
```

Output:

```text
Created and switched to workspace "dev"!

You're now on a new, empty workspace. Workspaces isolate their state,
so if you run "terraform plan" Terraform will not see any existing state
for this configuration.
```

After running this command, two things happen:

1. A new, empty state is created for the workspace named "dev"
2. Terraform switches your active workspace to "dev"

You can verify you are in the new workspace:

```bash
# Confirm the current workspace
terraform workspace show
# Output: dev
```

## Where the State Goes

The location of the new workspace's state depends on your backend.

### Local Backend

With the default local backend, Terraform creates a directory structure:

```bash
# After creating "dev" and "staging" workspaces
tree terraform.tfstate.d/
# terraform.tfstate.d/
#   dev/
#     terraform.tfstate
#   staging/
#     terraform.tfstate
```

The `default` workspace state stays at `terraform.tfstate` in the project root. Every other workspace gets its own subdirectory under `terraform.tfstate.d/`.

### S3 Backend

With an S3 backend, workspaces create separate state files using the `env:` prefix:

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "app/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Create a workspace
terraform workspace new staging

# The state file is stored at:
# s3://my-terraform-state/env:/staging/app/terraform.tfstate
```

### Azure Blob Storage Backend

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
```

When you create a workspace, the state file goes into the same container but with the workspace name embedded in the blob path.

### GCS Backend

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "terraform/state"
  }
}
```

Workspaces create state files at paths like `terraform/state/<workspace_name>.tfstate`.

## The -state Flag

The `terraform workspace new` command has one useful flag: `-state`. It lets you initialize the new workspace with an existing state file instead of starting empty.

```bash
# Create a new workspace initialized with state from a file
terraform workspace new -state=path/to/existing.tfstate production
```

This is handy when you want to:

- Migrate from a non-workspace setup to workspaces
- Clone an environment by copying state
- Split a monolithic state into workspace-managed pieces

For example, if you have been running without workspaces and want to move your existing infrastructure into a "prod" workspace:

```bash
# Your existing state is in terraform.tfstate
# Create a "prod" workspace initialized with that state
terraform workspace new -state=terraform.tfstate prod

# Now "prod" workspace has all your existing resources
terraform plan
# Should show "No changes. Your infrastructure matches the configuration."
```

## Creating Multiple Workspaces

You will often need several workspaces for different environments:

```bash
# Create workspaces for each environment
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# List all workspaces to verify
terraform workspace list
#   default
#   dev
#   staging
# * prod
```

The asterisk marks your current workspace. Since `terraform workspace new` switches to the newly created workspace, you end up in "prod" after creating all three.

## Scripting Workspace Creation

In automation scripts, you might need to create a workspace only if it does not already exist:

```bash
#!/bin/bash
# create-workspace.sh - Create a workspace if it does not exist

WORKSPACE_NAME=$1

if [ -z "$WORKSPACE_NAME" ]; then
  echo "Usage: $0 <workspace-name>"
  exit 1
fi

# Check if the workspace already exists
if terraform workspace list | grep -q "  ${WORKSPACE_NAME}$"; then
  echo "Workspace '${WORKSPACE_NAME}' already exists. Switching to it."
  terraform workspace select "$WORKSPACE_NAME"
else
  echo "Creating workspace '${WORKSPACE_NAME}'."
  terraform workspace new "$WORKSPACE_NAME"
fi
```

Use it like:

```bash
# Create or switch to the workspace
./create-workspace.sh dev
```

A more robust version for CI/CD pipelines:

```bash
#!/bin/bash
# workspace-init.sh - Initialize workspace in a CI/CD pipeline

set -euo pipefail

WORKSPACE=${ENVIRONMENT:-dev}

# Initialize Terraform first
terraform init -input=false

# Create or select workspace
terraform workspace select "$WORKSPACE" 2>/dev/null || terraform workspace new "$WORKSPACE"

echo "Active workspace: $(terraform workspace show)"
```

The trick here is trying `workspace select` first and falling back to `workspace new` if it fails. This makes the script idempotent - safe to run multiple times.

## Workspace Naming Rules

Workspace names have a few constraints:

- They must be unique within the configuration
- They can contain letters, numbers, dashes, and underscores
- They cannot be empty
- "default" is reserved for the built-in default workspace

```bash
# Valid workspace names
terraform workspace new dev
terraform workspace new staging-us-east-1
terraform workspace new feature_login_page
terraform workspace new v2

# Invalid - will fail
terraform workspace new ""          # empty string
terraform workspace new "default"   # reserved name
terraform workspace new "my space"  # no spaces allowed
```

## What Happens After Creating a Workspace

When you create a new workspace and run `terraform plan`, Terraform sees an empty state. This means it will want to create every resource defined in your configuration, even if those resources already exist in another workspace.

```bash
# Create and switch to a new workspace
terraform workspace new test

# Plan shows it wants to create everything from scratch
terraform plan
# Plan: 15 to add, 0 to change, 0 to destroy.
```

This is by design. Each workspace is an isolated state. Resources in one workspace have no relationship to resources in another, even though they come from the same code.

If your configuration uses `terraform.workspace` to generate unique names, you can safely apply:

```hcl
resource "aws_s3_bucket" "data" {
  # Each workspace creates a uniquely named bucket
  bucket = "myapp-data-${terraform.workspace}"
}
```

But if your resources have hardcoded names, you will get conflicts:

```hcl
resource "aws_s3_bucket" "data" {
  # This will fail in a second workspace because the name is taken
  bucket = "myapp-data"
}
```

Always use `terraform.workspace` in resource names when working with workspaces.

## Initializing Workspaces with Variable Files

A common pattern is pairing workspaces with environment-specific variable files:

```bash
# Create a workspace and immediately plan with its variable file
terraform workspace new staging
terraform plan -var-file="environments/staging.tfvars"
```

Directory structure:

```text
project/
  main.tf
  variables.tf
  environments/
    dev.tfvars
    staging.tfvars
    prod.tfvars
```

You can automate this with a wrapper script:

```bash
#!/bin/bash
# tf-new-env.sh - Create workspace and plan with matching vars

ENV=$1
terraform workspace new "$ENV"
terraform plan -var-file="environments/${ENV}.tfvars"
```

## Troubleshooting

**"Workspace already exists"** - If you try to create a workspace that exists, Terraform returns an error. Use the select-or-create pattern shown earlier.

**"Backend initialization required"** - Always run `terraform init` before creating workspaces. The backend must be configured first.

**"State file not found"** when using `-state` - Make sure the path to the state file is correct and the file is valid JSON. You can verify with:

```bash
# Check if a state file is valid
python3 -c "import json; json.load(open('terraform.tfstate'))"
```

## Conclusion

The `terraform workspace new` command is straightforward but understanding what happens behind the scenes makes a difference. Each new workspace starts with an empty state, shares the same configuration, and stores its state according to your backend's conventions. Pair it with the `-state` flag for migrations, use wrapper scripts for CI/CD, and always reference `terraform.workspace` in your resource names to avoid conflicts. Next, learn how to [switch between workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-switch-between-workspaces-with-terraform-workspace-select/view) once you have them set up.
