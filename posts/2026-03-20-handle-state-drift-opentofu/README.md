# How to Handle State Drift in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to detect, investigate, and resolve state drift in OpenTofu when your actual infrastructure diverges from what the state file records.

## Introduction

State drift occurs when the actual state of your infrastructure differs from what OpenTofu's state file records. This happens when changes are made directly in the cloud console, by other tools, or by manual CLI commands - bypassing OpenTofu. Left unaddressed, drift leads to failed plans, unexpected changes, or infrastructure inconsistencies.

## Types of Drift

- **Resource modified**: An attribute was changed outside OpenTofu (e.g., instance type resized in the console)
- **Resource deleted**: A resource was deleted manually but still exists in state
- **Resource added**: A resource was created outside OpenTofu (not in state - requires import)

## Step 1: Detect Drift with tofu plan -refresh-only

The most focused drift detection is running `tofu plan -refresh-only` - it shows changes made outside OpenTofu without mixing in configuration changes:

```bash
# Run a refresh-only plan to detect drift

tofu plan -refresh-only

# Example output showing drift:
# aws_instance.web will be updated in-place
#   ~ instance_type = "t3.micro" -> "t3.small"  # Changed in console
```

## Step 2: Run tofu apply -refresh-only to Update State

If you want to accept the external changes and update state to match reality:

```bash
# Review and apply a refresh-only plan
tofu apply -refresh-only

# The older tofu refresh command is a deprecated alias for:
# tofu apply -refresh-only -auto-approve
```

After approval, this updates state to reflect the real infrastructure without making any changes to the infrastructure itself.

## Step 3: Investigate the Drift

Before deciding how to resolve drift, understand what changed:

```bash
# See the full diff between current state and actual infrastructure
tofu plan -refresh-only -detailed-exitcode
# Exit code 2 = refresh-only changes detected
# Exit code 0 = no refresh-only changes

# Save the plan for review
tofu plan -refresh-only -out=drift.tfplan
tofu show drift.tfplan
```

## Step 4: Resolve Drift - Accept the Change

If the external change is intentional and should be kept, update your configuration to match:

```hcl
# Someone resized the instance type in the console
# Update the configuration to match the current state

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.small"  # Updated from t3.micro to match reality
}
```

```bash
# Run plan - should show no changes now
tofu plan
```

## Step 5: Resolve Drift - Revert the Change

If the external change was unauthorized, revert by running `tofu apply`:

```bash
# The plan shows the instance should be t3.micro (per configuration)
# Apply will revert the manual change
tofu apply
```

## Step 6: Handle Deleted Resources

When a resource was manually deleted:

```bash
# Plan will show the resource needs to be created
tofu plan
# + aws_instance.web will be created  # OpenTofu detects it's missing

# Apply to recreate the deleted resource
tofu apply

# Or, if the deletion was intentional, remove from state and config:
tofu state rm aws_instance.web
# Then delete the resource block from your .tf files
```

## Step 7: Continuous Drift Detection

Set up automated drift detection in CI/CD:

```bash
#!/bin/bash
# drift-check.sh

# Run a refresh-only plan and capture exit code
tofu plan -refresh-only -detailed-exitcode
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "No drift detected"
elif [ $EXIT_CODE -eq 2 ]; then
  echo "DRIFT DETECTED: Infrastructure has changed outside OpenTofu"
  # Send alert to Slack, PagerDuty, etc.
  exit 1
else
  echo "Error running plan"
  exit 1
fi
```

## Using Check Blocks for Drift Assertions

OpenTofu's check blocks let you assert conditions about your infrastructure:

```hcl
check "instance_type_drift" {
  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type has drifted from expected value t3.micro"
  }
}
```

## Preventing Drift

The best cure for drift is prevention:
- Lock down console/CLI access with IAM policies
- Use SCPs to prevent manual changes in production accounts
- Implement PR-based infrastructure changes with mandatory OpenTofu apply

## Conclusion

State drift is inevitable in dynamic environments, but OpenTofu provides excellent tools to detect and resolve it. Regular drift detection runs via `tofu plan -refresh-only`, combined with `tofu apply -refresh-only` when you want to accept external changes, keep your state accurate. For teams, automated drift detection pipelines and strict IAM controls prevent unauthorized changes from accumulating into larger problems.
