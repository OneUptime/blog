# How to Test Terraform Rollback Procedures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Rollback, Disaster Recovery, Infrastructure as Code, DevOps

Description: Learn how to test Terraform rollback procedures including state restoration, configuration reverts, and blue-green rollbacks before you need them in an emergency.

---

When a Terraform deployment goes wrong, you need to roll back. But if you have never tested your rollback procedure, you are gambling that it works under the worst possible conditions - high stress, partial failures, and time pressure. Testing rollbacks in advance turns a potential disaster into a practiced procedure. This guide covers how to test different rollback strategies for Terraform.

## Rollback Strategies for Terraform

Terraform does not have a built-in "rollback" command. Instead, you have several strategies:

1. **Git revert**: Revert the configuration change and re-apply
2. **State restoration**: Restore a previous state file
3. **Targeted destroy**: Remove the problematic resources
4. **Blue-green switch**: Switch traffic back to the old environment
5. **Import and reconcile**: Import the desired state manually

Each strategy works for different failure modes, and each needs testing.

## Testing Git Revert Rollback

The simplest rollback: revert the code change and apply the previous configuration.

```bash
#!/bin/bash
# scripts/test-git-revert-rollback.sh
# Test that reverting a commit produces a clean rollback

set -e

ENVIRONMENT="${1:-dev}"
ENV_DIR="environments/$ENVIRONMENT"

echo "Testing git revert rollback for $ENVIRONMENT"

# Step 1: Apply the current state (baseline)
echo "Step 1: Applying baseline..."
cd "$ENV_DIR"
terraform init
terraform apply -auto-approve

# Save the baseline state and outputs
terraform state pull > /tmp/baseline-state.json
terraform output -json > /tmp/baseline-outputs.json

echo "Baseline applied. Resources:"
terraform state list

# Step 2: Make a change (simulate a bad deployment)
echo ""
echo "Step 2: Applying change..."
cd -

# Create a change branch
git checkout -b test-rollback-change
# Make a change to the configuration
cat >> "$ENV_DIR/extra.tf" << 'EOF'
resource "aws_s3_bucket" "rollback_test" {
  bucket = "rollback-test-${random_id.suffix.hex}"
}
resource "random_id" "suffix" {
  byte_length = 4
}
EOF

cd "$ENV_DIR"
terraform init
terraform apply -auto-approve

echo "Change applied. Resources:"
terraform state list

# Step 3: Revert the change
echo ""
echo "Step 3: Reverting change..."
cd -
git checkout main
rm -f "$ENV_DIR/extra.tf"

cd "$ENV_DIR"
terraform init
terraform apply -auto-approve

echo "Revert applied. Resources:"
terraform state list

# Step 4: Verify rollback
echo ""
echo "Step 4: Verifying rollback..."
terraform output -json > /tmp/rollback-outputs.json

if diff <(jq -S . /tmp/baseline-outputs.json) <(jq -S . /tmp/rollback-outputs.json) > /dev/null; then
    echo "PASS: Outputs match baseline after rollback"
else
    echo "FAIL: Outputs differ from baseline"
    diff <(jq -S . /tmp/baseline-outputs.json) <(jq -S . /tmp/rollback-outputs.json)
fi

# Verify no extra resources remain
BASELINE_COUNT=$(jq 'length' /tmp/baseline-state.json)
CURRENT_STATE=$(terraform state pull)
CURRENT_COUNT=$(echo "$CURRENT_STATE" | jq '.resources | length')

echo "Baseline resources: $BASELINE_COUNT"
echo "Current resources: $CURRENT_COUNT"
```

## Testing State Restoration Rollback

When things go really wrong, you might need to restore a previous state file.

