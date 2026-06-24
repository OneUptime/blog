# How to Fix Unexpected Plan Changes (Drift) in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Drift, Plan Changes, State Management, Infrastructure as Code

Description: Learn how to diagnose and fix unexpected plan changes in OpenTofu caused by infrastructure drift, provider attribute normalization, and out-of-band modifications.

## Introduction

Unexpected plan changes - where OpenTofu wants to modify resources even though you have not changed your configuration - can be caused by drift between the recorded state and the actual cloud resource state, provider attribute normalization differences, changes in data source results, or provider version behavior.

## Types of Unexpected Changes

1. **True drift**: Someone modified the cloud resource outside OpenTofu
2. **Attribute normalization**: Provider reads a value in a different format than stored
3. **Data source result change**: A referenced value now resolves differently (e.g., a "latest" AMI lookup returns a newer image ID)
4. **Provider version change**: A newer provider version reads or stores attributes differently

## Diagnosing Unexpected Changes

```bash
# Run a refresh-only plan to see only drift, no config changes

tofu plan -refresh-only

# Run a full plan with verbose output
TF_LOG=DEBUG tofu plan 2>&1 | grep -A 5 "unexpected\|drift\|changed"
```

## Fix 1: Refresh State to Accept Current Reality

If the drift is intentional (you want to accept the current cloud state):

```bash
# Apply a refresh-only plan to update state with current cloud values
tofu apply -refresh-only

# Deprecated shortcut that updates state immediately without a review step
tofu refresh   # Deprecated in newer versions - use apply -refresh-only
```

## Fix 2: Add ignore_changes for Non-Critical Attributes

Some attributes are modified by external automation or by the cloud provider after creation:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  lifecycle {
    # Ignore changes to tags made by other systems (e.g., cost allocation tools)
    ignore_changes = [
      tags["LastModified"],
      tags["CostCenter"],
      # Ignore AMI changes after creation - prevent forced replacement
      ami,
    ]
  }
}
```

## Fix 3: Provider Attribute Normalization

Some providers normalize attribute values between reads and writes (e.g., JSON policy reordering):

```hcl
resource "aws_iam_role_policy" "app" {
  name = "app-policy"
  role = aws_iam_role.app.id

  # Use jsonencode to let OpenTofu normalize the policy
  # This prevents constant diffs from JSON key ordering
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "*"
    }]
  })
}
```

## Fix 4: Provider Version Update Causing Attribute Changes

When a provider upgrade changes how an attribute is read:

```hcl
# Check what changed between provider versions
# Review provider changelog for breaking changes

# If needed, pin to the previous version temporarily
# while you update your configuration to match the new behavior
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.38.0"  # Pin until you resolve the drift
    }
  }
}
```

## Fix 5: Detect Who Caused the Drift

```bash
# Check CloudTrail for recent modifications to the drifted resource
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=my-sg-id \
  --start-time "2026-03-19T00:00:00Z" \
  --query "Events[*].{Time:EventTime, User:Username, Event:EventName}"
```

## Conclusion

Unexpected plan changes fall into drift (accept with `-refresh-only` or re-apply), data source-driven changes, normalization differences (use `jsonencode`, `ignore_changes`), or provider version changes (check changelogs, update configs). Regular drift monitoring with `tofu plan -refresh-only` in CI keeps surprises small and manageable.
