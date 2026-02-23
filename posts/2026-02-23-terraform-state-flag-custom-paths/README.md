# How to Use the -state Flag for Custom State File Paths

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, CLI, DevOps, Configuration

Description: Learn how to use the -state and -state-out flags in Terraform to work with custom state file paths for testing, migration, and advanced workflows.

---

By default, Terraform stores its state in a file called `terraform.tfstate` in your working directory (for local state) or at the configured path in your remote backend. But sometimes you need to point Terraform at a different file. The `-state` flag lets you do exactly that.

This is useful for testing, migration work, maintaining multiple local states, and scripting advanced workflows.

## Basic Usage of -state

The `-state` flag tells Terraform to use a specific file as the state:

```bash
# Use a custom state file for plan
terraform plan -state=custom.tfstate

# Use a custom state file for apply
terraform apply -state=custom.tfstate

# Use a custom state file for show
terraform show -state=custom.tfstate
```

When you use `-state`, Terraform reads from and writes to the specified file instead of the default `terraform.tfstate`.

## The -state-out Flag

The `-state-out` flag specifies where to write the updated state after an operation, while `-state` specifies where to read the current state from. This lets you read from one file and write to another:

```bash
# Read from original.tfstate, write changes to modified.tfstate
terraform apply -state=original.tfstate -state-out=modified.tfstate
```

This is particularly useful when you want to preserve the original state while testing changes.

## Common Use Cases

### Testing State Changes Locally

Before modifying a remote state, you can pull it locally and test changes:

```bash
# Pull remote state to a local file
terraform state pull > local-test.tfstate

# Test a plan against the local copy
terraform plan -state=local-test.tfstate

# If everything looks good, test an apply locally
terraform apply -state=local-test.tfstate -state-out=local-test-modified.tfstate

# Compare the original and modified states
diff <(jq -S . local-test.tfstate) <(jq -S . local-test-modified.tfstate)
```

### Maintaining Multiple Local Environments

If you're running multiple environments locally without workspaces:

```bash
# Dev environment
terraform plan -state=dev.tfstate -var-file=dev.tfvars
terraform apply -state=dev.tfstate -var-file=dev.tfvars

# Staging environment
terraform plan -state=staging.tfstate -var-file=staging.tfvars
terraform apply -state=staging.tfstate -var-file=staging.tfvars
```

This is a simpler alternative to workspaces for local development, though remote backends with workspaces are better for team use.

### State Migration Scripts

When migrating between backends or restructuring state, `-state` and `-state-out` are essential:

```bash
#!/bin/bash
# migrate-state.sh - Move resources between state files

SOURCE="old-backend.tfstate"
DEST="new-backend.tfstate"

# Pull states from both backends
cd old-config && terraform state pull > /tmp/$SOURCE && cd ..
cd new-config && terraform state pull > /tmp/$DEST && cd ..

# Move specific resources
terraform state mv \
  -state=/tmp/$SOURCE \
  -state-out=/tmp/$DEST \
  aws_instance.web

# Push the modified states back
cd old-config && terraform state push /tmp/$SOURCE && cd ..
cd new-config && terraform state push /tmp/$DEST && cd ..
```

### Backup Before Apply

Create a backup of your state before each apply:

```bash
#!/bin/bash
# safe-apply.sh - Apply with automatic state backup

BACKUP_DIR="state-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Create a backup
terraform state pull > "$BACKUP_DIR/terraform-${TIMESTAMP}.tfstate"
echo "State backed up to $BACKUP_DIR/terraform-${TIMESTAMP}.tfstate"

# Run the apply
terraform apply "$@"

# If apply failed, show how to restore
if [ $? -ne 0 ]; then
  echo "Apply failed. To restore state:"
  echo "  terraform state push $BACKUP_DIR/terraform-${TIMESTAMP}.tfstate"
fi
```

## Using -state with State Commands

The `-state` flag also works with `terraform state` subcommands:

```bash
# List resources in a specific state file
terraform state list -state=production.tfstate

# Show a specific resource from a custom state file
terraform state show -state=production.tfstate aws_instance.web

# Move resources using custom state file paths
terraform state mv \
  -state=source.tfstate \
  -state-out=destination.tfstate \
  aws_instance.old_name \
  aws_instance.new_name

# Remove a resource from a specific state file
terraform state rm -state=production.tfstate aws_instance.deprecated
```

