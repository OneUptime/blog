# How to Detect Destructive Changes in Plan JSON in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Plan JSON, Safety, CI/CD, Infrastructure as Code

Description: Learn how to programmatically detect destructive resource changes in OpenTofu plan JSON to prevent accidental deletions and replacements in automated pipelines.

Destructive changes - deletions and replacements - can cause data loss and service outages. Detecting them automatically in CI/CD pipelines lets you block dangerous applies, require manual approval, or alert on-call engineers before infrastructure is affected.

## What Counts as Destructive?

| Action | Description | Risk |
|---|---|---|
| `["delete"]` | Resource will be permanently destroyed | High |
| `["delete", "create"]` | Resource will be replaced (destroyed then recreated) | High |
| `["create", "delete"]` | Create-before-destroy replacement | Medium (brief overlap) |

`["update"]` and `["create"]` are non-destructive.

## Detecting Deletions with jq

```bash
# List all resources being deleted

jq -r '.resource_changes[] |
  select(.change.actions == ["delete"]) |
  .address' plan.json

# List all resources being replaced
jq -r '.resource_changes[] |
  select(.change.actions | (contains(["delete"]) and contains(["create"]))) |
  .address' plan.json

# Combined: any destructive action
jq -r '.resource_changes[] |
  select(.change.actions | contains(["delete"])) |
  "\(.change.actions | join("+"))\t\(.address)"' plan.json
```

## Detecting Destructive Changes with Python

```python
#!/usr/bin/env python3
# detect-destructive.py - fail the pipeline if destructive changes are found

import json, sys

with open(sys.argv[1]) as f:
    plan = json.load(f)

destructive = []

for change in plan.get("resource_changes", []):
    actions = change["change"]["actions"]
    address = change["address"]

    # A change is destructive if "delete" is in its actions list
    if "delete" in actions:
        destructive.append({
            "address": address,
            "action": "+".join(actions),
            "type": change.get("type", ""),
        })

if destructive:
    print("DESTRUCTIVE CHANGES DETECTED:")
    print("-" * 60)
    for item in destructive:
        print(f"  [{item['action']}] {item['address']}")
    print(f"\nTotal: {len(destructive)} destructive change(s)")
    print("\nApply blocked. Review the plan and approve manually if intended.")
    sys.exit(1)
else:
    print("No destructive changes detected. Safe to apply.")
    sys.exit(0)
```

## Integrating in GitHub Actions with Manual Approval

```yaml
# .github/workflows/safe-apply.yml
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      has_destructive: ${{ steps.check.outputs.has_destructive }}
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - name: Plan and Export JSON
        run: |
          tofu init
          tofu plan -out=tfplan
          tofu show -json -plan=tfplan > plan.json

      - name: Check for Destructive Changes
        id: check
        run: |
          if python3 scripts/detect-destructive.py plan.json; then
            echo "has_destructive=false" >> $GITHUB_OUTPUT
          else
            echo "has_destructive=true" >> $GITHUB_OUTPUT
          fi

      - name: Upload Saved Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment:
      name: ${{ needs.plan.outputs.has_destructive == 'true' && 'production-destructive' || 'production' }}
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - name: Download Saved Plan
        uses: actions/download-artifact@v5
        with:
          name: tfplan
      - name: Reinitialize Working Directory
        run: tofu init
      - name: Apply
        run: tofu apply tfplan
```

The `production-destructive` environment can be configured in GitHub with required reviewers, forcing a human approval before destructive changes proceed.

## Protecting Specific Resource Types

Add type-specific rules to block deletions of critical resources:

```python
# Extended check: always block deletions of databases and state buckets
PROTECTED_TYPES = {
    "aws_db_instance",
    "aws_rds_cluster",
    "aws_s3_bucket",
    "google_sql_database_instance",
    "azurerm_mssql_server",
}

for change in plan.get("resource_changes", []):
    if "delete" in change["change"]["actions"]:
        rtype = change.get("type", "")
        if rtype in PROTECTED_TYPES:
            print(f"BLOCKED: Deletion of protected resource type '{rtype}': {change['address']}")
            sys.exit(1)
```

## Conclusion

Automated detection of destructive changes is an essential safety gate in infrastructure pipelines. Combine `jq` for quick checks and a Python script for detailed policy enforcement. Route destructive plans through a mandatory review environment to ensure a human always approves deletions and replacements before they run.