```bash
#!/bin/bash
# scripts/test-state-restore.sh
# Test restoring a Terraform state backup

set -e

ENVIRONMENT="${1:-dev}"
ENV_DIR="environments/$ENVIRONMENT"

cd "$ENV_DIR"
terraform init

# Step 1: Save current state as backup
echo "Step 1: Creating state backup..."
terraform state pull > /tmp/state-backup.json
echo "Backed up $(terraform state list | wc -l) resources"

# Step 2: Make changes
echo ""
echo "Step 2: Applying changes..."
terraform apply -auto-approve -var="instance_count=3"
echo "After change: $(terraform state list | wc -l) resources"

# Step 3: Simulate needing to restore
echo ""
echo "Step 3: Restoring state backup..."

# For local state
terraform state push /tmp/state-backup.json

# For remote state (S3 backend), you would:
# aws s3 cp s3://bucket/path/terraform.tfstate s3://bucket/path/terraform.tfstate.broken
# aws s3 cp /tmp/state-backup.json s3://bucket/path/terraform.tfstate

echo "After restore: $(terraform state list | wc -l) resources"

# Step 4: Plan to see what Terraform wants to do
echo ""
echo "Step 4: Running plan after state restore..."
terraform plan -detailed-exitcode
EXIT=$?

if [ $EXIT -eq 2 ]; then
    echo ""
    echo "Terraform wants to make changes to reconcile."
    echo "Review the plan carefully before applying."
elif [ $EXIT -eq 0 ]; then
    echo "State matches infrastructure. Restore successful."
fi
```

## Automated Rollback Tests with Terratest

```go
// test/rollback_test.go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestGitRevertRollback(t *testing.T) {
    t.Parallel()

    // Step 1: Apply baseline configuration
    baselineOpts := &terraform.Options{
        TerraformDir: "../fixtures/rollback/baseline",
        Vars: map[string]interface{}{
            "name_prefix": "rollback-test",
        },
    }

    defer terraform.Destroy(t, baselineOpts)
    terraform.InitAndApply(t, baselineOpts)

    baselineVpcId := terraform.Output(t, baselineOpts, "vpc_id")
    require.NotEmpty(t, baselineVpcId)

    // Step 2: Apply the change
    changeOpts := &terraform.Options{
        TerraformDir: "../fixtures/rollback/change",
        Vars: map[string]interface{}{
            "name_prefix": "rollback-test",
        },
    }

    terraform.InitAndApply(t, changeOpts)

    changeVpcId := terraform.Output(t, changeOpts, "vpc_id")
    // VPC should be the same (not recreated)
    assert.Equal(t, baselineVpcId, changeVpcId, "VPC should not be recreated during change")

    // Step 3: Rollback to baseline
    terraform.InitAndApply(t, baselineOpts)

    rollbackVpcId := terraform.Output(t, baselineOpts, "vpc_id")
    assert.Equal(t, baselineVpcId, rollbackVpcId, "VPC should survive rollback")
}

func TestStateRestoreRollback(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../fixtures/rollback/baseline",
        Vars: map[string]interface{}{
            "name_prefix": "state-restore-test",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Save the state
    stateBeforeChange := terraform.RunTerraformCommand(t, opts, "state", "pull")

    // Make a change
    changeOpts := &terraform.Options{
        TerraformDir: "../fixtures/rollback/change",
        Vars: map[string]interface{}{
            "name_prefix": "state-restore-test",
        },
    }
    terraform.InitAndApply(t, changeOpts)

    // Restore the previous state
    // Write state to temp file and push it
    tmpFile := "/tmp/test-state-restore.json"
    os.WriteFile(tmpFile, []byte(stateBeforeChange), 0644)
    terraform.RunTerraformCommand(t, opts, "state", "push", tmpFile)

    // Plan should show the change resources need to be destroyed
    exitCode := terraform.PlanExitCode(t, opts)
    assert.Equal(t, 2, exitCode, "Plan should show changes after state restore")
}
```

## Testing Blue-Green Rollback

Blue-green deployments let you rollback by switching traffic back to the old environment.