## Using -state with import

When importing resources, you can specify which state file to import into:

```bash
# Import a resource into a custom state file
terraform import -state=custom.tfstate aws_instance.web i-0abc123def456

# Import into the default state
terraform import aws_instance.web i-0abc123def456
```

## State Path with Backend Configuration

The `-state` flag is primarily useful with local state. When using a remote backend, the backend configuration determines where state is stored, and `-state` has limited effect:

```hcl
# With a remote backend, the state path is configured here
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "production/terraform.tfstate"  # This is the state path
    region = "us-east-1"
  }
}
```

If you need to override the backend path temporarily, use the `-backend-config` flag during init instead:

```bash
# Override the state path during init
terraform init \
  -backend-config="key=testing/terraform.tfstate"

# Or use a backend config file
terraform init -backend-config=backend-testing.hcl
```

```hcl
# backend-testing.hcl
key = "testing/terraform.tfstate"
```

## Working with State Files in Different Formats

When using `-state` with manually crafted or modified state files, make sure the file is valid:

```bash
# Validate a state file before using it
python3 -m json.tool custom.tfstate > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "State file is valid JSON"
  terraform plan -state=custom.tfstate
else
  echo "State file has invalid JSON"
fi
```

## The -lock and -lock-timeout Flags

When using custom state file paths, locking behavior depends on the backend. For local state files, Terraform uses filesystem locking:

```bash
# Disable locking (use with caution)
terraform plan -state=custom.tfstate -lock=false

# Set a custom lock timeout
terraform apply -state=custom.tfstate -lock-timeout=60s
```

Disabling locking is sometimes necessary when working with state files on network file systems that don't support locking, but it introduces the risk of concurrent modifications.

## Environment Variable Alternative

Instead of passing `-state` on every command, you can use the `TF_STATE` environment variable (available in some Terraform wrappers) or create shell aliases:

```bash
# Shell alias for working with a specific state
alias tf-dev='terraform -state=dev.tfstate'
alias tf-staging='terraform -state=staging.tfstate'

# Usage
tf-dev plan -var-file=dev.tfvars
tf-staging plan -var-file=staging.tfvars
```

Or create a wrapper script:

```bash
#!/bin/bash
# tf.sh - Terraform wrapper with environment selection

ENV="${1:?Usage: tf.sh <env> <command> [args]}"
shift

STATE_FILE="${ENV}.tfstate"
VAR_FILE="${ENV}.tfvars"

if [ ! -f "$VAR_FILE" ]; then
  echo "Variables file $VAR_FILE not found"
  exit 1
fi

terraform "$@" -state="$STATE_FILE" -var-file="$VAR_FILE"
```

```bash
# Usage
./tf.sh dev plan
./tf.sh staging apply
./tf.sh production plan -target=aws_instance.web
```

## Gotchas and Warnings

**State file gets overwritten.** When using `-state`, the specified file is updated in place after apply. If you want to preserve the original, use `-state-out` to write to a different file.

**No automatic backup with -state.** Terraform normally creates a `terraform.tfstate.backup` file. When using `-state`, the backup file name changes to match: `custom.tfstate.backup`.

**Backend configuration takes precedence.** If you have a remote backend configured and also pass `-state`, the behavior depends on the command. For state manipulation commands, `-state` works with local files. For plan/apply with a remote backend, the backend configuration wins.

**Don't mix -state with remote backends.** Using `-state` is intended for local state workflows. For remote backends, use proper backend configuration, workspaces, or `terraform state pull/push`.

## Wrapping Up

The `-state` and `-state-out` flags are power-user tools for Terraform. They're most useful during migrations, testing, and scripted workflows where you need precise control over which state file Terraform reads from and writes to. For day-to-day work with remote backends, you generally won't need them - but when you do, they're indispensable.

For more on state management workflows, check out our guides on [splitting state files](https://oneuptime.com/blog/post/2026-02-23-split-terraform-state-file-multiple-states/view) and [backing up state before major changes](https://oneuptime.com/blog/post/2026-02-23-back-up-terraform-state-before-major-changes/view).
