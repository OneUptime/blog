# How to Handle Out-of-Band Changes to Infrastructure in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Out-of-Band Changes, Drift, State Management, Infrastructure as Code, Governance

Description: Learn how to detect, evaluate, and respond to out-of-band infrastructure changes - modifications made outside OpenTofu - while maintaining a consistent managed state.

## Introduction

Out-of-band changes are modifications to cloud resources made outside OpenTofu: via the cloud console, CLI, or other automation tools. While the goal is to prevent them, they happen in practice - during incidents, through legacy scripts, or unauthorized access. This guide covers how to handle them systematically.

## Detecting Out-of-Band Changes

```bash
# Detect changes in the current environment

tofu plan -refresh-only -no-color 2>&1 | grep -A 5 "will be updated"

# The refresh-only plan shows exactly what changed externally
# without proposing any config changes
```

## Categorizing Out-of-Band Changes

Before deciding how to respond, classify the change:

```hcl
Category 1: Authorized emergency change
  - DB scaled up during incident, planned to update config
  - Action: Accept with refresh-only, update config

Category 2: Expected automation drift
  - ASG desired capacity changed by autoscaling
  - Security group tags updated by compliance tooling
  - Action: Use ignore_changes lifecycle rule

Category 3: Unauthorized or accidental change
  - Someone manually opened a security group port
  - Action: Revert with tofu apply, investigate via CloudTrail

Category 4: Configuration migration
  - Resource was migrated to a new name/type manually
  - Action: Import + update config
```

## Handling Category 1: Accept Emergency Changes

```bash
# 1. Review what changed
tofu plan -refresh-only

# 2. Accept the intentional change
tofu apply -refresh-only

# 3. Update config to match
# Edit terraform.tfvars or the resource block
# Example: instance_class = "db.r5.large"  # Updated after incident scaling

# 4. Verify clean state
tofu plan   # Should show no changes
```

## Handling Category 2: Expected Automation Drift

```hcl
resource "aws_autoscaling_group" "web" {
  min_size         = 2
  max_size         = 20
  desired_capacity = 4

  lifecycle {
    # ASG manages desired_capacity - don't override it
    ignore_changes = [desired_capacity, tag]
  }
}

resource "aws_db_instance" "main" {
  lifecycle {
    # Rotation tooling updates this - don't track it
    ignore_changes = [password, snapshot_identifier]
  }
}
```

## Handling Category 3: Revert Unauthorized Change

```bash
# 1. Review what was changed
tofu plan -refresh-only

# 2. Run a regular plan to see what will be reverted
tofu plan   # Shows: ~ aws_security_group.web (will revert unauthorized port)

# 3. Apply to revert the unauthorized change
tofu apply

# 4. Investigate via CloudTrail
# SourceIPAddress is inside the CloudTrailEvent JSON, not a top-level field,
# so we surface the top-level fields here and parse the full event with jq if needed.
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AuthorizeSecurityGroupIngress \
  --start-time "2026-03-19T00:00:00Z" \
  --query "Events[*].{Time:EventTime, User:Username, EventId:EventId}"
```

## Preventing Out-of-Band Changes

```hcl
# AWS: Service Control Policies restrict manual changes in production accounts
# This SCP denies changes to OpenTofu-managed resources without the CI role
# {
#   "Version": "2012-10-17",
#   "Statement": [{
#     "Effect": "Deny",
#     "Action": ["ec2:ModifyInstanceAttribute", "rds:ModifyDBInstance"],
#     "Resource": "*",
#     "Condition": {
#       "StringNotEquals": {
#         "aws:PrincipalArn": "arn:aws:iam::ACCOUNT:role/opentofu-ci-role"
#       }
#     }
#   }]
# }
```

## Conclusion

Out-of-band changes are inevitable - the goal is to detect them quickly, categorize accurately, and respond appropriately. Use `ignore_changes` for expected automation drift, `apply -refresh-only` for accepted emergency changes, and regular `tofu apply` to revert unauthorized changes. Combine with CloudTrail auditing to hold people accountable for unauthorized modifications.
