# How to Test Terraform Upgrades Before Deploying

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Upgrades, Testing, Migration, Infrastructure as Code, DevOps

Description: Learn how to safely test Terraform version upgrades and module upgrades before deploying to production with plan comparison, staged rollouts, and automated validation.

---

Upgrading Terraform - whether the CLI version, a provider, or a module - can introduce subtle changes that break your infrastructure. A new Terraform version might change how it evaluates expressions. A provider update might add new required fields or change default values. A module upgrade might rename outputs your configuration depends on. Testing upgrades before deploying them to production is the only way to avoid unpleasant surprises.

## Types of Terraform Upgrades

There are three categories of upgrades, each with different risk profiles:

1. **Terraform CLI version**: Changes to the core engine - expression evaluation, state format, plan behavior
2. **Provider versions**: Changes to resource schemas, defaults, and API interactions
3. **Module versions**: Changes to inputs, outputs, and internal resource configurations

Each needs a different testing approach.

## Testing Terraform CLI Upgrades

### Step 1: Check the Changelog

Before any testing, read the upgrade guide for the target version. HashiCorp publishes detailed guides for minor and major version bumps.

```bash
# Check your current version
terraform version

# Download the new version alongside the current one
# Use tfenv for easy version switching
tfenv install 1.8.0
tfenv use 1.8.0
terraform version
```

### Step 2: Plan Comparison

Generate plans with both versions and compare them.

```bash
#!/bin/bash
# scripts/compare-plans.sh
# Compare Terraform plans between two versions

OLD_VERSION="${1:-1.7.0}"
NEW_VERSION="${2:-1.8.0}"
DIR="${3:-.}"

echo "Comparing plans: $OLD_VERSION vs $NEW_VERSION"
echo "Directory: $DIR"

# Generate plan with old version
tfenv use "$OLD_VERSION"
cd "$DIR"
terraform init -upgrade > /dev/null 2>&1
terraform plan -out=plan-old.tfplan -input=false > /dev/null 2>&1
terraform show -json plan-old.tfplan > plan-old.json

# Generate plan with new version
tfenv use "$NEW_VERSION"
terraform init -upgrade > /dev/null 2>&1
terraform plan -out=plan-new.tfplan -input=false > /dev/null 2>&1
terraform show -json plan-new.tfplan > plan-new.json

# Compare resource changes
echo ""
echo "Old version resource changes:"
jq '[.resource_changes[] | {address, actions: .change.actions}]' plan-old.json

echo ""
echo "New version resource changes:"
jq '[.resource_changes[] | {address, actions: .change.actions}]' plan-new.json

# Diff the normalized plans
echo ""
echo "Differences:"
diff <(jq -S '.resource_changes | map({address, type, actions: .change.actions})' plan-old.json) \
     <(jq -S '.resource_changes | map({address, type, actions: .change.actions})' plan-new.json) \
     || echo "Plans differ!"

# Cleanup
rm -f plan-old.tfplan plan-new.tfplan plan-old.json plan-new.json
```

### Step 3: Run the Test Suite

Run your existing tests with the new version:

```bash
# Switch to new version
tfenv use 1.8.0

# Run all tests
for module in modules/*/; do
  echo "Testing $module with Terraform $(terraform version -json | jq -r .terraform_version)..."
  cd "$module"
  terraform init -upgrade
  terraform test -verbose
  cd -
done
```

### Step 4: State Compatibility Check

Verify the new version can read existing state files:

```bash
#!/bin/bash
# scripts/check-state-compat.sh
# Verify state file compatibility with new Terraform version

DIR="${1:-.}"
NEW_VERSION="${2:-1.8.0}"

tfenv use "$NEW_VERSION"
cd "$DIR"

# Init with new version
terraform init -upgrade

# Try to read the existing state
echo "Checking state compatibility..."
if terraform state list > /dev/null 2>&1; then
    echo "PASS: State is readable with $NEW_VERSION"

    # Check for planned changes
    terraform plan -detailed-exitcode > /dev/null 2>&1
    EXIT=$?

    if [ $EXIT -eq 0 ]; then
        echo "PASS: No unexpected changes with new version"
    elif [ $EXIT -eq 2 ]; then
        echo "WARNING: New version produces different plan"
        terraform plan
    fi
else
    echo "FAIL: Cannot read state with $NEW_VERSION"
    exit 1
fi
```

## Testing Provider Upgrades

Provider upgrades are riskier than CLI upgrades because they can change resource behavior.

