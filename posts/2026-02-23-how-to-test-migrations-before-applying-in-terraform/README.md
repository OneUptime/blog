# How to Test Migrations Before Applying in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Migration, Validation, Infrastructure as Code

Description: Learn techniques for testing Terraform migrations before applying them to production, including plan analysis, workspace testing, and automated validation.

---

Applying untested Terraform migrations directly to production is a recipe for disaster. Whether you are restructuring code, upgrading providers, or importing resources, thorough testing catches issues before they affect real infrastructure. This guide covers practical techniques for testing Terraform migrations safely.

## Why Test Migrations

Migrations can cause unexpected resource destruction, configuration drift, or state corruption. Testing reveals these issues in a safe environment where they can be fixed without production impact. The cost of testing is minimal compared to the cost of recovering from a failed production migration.

## Technique 1: Plan Analysis

The simplest test is analyzing the `terraform plan` output:

```bash
# Generate a detailed plan
terraform plan -detailed-exitcode -out=migration.tfplan 2>&1 | tee plan-output.log

# Exit codes:
# 0 = No changes (ideal for migrations)
# 1 = Error
# 2 = Changes detected (needs review)

# Analyze the plan
echo "=== Summary ==="
grep "Plan:" plan-output.log

echo "=== Destructive Changes ==="
grep -B5 "must be replaced\|will be destroyed" plan-output.log

echo "=== Moves ==="
grep "has moved to" plan-output.log

echo "=== Updates ==="
grep "will be updated" plan-output.log
```

For a successful migration, you want to see moves and zero creates or destroys:

```
Plan: 0 to add, 0 to change, 0 to destroy.
# 5 resources moved
```

## Technique 2: Test in a Separate Workspace

Create a test workspace to run the migration without affecting the default state:

```bash
# Create a test workspace
terraform workspace new migration-test

# The test workspace starts with empty state
# Copy current state to the test workspace
terraform state push production-state-backup.json

# Run the migration steps
terraform state mv aws_instance.old_name aws_instance.new_name

# Verify with plan
terraform plan

# Clean up
terraform workspace select default
terraform workspace delete migration-test
```

## Technique 3: Clone and Test

Create a complete copy of your configuration for testing:

```bash
#!/bin/bash
# clone-and-test.sh
# Create a test clone of the Terraform configuration

SOURCE_DIR=$(pwd)
TEST_DIR="/tmp/terraform-migration-test-$(date +%s)"

# Clone the configuration
cp -r "$SOURCE_DIR" "$TEST_DIR"
cd "$TEST_DIR"

# Use a separate state file for testing
# Override the backend to use local state
cat > backend_override.tf <<EOF
terraform {
  backend "local" {
    path = "test.tfstate"
  }
}
EOF

# Pull the current state and use it locally
cd "$SOURCE_DIR"
terraform state pull > "$TEST_DIR/current-state.json"
cd "$TEST_DIR"

# Initialize with local backend
terraform init -reconfigure

# Push the current state
terraform state push current-state.json

# Now perform migration steps
echo "Test environment ready at: $TEST_DIR"
echo "Run your migration steps here, then verify with 'terraform plan'"
```

## Technique 4: Dry-Run with State Operations

For state-level migrations, test individual operations:

```bash
# Test state mv with -dry-run (not available natively)
# Instead, use state pull and jq to simulate

# Pull current state
terraform state pull > test-state.json

# Check if the source resource exists
jq '.resources[] | select(.type == "aws_instance" and .name == "old_name")' test-state.json

# Check if the target address is free
jq '.resources[] | select(.type == "aws_instance" and .name == "new_name")' test-state.json
# Should return empty if available
```

## Technique 5: Terraform Validate

Run validation to catch configuration errors:

```bash
# Validate the configuration syntax and references
terraform validate

# Output:
# Success! The configuration is valid.
```

This catches issues like missing variables, invalid resource references, and syntax errors before you attempt any state operations.

## Technique 6: Automated Testing with Terratest

Write Go tests that verify migration behavior:

