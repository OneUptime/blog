# How to Test Terraform Provider Updates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Testing, Upgrade, Infrastructure as Code, DevOps

Description: Learn how to safely test Terraform provider updates with plan comparison, automated compatibility testing, and staged rollout strategies that prevent breaking changes.

---

Terraform providers are the bridge between your configuration and cloud APIs. When a provider updates, the bridge can shift. New required attributes appear, defaults change, resource schemas evolve, and sometimes entire resources get deprecated. Testing provider updates before deploying them is essential because a provider change can cause Terraform to modify, replace, or destroy resources you did not intend to touch.

## Understanding Provider Update Risks

Provider updates come in three flavors:

- **Patch versions** (5.30.0 to 5.30.1): Bug fixes. Usually safe but can change behavior if you were depending on a bug.
- **Minor versions** (5.30.0 to 5.31.0): New features and resources. Can add new default values or change computed attributes.
- **Major versions** (4.x to 5.x): Breaking changes. Resources might be renamed, removed, or restructured.

The AWS provider alone has hundreds of resources, and any update can change how any of them behave. You cannot review every change manually. Automated testing is the only practical approach.

## Detecting Available Updates

Start by knowing when updates are available.

```bash
#!/bin/bash
# scripts/check-provider-updates.sh
# Check for available provider updates

echo "Checking for provider updates..."

# Parse current versions from the lock file
while IFS= read -r line; do
    if [[ "$line" =~ provider.*\"(.*)\" ]]; then
        PROVIDER="${BASH_REMATCH[1]}"
    fi
    if [[ "$line" =~ version.*=.*\"(.*)\" ]]; then
        VERSION="${BASH_REMATCH[1]}"
        if [ -n "$PROVIDER" ]; then
            # Get latest version from registry
            NAMESPACE=$(echo "$PROVIDER" | cut -d/ -f1)
            NAME=$(echo "$PROVIDER" | cut -d/ -f2)
            LATEST=$(curl -s "https://registry.terraform.io/v1/providers/$NAMESPACE/$NAME" | \
              jq -r '.version' 2>/dev/null)

            if [ "$VERSION" != "$LATEST" ] && [ -n "$LATEST" ]; then
                echo "  UPDATE: $PROVIDER $VERSION -> $LATEST"
            else
                echo "  CURRENT: $PROVIDER $VERSION"
            fi
            PROVIDER=""
        fi
    fi
done < .terraform.lock.hcl
```

## Plan Comparison Testing

The most reliable test for a provider update is comparing plans before and after.

```bash
#!/bin/bash
# scripts/test-provider-update.sh
# Test a provider update by comparing plans

ENVIRONMENT="${1:-dev}"
ENV_DIR="environments/$ENVIRONMENT"

echo "Testing provider update in $ENVIRONMENT"

cd "$ENV_DIR"

# Step 1: Plan with current provider version
echo "Generating plan with current providers..."
terraform init
terraform plan -out=plan-before.tfplan -input=false
terraform show -json plan-before.tfplan > plan-before.json

# Extract summary
echo "Current plan summary:"
jq '{
  creates: [.resource_changes[] | select(.change.actions | contains(["create"])) | .address],
  updates: [.resource_changes[] | select(.change.actions | contains(["update"])) | .address],
  deletes: [.resource_changes[] | select(.change.actions | contains(["delete"])) | .address],
  no_ops:  [.resource_changes[] | select(.change.actions == ["no-op"]) | .address] | length
}' plan-before.json

# Step 2: Upgrade providers
echo ""
echo "Upgrading providers..."
terraform init -upgrade

# Show what changed
echo "Provider versions after upgrade:"
terraform providers

# Step 3: Plan with upgraded providers
echo ""
echo "Generating plan with upgraded providers..."
terraform plan -out=plan-after.tfplan -input=false
terraform show -json plan-after.tfplan > plan-after.json

# Step 4: Compare
echo ""
echo "Updated plan summary:"
jq '{
  creates: [.resource_changes[] | select(.change.actions | contains(["create"])) | .address],
  updates: [.resource_changes[] | select(.change.actions | contains(["update"])) | .address],
  deletes: [.resource_changes[] | select(.change.actions | contains(["delete"])) | .address],
  no_ops:  [.resource_changes[] | select(.change.actions == ["no-op"]) | .address] | length
}' plan-after.json

# Step 5: Identify differences
echo ""
echo "Difference in planned actions:"
diff <(jq -S '[.resource_changes[] | {address, actions: .change.actions}]' plan-before.json) \
     <(jq -S '[.resource_changes[] | {address, actions: .change.actions}]' plan-after.json)

DIFF_EXIT=$?
if [ $DIFF_EXIT -eq 0 ]; then
    echo "No differences in planned actions. Provider update appears safe."
else
    echo ""
    echo "WARNING: Provider update changes the plan. Review carefully."
fi

# Cleanup
rm -f plan-before.* plan-after.*
```

## Automated Provider Compatibility Testing

Create a CI workflow that tests provider updates automatically.