```bash
#!/bin/bash
# scripts/test-provider-upgrade.sh
# Test a provider version upgrade

PROVIDER="hashicorp/aws"
OLD_VERSION="5.30.0"
NEW_VERSION="5.35.0"

echo "Testing provider upgrade: $PROVIDER $OLD_VERSION -> $NEW_VERSION"

# Step 1: Plan with old version
cat > version-override.tf << EOF
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= $OLD_VERSION"
    }
  }
}
EOF

terraform init -upgrade
terraform plan -out=plan-old.tfplan
terraform show -json plan-old.tfplan > plan-old.json

# Step 2: Plan with new version
cat > version-override.tf << EOF
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= $NEW_VERSION"
    }
  }
}
EOF

terraform init -upgrade
terraform plan -out=plan-new.tfplan
terraform show -json plan-new.tfplan > plan-new.json

# Step 3: Compare
echo ""
echo "Changes in plan behavior:"
diff <(jq -S '.resource_changes' plan-old.json) \
     <(jq -S '.resource_changes' plan-new.json)

# Clean up
rm -f version-override.tf plan-old.* plan-new.*
```

## Automated Upgrade Testing with CI

```yaml
# .github/workflows/upgrade-test.yml
name: Terraform Upgrade Test

on:
  workflow_dispatch:
    inputs:
      terraform_version:
        description: 'New Terraform version to test'
        required: true
      current_version:
        description: 'Current Terraform version'
        required: true

jobs:
  test-upgrade:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging]
    steps:
      - uses: actions/checkout@v4

      - name: Test with Current Version
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ inputs.current_version }}

      - name: Generate Current Plan
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform init
          terraform plan -out=current.tfplan
          terraform show -json current.tfplan > current.json

      - name: Test with New Version
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ inputs.terraform_version }}

      - name: Generate New Plan
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform init -upgrade
          terraform plan -out=new.tfplan
          terraform show -json new.tfplan > new.json

      - name: Compare Plans
        working-directory: environments/${{ matrix.environment }}
        run: |
          echo "## Plan Comparison - ${{ matrix.environment }}" >> $GITHUB_STEP_SUMMARY

          # Compare resource actions
          OLD_ACTIONS=$(jq '[.resource_changes[] | .change.actions] | flatten | group_by(.) | map({(.[0]): length}) | add' current.json)
          NEW_ACTIONS=$(jq '[.resource_changes[] | .change.actions] | flatten | group_by(.) | map({(.[0]): length}) | add' new.json)

          echo "Current version actions: $OLD_ACTIONS" >> $GITHUB_STEP_SUMMARY
          echo "New version actions: $NEW_ACTIONS" >> $GITHUB_STEP_SUMMARY

          # Fail if new version would destroy resources
          DESTROYS=$(jq '[.resource_changes[] | select(.change.actions | contains(["delete"]))] | length' new.json)
          OLD_DESTROYS=$(jq '[.resource_changes[] | select(.change.actions | contains(["delete"]))] | length' current.json)

          if [ "$DESTROYS" -gt "$OLD_DESTROYS" ]; then
            echo "WARNING: New version would destroy more resources!" >> $GITHUB_STEP_SUMMARY
            exit 1
          fi

      - name: Run Test Suite with New Version
        working-directory: modules
        run: |
          for dir in */; do
            if [ -d "$dir/tests" ]; then
              echo "Testing $dir..."
              cd "$dir"
              terraform init -upgrade
              terraform test -verbose || exit 1
              cd ..
            fi
          done
```

## Staged Rollout Strategy

Do not upgrade all environments at once. Follow a staged approach:

```
1. Test in CI with both versions (plan comparison)
2. Upgrade development environment
3. Run full test suite against dev
4. Wait 1 week, monitor for issues
5. Upgrade staging environment
6. Run integration tests against staging
7. Wait 1 week, monitor for issues
8. Upgrade production environment
```

Track the rollout:

```bash
#!/bin/bash
# scripts/upgrade-status.sh
# Check Terraform version across environments

for env in dev staging production; do
  VERSION=$(cd "environments/$env" && terraform version -json | jq -r '.terraform_version')
  echo "$env: Terraform $VERSION"
done
```

## Rollback Planning

Always have a rollback plan before upgrading:

```bash
#!/bin/bash
# scripts/prepare-rollback.sh
# Save everything needed for rollback

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Save current versions
terraform version > "$BACKUP_DIR/terraform-version.txt"
cp .terraform.lock.hcl "$BACKUP_DIR/"

# Save state backups
for env in dev staging production; do
  cd "environments/$env"
  terraform state pull > "$BACKUP_DIR/${env}-state.json"
  cd -
done

echo "Rollback backup saved to $BACKUP_DIR"
echo "To rollback:"
echo "  1. Switch Terraform version: tfenv use \$(cat $BACKUP_DIR/terraform-version.txt | head -1 | awk '{print \$2}')"
echo "  2. Restore lock file: cp $BACKUP_DIR/.terraform.lock.hcl ."
echo "  3. Restore state if needed: terraform state push $BACKUP_DIR/<env>-state.json"
```

Testing upgrades is about eliminating surprises. The investment in plan comparison and staged rollouts is much smaller than the cost of a production incident caused by an untested upgrade. Start with plan comparison - it catches most issues - and add more sophisticated testing as your infrastructure grows.

For related topics, see [How to Test Terraform Provider Updates](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-provider-updates/view) and [How to Test Terraform Rollback Procedures](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-rollback-procedures/view).
