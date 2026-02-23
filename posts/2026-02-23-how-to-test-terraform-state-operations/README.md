# How to Test Terraform State Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, State Management, Infrastructure as Code, DevOps

Description: Learn how to safely test Terraform state operations like imports, moves, and replacements before running them against production infrastructure.

---

Terraform state is the source of truth for your infrastructure. When state operations go wrong - a botched import, a bad state move, or an accidental removal - you can end up with orphaned resources, duplicate infrastructure, or worse, deleted production systems. Testing state operations before running them on real environments is not optional. It is a survival skill.

## Why State Operations Need Testing

State operations include `terraform import`, `terraform state mv`, `terraform state rm`, and the newer `moved` and `import` blocks. Each of these modifies the mapping between your configuration and real infrastructure. A mistake can cause Terraform to:

- Try to create a resource that already exists
- Destroy a resource it no longer tracks
- Lose track of resources entirely
- Create conflicts between environments

## Setting Up a Test Environment for State Operations

The safest way to test state operations is with a dedicated test environment that mirrors production's configuration but uses separate state.

```hcl
# test-environment/main.tf
# Mirror of production config for testing state operations

terraform {
  # Use local backend for testing - no risk to production state
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = "us-east-1"
  # Use a dedicated test account
  profile = "test-account"
}

# Same module as production, different state
module "networking" {
  source = "../modules/networking"

  vpc_cidr           = "10.99.0.0/16"
  environment        = "test"
  availability_zones = ["us-east-1a", "us-east-1b"]
}
```

## Testing terraform import

The `import` command brings existing resources under Terraform management. Testing it first prevents surprises.

### Step 1: Dry Run with Plan

Before importing, verify what Terraform thinks needs to happen:

```bash
#!/bin/bash
# scripts/test-import.sh
# Test an import operation safely

RESOURCE_ADDRESS="$1"  # e.g., aws_vpc.main
RESOURCE_ID="$2"       # e.g., vpc-abc123

# Create a backup of current state
cp terraform.tfstate terraform.tfstate.backup

# Run the import
echo "Importing $RESOURCE_ID as $RESOURCE_ADDRESS..."
terraform import "$RESOURCE_ADDRESS" "$RESOURCE_ID"

# Check what changes Terraform would make after import
echo "Running plan to check for drift..."
PLAN_OUTPUT=$(terraform plan -detailed-exitcode 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "PASS: No changes needed after import. State matches configuration."
elif [ $EXIT_CODE -eq 2 ]; then
    echo "WARNING: Terraform wants to make changes after import."
    echo "Review the plan output carefully:"
    echo "$PLAN_OUTPUT"
    echo ""
    echo "This usually means configuration does not match the imported resource."
fi

# Option to rollback
echo ""
echo "To rollback: cp terraform.tfstate.backup terraform.tfstate"
```

### Step 2: Using Import Blocks (Terraform 1.5+)

Import blocks are declarative and can be tested with `plan`:

```hcl
# imports.tf
# Declarative import - can be tested with terraform plan

import {
  to = aws_vpc.main
  id = "vpc-abc123"
}

import {
  to = aws_subnet.private["us-east-1a"]
  id = "subnet-def456"
}
```

```bash
# Test the import with plan first - no state modification
terraform plan

# The plan will show what changes are needed to align
# configuration with the imported resource's actual state
```

This is much safer than the imperative `terraform import` command because you can see the full picture before modifying state.

## Testing terraform state mv

Moving resources between addresses is common during refactoring. Here is how to test it safely.

```bash
#!/bin/bash
# scripts/test-state-move.sh
# Test a state move operation

SOURCE="$1"  # e.g., aws_instance.web
TARGET="$2"  # e.g., module.compute.aws_instance.web

# Backup state
cp terraform.tfstate terraform.tfstate.pre-move

# Show current state for the resource
echo "Current state for $SOURCE:"
terraform state show "$SOURCE"

# Perform the move
echo ""
echo "Moving $SOURCE to $TARGET..."
terraform state mv "$SOURCE" "$TARGET"

# Verify the move worked
echo ""
echo "Verifying $TARGET exists in state:"
terraform state show "$TARGET"

# Run plan to check for unintended changes
echo ""
echo "Running plan to verify no resource recreation..."
PLAN_OUTPUT=$(terraform plan -detailed-exitcode 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "PASS: State move successful. No resource changes needed."
elif [ $EXIT_CODE -eq 2 ]; then
    echo "FAIL: State move caused unexpected changes!"
    echo "$PLAN_OUTPUT"
    echo ""
    echo "Rolling back..."
    cp terraform.tfstate.pre-move terraform.tfstate
    exit 1
fi
```