```yaml
# .github/workflows/provider-update-test.yml
name: Provider Update Test

on:
  schedule:
    # Check weekly
    - cron: '0 4 * * 1'
  workflow_dispatch:

jobs:
  check-updates:
    runs-on: ubuntu-latest
    outputs:
      has_updates: ${{ steps.check.outputs.has_updates }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - id: check
        run: |
          terraform init
          CURRENT=$(terraform version -json | jq -r '.provider_selections | to_entries[] | "\(.key)=\(.value)"')

          terraform init -upgrade
          UPDATED=$(terraform version -json | jq -r '.provider_selections | to_entries[] | "\(.key)=\(.value)"')

          if [ "$CURRENT" != "$UPDATED" ]; then
            echo "has_updates=true" >> $GITHUB_OUTPUT
            echo "Provider updates available"
            diff <(echo "$CURRENT") <(echo "$UPDATED") || true
          else
            echo "has_updates=false" >> $GITHUB_OUTPUT
            echo "All providers are current"
          fi

  test-with-updates:
    needs: check-updates
    if: needs.check-updates.outputs.has_updates == 'true'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        module: [networking, compute, database, monitoring]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TEST_ROLE }}
          aws-region: us-east-1

      - name: Test with Updated Providers
        working-directory: modules/${{ matrix.module }}
        run: |
          # Init with upgraded providers
          terraform init -upgrade

          # Run the full test suite
          terraform test -verbose

      - name: Plan Comparison
        working-directory: modules/${{ matrix.module }}
        run: |
          # Save the plan for review
          terraform plan -out=updated.tfplan -input=false
          terraform show updated.tfplan > plan-output.txt

          echo "## Plan with Updated Providers - ${{ matrix.module }}" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          cat plan-output.txt >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

  create-pr:
    needs: test-with-updates
    if: success()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Upgrade and Commit
        run: |
          terraform init -upgrade
          # The lock file is what captures provider versions

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          title: "chore: update Terraform provider versions"
          body: |
            Automated provider update. All module tests passed.
            Review the plan comparisons in the workflow run.
          branch: terraform-provider-updates
          commit-message: "chore: update Terraform provider versions"
          labels: terraform,dependencies
```

## Testing Specific Provider Changes

When a provider introduces a breaking change, test it in isolation.

```go
// test/provider_update_test.go
package test

import (
    "encoding/json"
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestProviderUpdateNoDestroy(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../environments/dev",
    }

    // Get the plan after provider upgrade
    planJSON := terraform.InitAndPlanAndShow(t, opts)

    var plan map[string]interface{}
    require.NoError(t, json.Unmarshal([]byte(planJSON), &plan))

    // Check that no resources are being destroyed
    changes := plan["resource_changes"].([]interface{})
    for _, c := range changes {
        change := c.(map[string]interface{})
        actions := change["change"].(map[string]interface{})["actions"].([]interface{})

        address := change["address"].(string)

        for _, action := range actions {
            assert.NotEqual(t, "delete", action.(string),
                "Provider update should not destroy resource %s", address)
        }
    }
}

func TestProviderUpdateNoReplace(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../environments/dev",
    }

    planJSON := terraform.InitAndPlanAndShow(t, opts)

    var plan map[string]interface{}
    require.NoError(t, json.Unmarshal([]byte(planJSON), &plan))

    changes := plan["resource_changes"].([]interface{})
    for _, c := range changes {
        change := c.(map[string]interface{})
        actions := change["change"].(map[string]interface{})["actions"].([]interface{})
        address := change["address"].(string)

        // Check for replace actions (delete+create or create+delete)
        hasCreate := false
        hasDelete := false
        for _, action := range actions {
            if action.(string) == "create" {
                hasCreate = true
            }
            if action.(string) == "delete" {
                hasDelete = true
            }
        }

        assert.False(t, hasCreate && hasDelete,
            "Provider update should not replace resource %s", address)
    }
}
```

## Version Pinning Strategy

Use version constraints that allow testing before upgrades:

```hcl
# versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # Pin to minor version - allows patches automatically
      version = "~> 5.30"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      # Pin to exact version - require explicit upgrades
      version = "= 3.85.0"
    }
  }
}
```

The lock file (`.terraform.lock.hcl`) pins exact versions regardless of your constraints. Commit it to version control so everyone uses the same provider versions. When you are ready to upgrade, run `terraform init -upgrade` and commit the updated lock file after testing.

## Rollback Procedure

If a provider update causes problems after deployment:

```bash
#!/bin/bash
# scripts/rollback-provider.sh
# Rollback to previous provider version

# Restore the previous lock file from Git
git checkout HEAD~1 -- .terraform.lock.hcl

# Re-initialize with the old versions
terraform init

# Verify the plan is clean
terraform plan
```

Provider updates are a constant part of managing Terraform infrastructure. Automate the testing, stage the rollouts, and always have a rollback plan. The weekly check-and-test workflow catches most issues before they become problems.

For more on upgrade testing, see [How to Test Terraform Upgrades Before Deploying](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-upgrades-before-deploying/view) and [How to Set Up Continuous Testing for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-continuous-testing-for-terraform-modules/view).
