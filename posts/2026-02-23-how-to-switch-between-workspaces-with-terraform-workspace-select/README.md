# How to Switch Between Workspaces with terraform workspace select

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, CLI Commands, State Management, DevOps

Description: Learn how to switch between Terraform workspaces using terraform workspace select, understand what happens during a switch, and build safe automation around workspace transitions.

---

Once you have multiple Terraform workspaces set up, you need a way to move between them. The `terraform workspace select` command handles this. It tells Terraform to point at a different state file without changing any of your configuration code. This post covers the mechanics of switching workspaces, what happens under the hood, and practical patterns for safe workspace transitions.

## Basic Usage

The command takes the name of an existing workspace:

```bash
# Switch to the "staging" workspace
terraform workspace select staging
```

Output:

```
Switched to workspace "staging".
```

That is it. After running this command, every subsequent Terraform operation (plan, apply, destroy) operates against the staging workspace's state.

## What Actually Happens During a Switch

When you run `terraform workspace select`, Terraform updates a file that tracks which workspace is active. With the local backend, this file is `.terraform/environment`:

```bash
# Check which workspace is active by reading the environment file
cat .terraform/environment
# Output: staging
```

No state data is moved, copied, or modified. Terraform simply changes which state file it reads and writes to. The switch is instant because it is just updating a pointer.

### Before and After

```bash
# Currently in the "dev" workspace
terraform workspace show
# Output: dev

# Run a plan - sees dev's infrastructure
terraform plan
# Shows: 3 resources managed in dev

# Switch to prod
terraform workspace select prod

# Run a plan - sees prod's infrastructure
terraform plan
# Shows: 12 resources managed in prod
```

The same `.tf` files are used for both workspaces. The only difference is the state that Terraform compares against.

## Switching with Verification

It is good practice to verify the switch, especially in scripts:

```bash
# Switch and verify
terraform workspace select prod

# Confirm you are where you think you are
CURRENT=$(terraform workspace show)
if [ "$CURRENT" != "prod" ]; then
  echo "ERROR: Expected to be in 'prod' but currently in '$CURRENT'"
  exit 1
fi

echo "Confirmed: working in $CURRENT workspace"
```

## Handling Non-Existent Workspaces

If you try to select a workspace that does not exist, Terraform returns an error:

```bash
terraform workspace select nonexistent
```

Output:

```
Workspace "nonexistent" doesn't exist.

You can create this workspace with the "new" subcommand
or include the "-or-create" flag with the "select" subcommand.
```

### The -or-create Flag

Recent versions of Terraform added the `-or-create` flag that combines select and new:

```bash
# Select the workspace, or create it if it does not exist
terraform workspace select -or-create staging
```

This is useful in CI/CD pipelines where you want idempotent behavior:

```bash
#!/bin/bash
# ci-setup.sh - Always works, whether the workspace exists or not

WORKSPACE=${ENVIRONMENT:-dev}

terraform init -input=false
terraform workspace select -or-create "$WORKSPACE"

echo "Ready to work in: $(terraform workspace show)"
```

If your Terraform version does not support `-or-create`, use the fallback pattern:

```bash
# Fallback for older Terraform versions
terraform workspace select "$WORKSPACE" 2>/dev/null || terraform workspace new "$WORKSPACE"
```

## Switching in CI/CD Pipelines

In automated pipelines, workspace selection is usually the first step after initialization:

```yaml
# GitHub Actions example
jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init -input=false

      - name: Select Workspace
        run: |
          terraform workspace select -or-create ${{ matrix.environment }}

      - name: Terraform Plan
        run: terraform plan -var-file="envs/${{ matrix.environment }}.tfvars" -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan
```