### Using Moved Blocks

The declarative `moved` block is testable with `plan`:

```hcl
# refactoring.tf
# Declarative move - safe to plan first

moved {
  from = aws_instance.web
  to   = module.compute.aws_instance.web
}

moved {
  from = aws_security_group.web_sg
  to   = module.compute.aws_security_group.web
}
```

```bash
# Plan shows moves without changing state
terraform plan

# Output will show:
# aws_instance.web has moved to module.compute.aws_instance.web
# No changes. Your infrastructure matches the configuration.
```

## Testing State Removal

Removing a resource from state without destroying it requires careful testing.

```bash
#!/bin/bash
# scripts/test-state-rm.sh
# Test removing a resource from state

RESOURCE="$1"

# Backup state
cp terraform.tfstate terraform.tfstate.pre-rm

# Show what we are about to remove
echo "Resource to remove from state:"
terraform state show "$RESOURCE"

# Remove from state
terraform state rm "$RESOURCE"

# Plan should show Terraform wants to create the resource
# This is expected - it no longer knows about it
echo ""
echo "Post-removal plan (expect 'create' for the removed resource):"
terraform plan

echo ""
echo "If you need to rollback: cp terraform.tfstate.pre-rm terraform.tfstate"
```

## Automated State Operation Tests

For repeatable testing, use a Go test that exercises state operations:

```go
// test/state_operations_test.go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestStateImport(t *testing.T) {
    t.Parallel()

    // First, create the resource normally
    createOpts := &terraform.Options{
        TerraformDir: "../fixtures/state-test/create",
    }
    defer terraform.Destroy(t, createOpts)
    terraform.InitAndApply(t, createOpts)

    // Get the resource ID
    resourceId := terraform.Output(t, createOpts, "vpc_id")
    require.NotEmpty(t, resourceId)

    // Now test importing it into a different config
    importOpts := &terraform.Options{
        TerraformDir: "../fixtures/state-test/import",
        Vars: map[string]interface{}{
            "import_vpc_id": resourceId,
        },
    }

    // Init the import config
    terraform.Init(t, importOpts)

    // Run import
    terraform.RunTerraformCommand(t, importOpts, "import", "aws_vpc.imported", resourceId)

    // Plan should show no changes after import
    exitCode := terraform.PlanExitCode(t, importOpts)
    assert.Equal(t, 0, exitCode, "Plan should show no changes after import")
}
```

## Testing State Operations with Terraform's Native Tests

Terraform's test framework supports testing state-related scenarios:

```hcl
# tests/state_ops.tftest.hcl

# Verify that moved blocks work correctly
run "create_original" {
  command = apply

  module {
    source = "./fixtures/before-refactor"
  }
}

run "apply_refactored" {
  command = apply

  # The moved blocks in this module should prevent recreation
  module {
    source = "./fixtures/after-refactor"
  }

  # Verify resources were not recreated
  assert {
    condition     = output.vpc_id == run.create_original.vpc_id
    error_message = "VPC should not be recreated during refactor"
  }
}
```

## State Operation Checklist

Before running any state operation in production, go through this checklist:

```markdown
1. [ ] State is backed up (remote backend versioning or manual copy)
2. [ ] Operation tested in a non-production environment
3. [ ] Plan run after operation shows no unintended changes
4. [ ] Team is notified (state lock will be held during operation)
5. [ ] Rollback procedure is documented and tested
6. [ ] State locking is working (prevent concurrent modifications)
```

## Common Pitfalls

Watch out for these when testing state operations:

- **Count/for_each index changes**: Moving from `count` to `for_each` requires careful state moves for each instance
- **Module nesting**: Moving resources into or out of modules changes the address format completely
- **Provider aliases**: State moves between providers need the `-provider` flag
- **Workspaces**: Make sure you are operating on the correct workspace

State operations are powerful but unforgiving. Testing them first - whether in a sandbox environment, with plan mode, or through automated tests - is the only way to build confidence before modifying production state.

For more on testing Terraform safely, see [How to Test Terraform Rollback Procedures](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-rollback-procedures/view) and [How to Test Terraform Upgrades Before Deploying](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-upgrades-before-deploying/view).