```hcl
# fixtures/rollback/blue-green/main.tf

variable "active_environment" {
  type    = string
  default = "blue"
}

# Blue environment
module "blue" {
  source = "../../modules/app"

  name    = "blue"
  version = var.blue_version
}

# Green environment
module "green" {
  source = "../../modules/app"

  name    = "green"
  version = var.green_version
}

# Route traffic to the active environment
resource "aws_route53_record" "app" {
  zone_id = var.zone_id
  name    = "app.example.com"
  type    = "CNAME"
  ttl     = 60

  records = [
    var.active_environment == "blue" ?
      module.blue.endpoint :
      module.green.endpoint
  ]
}
```

Test the rollback:

```hcl
# tests/blue-green-rollback.tftest.hcl

# Deploy to blue
run "deploy_blue" {
  command = apply

  variables {
    active_environment = "blue"
    blue_version       = "1.0"
    green_version      = "1.0"
  }

  assert {
    condition     = aws_route53_record.app.records[0] == module.blue.endpoint
    error_message = "Traffic should route to blue"
  }
}

# Switch to green (new deployment)
run "switch_to_green" {
  command = apply

  variables {
    active_environment = "green"
    blue_version       = "1.0"
    green_version      = "2.0"
  }

  assert {
    condition     = aws_route53_record.app.records[0] == module.green.endpoint
    error_message = "Traffic should route to green"
  }
}

# Rollback to blue
run "rollback_to_blue" {
  command = apply

  variables {
    active_environment = "blue"
    blue_version       = "1.0"
    green_version      = "2.0"
  }

  assert {
    condition     = aws_route53_record.app.records[0] == module.blue.endpoint
    error_message = "Traffic should route back to blue after rollback"
  }
}
```

## Testing Targeted Destroy Rollback

Sometimes you just need to remove the new resources, not roll back everything.

```bash
#!/bin/bash
# scripts/test-targeted-destroy.sh
# Test destroying specific resources as a rollback mechanism

ENVIRONMENT="${1:-dev}"
cd "environments/$ENVIRONMENT"

terraform init

# Step 1: Get the list of resources before the change
terraform state list > /tmp/resources-before.txt

# Step 2: Apply the change
terraform apply -auto-approve

# Step 3: Find new resources
terraform state list > /tmp/resources-after.txt
NEW_RESOURCES=$(diff /tmp/resources-before.txt /tmp/resources-after.txt | \
  grep "^>" | sed 's/^> //')

if [ -z "$NEW_RESOURCES" ]; then
    echo "No new resources created."
    exit 0
fi

echo "New resources that would be destroyed in rollback:"
echo "$NEW_RESOURCES"

# Step 4: Destroy only the new resources
echo ""
echo "Destroying new resources..."
for resource in $NEW_RESOURCES; do
    echo "  Destroying $resource..."
    terraform destroy -target="$resource" -auto-approve
done

# Step 5: Verify
echo ""
echo "After targeted destroy:"
terraform state list
```

## Rollback Runbook Template

Document your rollback procedures and test them regularly:

```markdown
## Rollback Runbook

### Pre-Rollback Checks
- [ ] Identify what changed (git log, terraform state)
- [ ] Assess impact (which environments, which resources)
- [ ] Notify team

### Option A: Git Revert
1. `git revert <commit-hash>`
2. `terraform plan` - review the rollback plan
3. `terraform apply` - apply the rollback
4. Verify services are healthy

### Option B: State Restore
1. Find the state backup (S3 versioning or manual backup)
2. `terraform state push <backup-file>`
3. `terraform plan` - review the reconciliation plan
4. `terraform apply` - apply to match infrastructure to state
5. Verify services are healthy

### Option C: Blue-Green Switch
1. Update active_environment variable to previous color
2. `terraform plan` - should only change the DNS/LB record
3. `terraform apply`
4. Verify traffic flows to old environment

### Post-Rollback
- [ ] Verify all services are healthy
- [ ] Update status page
- [ ] Conduct post-mortem
```

Test this runbook quarterly. The worst time to discover your rollback procedure does not work is during an actual incident.

For related topics, see [How to Test Terraform State Operations](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-state-operations/view) and [How to Test Terraform Upgrades Before Deploying](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-upgrades-before-deploying/view).