```go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestMigration(t *testing.T) {
    t.Parallel()

    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/migration-test",
        Vars: map[string]interface{}{
            "environment": "test",
        },
    }

    // Deploy initial configuration
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Verify initial state
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    // Apply migration (updated configuration)
    migratedOptions := &terraform.Options{
        TerraformDir: "../examples/migration-test-after",
        Vars: map[string]interface{}{
            "environment": "test",
        },
    }

    terraform.Init(t, migratedOptions)
    plan := terraform.InitAndPlanAndShow(t, migratedOptions)

    // Verify no destructive changes
    assert.Equal(t, 0, len(plan.ResourceChangesDestroy))
}
```

## Technique 7: Policy Testing with OPA

Use Open Policy Agent to enforce migration safety rules:

```rego
# migration_safety.rego
package terraform.migration

# Deny any resource destruction during migration
deny[msg] {
    resource := input.resource_changes[_]
    resource.change.actions[_] == "delete"
    not resource.change.actions[_] == "create"  # Allow replace
    msg := sprintf("Migration would destroy %s - this is not allowed", [resource.address])
}

# Deny any resource replacement during migration
deny[msg] {
    resource := input.resource_changes[_]
    resource.change.actions == ["delete", "create"]
    msg := sprintf("Migration would replace %s - use moved block instead", [resource.address])
}

# Allow only moves and no-ops
allow {
    count(deny) == 0
}
```

Test with the plan output:

```bash
# Generate plan in JSON format
terraform plan -out=migration.tfplan
terraform show -json migration.tfplan > plan.json

# Test with OPA
opa eval --data migration_safety.rego --input plan.json "data.terraform.migration.deny"
```

## Technique 8: Environment Progression

Test the migration through environments sequentially:

```bash
# Step 1: Test in development
cd environments/dev
# Run migration steps
terraform plan
terraform apply

# Step 2: Verify dev is stable (wait 24 hours)

# Step 3: Test in staging
cd environments/staging
# Run migration steps
terraform plan
terraform apply

# Step 4: Verify staging is stable (wait 48 hours)

# Step 5: Apply to production
cd environments/production
# Run migration steps
terraform plan
terraform apply
```

## Technique 9: Canary Migration

For high-risk migrations, test with a subset of resources first:

```bash
# Migrate one resource as a canary
terraform state mv aws_instance.web[0] module.compute.aws_instance.web["web-1"]

# Verify plan
terraform plan

# Monitor for issues (24 hours)

# If successful, migrate remaining resources
terraform state mv aws_instance.web[1] module.compute.aws_instance.web["web-2"]
terraform state mv aws_instance.web[2] module.compute.aws_instance.web["web-3"]
```

## Building a Migration Test Pipeline

```yaml
# .github/workflows/test-migration.yml
name: Test Terraform Migration
on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  test-migration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Initialize
        run: terraform init
        working-directory: terraform

      - name: Validate
        run: terraform validate
        working-directory: terraform

      - name: Plan
        run: terraform plan -detailed-exitcode -out=plan.tfplan
        working-directory: terraform

      - name: Check for destructive changes
        run: |
          terraform show -json plan.tfplan > plan.json
          DESTROYS=$(jq '[.resource_changes[] | select(.change.actions | contains(["delete"]))] | length' plan.json)
          if [ "$DESTROYS" -gt 0 ]; then
            echo "ERROR: Migration would destroy $DESTROYS resources"
            exit 1
          fi
        working-directory: terraform
```

## Best Practices

Always run terraform plan before any migration step. Test in lower environments before production. Use automated checks to catch destructive changes. Keep state backups at every step for easy rollback. Test individual state operations before batching them. Use environment progression (dev, staging, production) for all migrations. Document test results for audit and team reference.

## Conclusion

Testing Terraform migrations before applying them to production is non-negotiable for reliable infrastructure management. From simple plan analysis to automated CI/CD pipelines with policy enforcement, each technique adds a layer of confidence. The key is choosing the right combination of testing techniques for your migration's risk level and applying them consistently across all environments.

For related guides, see [How to Handle Rollback During Terraform Migration](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-rollback-during-terraform-migration/view) and [How to Create Migration Plans for Terraform Projects](https://oneuptime.com/blog/post/2026-02-23-how-to-create-migration-plans-for-terraform-projects/view).