```groovy
// Jenkinsfile example
pipeline {
  agent any

  parameters {
    choice(
      name: 'ENVIRONMENT',
      choices: ['dev', 'staging', 'prod'],
      description: 'Target environment'
    )
  }

  stages {
    stage('Init') {
      steps {
        sh 'terraform init -input=false'
      }
    }

    stage('Select Workspace') {
      steps {
        // Select workspace, create if needed
        sh """
          terraform workspace select ${params.ENVIRONMENT} 2>/dev/null || \
          terraform workspace new ${params.ENVIRONMENT}
        """
      }
    }

    stage('Plan') {
      steps {
        sh "terraform plan -var-file=envs/${params.ENVIRONMENT}.tfvars -out=tfplan"
      }
    }

    stage('Apply') {
      when {
        branch 'main'
      }
      steps {
        sh 'terraform apply -auto-approve tfplan'
      }
    }
  }
}
```

## Safe Workspace Switching Patterns

### Confirm Before Switching to Production

Add a safety check when switching to production:

```bash
#!/bin/bash
# safe-switch.sh - Prompt before switching to production

TARGET=$1

if [ "$TARGET" = "prod" ] || [ "$TARGET" = "production" ]; then
  echo "WARNING: You are about to switch to the PRODUCTION workspace."
  echo "Current workspace: $(terraform workspace show)"
  read -p "Are you sure? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

terraform workspace select "$TARGET"
echo "Switched to: $(terraform workspace show)"
```

### Check for Uncommitted Plans

Before switching workspaces, make sure you do not have an unapplied plan from the current workspace:

```bash
#!/bin/bash
# switch-workspace.sh - Clean switch between workspaces

TARGET=$1

# Check for saved plan files
if [ -f "tfplan" ]; then
  echo "WARNING: Found an unapplied plan file (tfplan)."
  echo "Current workspace: $(terraform workspace show)"
  echo "Either apply it first or delete it before switching."
  exit 1
fi

terraform workspace select "$TARGET"
echo "Now in workspace: $(terraform workspace show)"
```

## Understanding State After Switching

A common point of confusion: switching workspaces does not change your local files or your code. It only changes which state Terraform uses to compare your code against.

```bash
# In the "dev" workspace, we have 3 EC2 instances
terraform workspace show    # dev
terraform state list
# aws_instance.web[0]
# aws_instance.web[1]
# aws_instance.web[2]

# Switch to "staging" - different state, different resources
terraform workspace select staging
terraform state list
# aws_instance.web[0]
# aws_instance.web[1]
# aws_instance.web[2]
# aws_instance.web[3]
# aws_instance.web[4]

# The instances are different! Different IDs, different IPs.
# They just happen to be created from the same Terraform code.
```

## Switching with Remote Backends

With remote backends, switching workspaces triggers a remote state lookup. The first time you access a workspace's state after switching, Terraform downloads it from the backend:

```bash
# With S3 backend, switching reads from a different S3 key
terraform workspace select prod
# Terraform reads from: s3://bucket/env:/prod/key

terraform workspace select dev
# Terraform reads from: s3://bucket/env:/dev/key
```

This is transparent - you do not need to do anything special. But be aware that it requires network access to the backend.

## Switching in Makefiles

If you use Make for your Terraform workflow:

```makefile
# Makefile

WORKSPACE ?= dev

.PHONY: init select plan apply

init:
	terraform init -input=false

select: init
	terraform workspace select -or-create $(WORKSPACE)

plan: select
	terraform plan -var-file=envs/$(WORKSPACE).tfvars -out=tfplan

apply: select
	terraform apply -auto-approve tfplan

# Usage:
# make plan WORKSPACE=staging
# make apply WORKSPACE=staging
```

## Common Mistakes

**Running apply in the wrong workspace.** This is the most dangerous mistake. Always verify with `terraform workspace show` before applying, especially in production.

**Assuming workspace switch changes variables.** Switching workspaces does not load different variable files. You still need to pass `-var-file` explicitly or use a wrapper that does it for you.

**Forgetting to init first.** If you clone a repo fresh and try to select a workspace, it will fail because the backend has not been initialized. Always `terraform init` first.

## Conclusion

The `terraform workspace select` command is simple but critical for workspace-based workflows. It changes which state Terraform operates against without touching your code. Use `-or-create` for idempotent scripts, verify switches in production workflows, and always pair workspace selection with the right variable file. For a full list of your available workspaces, see our guide on [listing workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-list-all-workspaces-with-terraform-workspace-list/view).
