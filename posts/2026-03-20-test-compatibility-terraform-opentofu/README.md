# How to Test Compatibility Between Terraform and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Compatibility, Testing, Migration, Infrastructure as Code

Description: Learn how to test and verify that your existing Terraform configurations are fully compatible with OpenTofu before committing to a migration.

## Introduction

OpenTofu aims to maintain compatibility with Terraform configurations, but subtle differences can exist - especially with newer Terraform versions or features. Testing compatibility before migrating ensures a smooth transition without surprises.

## Side-by-Side Comparison Approach

The safest way to test compatibility is running both tools against the same configuration and comparing outputs:

```bash
# Run with Terraform

terraform init
terraform plan -out=tf.plan
terraform show -json tf.plan > tf-plan.json

# Run with OpenTofu
tofu init
tofu plan -out=tofu.plan
tofu show -json tofu.plan > tofu-plan.json

# Compare planned resource and output changes
jq '{resource_changes, output_changes}' tf-plan.json > tf-changes.json
jq '{resource_changes, output_changes}' tofu-plan.json > tofu-changes.json
diff -u tf-changes.json tofu-changes.json
```

## Checking Provider Compatibility

Verify all providers work with OpenTofu:

```bash
# List providers required by your config and state
terraform providers
tofu providers

# Initialize with OpenTofu and review diagnostics
tofu init
```

## Testing State Compatibility

Test that OpenTofu can read your existing state file or backend without issues in an isolated test directory:

```bash
# Copy configuration and local state to a test directory
mkdir -p /tmp/test-tofu
rsync -a --exclude='.terraform' --exclude='*.plan' ./ /tmp/test-tofu/

cd /tmp/test-tofu
tofu init
tofu show   # Should display the selected state without errors
tofu plan   # Should show no unexpected changes compared with Terraform
```

## Validate HCL Syntax

```bash
tofu validate
```

OpenTofu's validator may flag syntax that Terraform allows or vice versa.

## Check for Unsupported Features

Some features differ between tools. Scan for potential issues:

```bash
# Check for removed vendor-specific provisioners
grep -R 'provisioner "\(chef\|habitat\|puppet\|salt-masterless\)"' . --include="*.tf"

# Check for the legacy terraform provider, which OpenTofu does not support
grep -R 'source[[:space:]]*=[[:space:]]*"hashicorp/terraform"' . --include="*.tf"
```

## Automated Compatibility Test Script

```bash
#!/bin/bash
set -e

echo "=== Testing Terraform ==="
terraform init -reconfigure
terraform validate
terraform plan -out=tf.plan
terraform show -json tf.plan | jq '{resource_changes, output_changes}' > tf-changes.json

echo "=== Testing OpenTofu ==="
tofu init -reconfigure
tofu validate
tofu plan -out=tofu.plan
tofu show -json tofu.plan | jq '{resource_changes, output_changes}' > tofu-changes.json

if diff -u tf-changes.json tofu-changes.json; then
    echo "PASS: Planned changes match"
else
    echo "FAIL: Planned changes differ"
    exit 1
fi
```

## Known Differences to Watch For

- OpenTofu 1.6+ supports `tofu test` natively
- OpenTofu uses its own registry at `registry.opentofu.org`
- Some `terraform` CLI behaviors differ slightly from `tofu`
- OpenTofu adds features not in Terraform (e.g., state and plan `encryption` blocks)

## Conclusion

Testing compatibility before migrating from Terraform to OpenTofu reduces risk and builds confidence. A side-by-side plan comparison is the most reliable method to identify any behavioral differences before committing to the switch.
