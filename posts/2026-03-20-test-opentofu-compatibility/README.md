# How to Test Terraform-to-OpenTofu Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Compatibility Testing, Migration, Infrastructure as Code, Testing

Description: Learn how to test that existing Terraform configurations are compatible with OpenTofu - using plan comparison, provider validation, and automated test suites to validate the migration before...

## Introduction

Before migrating production infrastructure from Terraform to OpenTofu, validate compatibility in a lower environment. The key test is: `tofu plan` should produce the same planned resource actions as `terraform plan` - no unexpected creates, updates, or destroys.

## Test 1: Plan Comparison

The most important test - matching planned actions are a strong compatibility signal:

```bash
# Step 1: Generate Terraform plan as JSON

terraform init
terraform plan -out=tf-plan.binary
terraform show -json tf-plan.binary > terraform-plan.json

# Step 2: Generate OpenTofu plan as JSON
tofu init
tofu plan -out=tofu-plan.binary
tofu show -json -plan=tofu-plan.binary > opentofu-plan.json

# Step 3: Compare resource actions - should match
jq '.resource_changes | sort_by(.address) | map({address, change: {actions: .change.actions}})' terraform-plan.json > tf-changes.json
jq '.resource_changes | sort_by(.address) | map({address, change: {actions: .change.actions}})' opentofu-plan.json > tofu-changes.json

diff tf-changes.json tofu-changes.json
# No output = same planned resource actions
```

## Test 2: No-Change Plan After tofu init

```bash
# Start from a Terraform-managed state
terraform apply   # Current state is Terraform-managed

# Switch to OpenTofu and verify no changes
rm .terraform.lock.hcl
tofu init
tofu plan

# Expected:
# No changes. Your infrastructure matches the configuration.
```

If the plan shows changes, investigate before proceeding:

```bash
# Get a detailed diff for unexpected changes
tofu plan -detailed-exitcode
# Exit 0 = no changes (safe to migrate)
# Exit 1 = error
# Exit 2 = changes detected (investigate)
```

## Test 3: Provider Compatibility

```bash
# Verify required providers can be installed from the OpenTofu registry
tofu init

# Inspect selected providers and versions in the lock file
grep -E 'provider|version' .terraform.lock.hcl

# Inspect provider requirements and state provider addresses
tofu providers

# Example output shows provider addresses:
# Providers required by configuration:
# .
# |-- provider[registry.opentofu.org/hashicorp/aws]
# `-- provider[registry.opentofu.org/hashicorp/random]
```

## Test 4: Automated Compatibility Test Suite

```bash
#!/bin/bash
# scripts/test-opentofu-compat.sh

set -euo pipefail

ENVIRONMENTS=("dev" "staging")
MODULES=("networking" "compute" "databases")

echo "Testing OpenTofu compatibility..."

for env in "${ENVIRONMENTS[@]}"; do
  for module in "${MODULES[@]}"; do
    DIR="environments/$env/$module"
    echo "Testing $DIR..."

    # Clean init with OpenTofu
    rm -f "$DIR/.terraform.lock.hcl"
    tofu -chdir="$DIR" init -input=false 2>&1

    # Validate syntax and configuration
    tofu -chdir="$DIR" validate 2>&1

    # Plan must show no changes (exit code 0)
    if tofu -chdir="$DIR" plan -detailed-exitcode -input=false 2>&1; then
      EXIT_CODE=0
    else
      EXIT_CODE=$?
    fi

    if [ $EXIT_CODE -eq 0 ]; then
      echo "  ✅ $DIR: Compatible, no changes"
    elif [ $EXIT_CODE -eq 2 ]; then
      echo "  ⚠️  $DIR: Changes detected; investigate before migrating"
      exit 1
    else
      echo "  ❌ $DIR: INCOMPATIBLE or error"
      exit 1
    fi
  done
done

echo "All compatibility tests passed!"
```

## Test 5: Terratest with OpenTofu Binary

```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPCModuleOpenTofu(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir:    "../modules/vpc",
        TerraformBinary: "tofu",   // Use tofu instead of terraform
        Vars: map[string]interface{}{
            "environment": "test",
            "cidr":        "10.99.0.0/16",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    vpcID := terraform.Output(t, opts, "vpc_id")
    assert.NotEmpty(t, vpcID)
    assert.Regexp(t, "^vpc-", vpcID)
}
```

## Test 6: Feature Compatibility Matrix

```bash
# Test version-specific features you plan to use
# Create a test configuration with the new features

mkdir -p /tmp/test-write-only
cat > /tmp/test-write-only/main.tf << 'EOF'
terraform {
  required_version = ">= 1.11"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

# Test write-only attributes (OpenTofu 1.11+)
resource "aws_ssm_parameter" "test" {
  name             = "/test/write-only"
  type             = "SecureString"
  value_wo         = "test-value"
  value_wo_version = 1
}
EOF

tofu -chdir=/tmp/test-write-only init
tofu -chdir=/tmp/test-write-only validate
echo "Write-only attributes supported: $?"
```

## Conclusion

Test OpenTofu compatibility by comparing plan JSON output from both tools - matching planned resource actions are a strong signal for a safe migration. Run `tofu plan -detailed-exitcode` against existing Terraform state and verify exit code 0 (no changes). Automate this with a compatibility test script across all environments and modules. Use Terratest with `TerraformBinary: "tofu"` to validate module behavior. Only migrate to production after all compatibility tests pass in development and staging.
