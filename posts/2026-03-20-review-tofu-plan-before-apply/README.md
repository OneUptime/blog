# How to Review tofu plan Output Before Applying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Plan Review, Best Practice, Risk Management, Infrastructure as Code, DevOps

Description: Learn how to read and critically review tofu plan output to catch dangerous changes before they reach production, including what to look for and red flags to watch out for.

## Introduction

`tofu plan` is your last line of defense before infrastructure changes reach production. A careful plan review prevents accidental resource destruction, unexpected replacement of critical resources, and unintended configuration changes. This guide teaches you how to read plan output critically.

## Generating a Reviewable Plan

```bash
# Generate plan with human-readable output

tofu plan -no-color -out=tfplan.binary 2>&1 | tee plan.txt

# Show JSON plan for scripted review
tofu show -json tfplan.binary > plan.json
```

## Understanding Plan Symbols

```text
+ create      → A new resource will be created (usually safe)
- destroy     → A resource will be destroyed (review carefully)
~ update      → A resource will be modified in-place (check details)
-/+ replace   → A resource will be destroyed and re-created (HIGH RISK)
+/- replace   → A replacement will be created before the old resource is destroyed (HIGH RISK)
<= read       → A data source will be read (usually safe)
```

## Red Flags to Watch For

### 1. Unexpected Destroys

```text
# RED FLAG - unexpected database destroy
  - aws_db_instance.main will be destroyed

# When to be concerned:
# - You didn't intend to destroy the database
# - The resource has a prevent_destroy lifecycle rule that was removed
# - The resource address changed (due to for_each key change)
```

### 2. Forces Replacement

```text
# RED FLAG - database will be replaced (destroy + create)
  -/+ aws_db_instance.main must be replaced
      ~ availability_zone = "us-east-1a" -> "us-east-1b"  # forces replacement
        # (new value is computed, old value is stored)

# Watch for: changes to immutable attributes like database engine,
# availability zone, KMS key, or storage encryption that force replacement of stateful resources
```

### 3. Large Number of Destroys

```text
# RED FLAG - many resources being destroyed
Plan: 5 to add, 2 to change, 47 to destroy.

# A large number of destroys when you expected a simple change
# often indicates a for_each key change or a module being removed accidentally
```

## Safe Review Checklist

```bash
# 1. Count the changes
grep -E "^Plan:" plan.txt
# Expected: Plan: 2 to add, 1 to change, 0 to destroy.

# 2. List all resources being destroyed
grep " will be destroyed" plan.txt

# 3. List all resources being replaced
grep "must be replaced" plan.txt

# 4. Check for sensitive values in plain text (should be redacted)
grep -iE "password.*=.*\"" plan.txt   # Should NOT appear

# 5. Check for unexpected tag changes
grep "tags" plan.txt
```

## Using JSON Plan for Automated Review

```bash
# Count changes by action type
tofu show -json tfplan.binary | \
  jq '[.resource_changes[] | .change.actions[]] | group_by(.) | map({action: .[0], count: length})'

# Find all resources being destroyed
tofu show -json tfplan.binary | \
  jq '[.resource_changes[] | select(.change.actions | index("delete") != null) | .address]'

# Find all forced replacements
tofu show -json tfplan.binary | \
  jq '[.resource_changes[] | select((.change.actions | index("delete") != null) and (.change.actions | index("create") != null)) | .address]'
```

## Setting a Destruction Threshold in CI

```bash
#!/bin/bash
# ci-plan-check.sh - fail CI if too many resources would be destroyed
DESTROY_COUNT=$(tofu show -json tfplan.binary | \
  jq '[.resource_changes[] | select(.change.actions | index("delete") != null)] | length')

if [ "$DESTROY_COUNT" -gt 5 ]; then
  echo "ERROR: Plan will destroy $DESTROY_COUNT resources. Manual review required."
  exit 1
fi
```

## Conclusion

Always read plan output before applying, specifically checking for unexpected destroys, forced replacements of stateful resources, and large numbers of changes. Use the JSON plan format for automated checks in CI/CD that block applies when the destruction count exceeds a threshold. A 5-minute plan review prevents hours of incident response.
