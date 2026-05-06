# How to Read the OpenTofu Plan JSON Change Representation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, JSON, Plan, Infrastructure as Code, Automation

Description: Learn how to interpret the OpenTofu plan JSON output format to automate plan validation, policy checks, and audit workflows.

---

OpenTofu can output its execution plan as structured JSON with `tofu show -json`, enabling automated parsing for policy enforcement, audit trails, and custom CI/CD gating logic.

---

## Generate a JSON Plan

```bash
# Save the plan

tofu plan -out=tfplan

# Convert to JSON
tofu show -json tfplan > plan.json
```

---

## Top-Level Plan Structure

```json
{
  "format_version": "1.0",
  "prior_state": {...},
  "configuration": {...},
  "planned_values": {...},
  "variables": {...},
  "resource_changes": [...],
  "output_changes": {...},
  "checks": [...],
  "errored": false,
  "timestamp": "2026-03-20T00:00:00Z"
}
```

---

Resource Changes Array

Each entry in `resource_changes` represents one resource:

```json
{
  "address": "aws_instance.web",
  "mode": "managed",
  "type": "aws_instance",
  "name": "web",
  "change": {
    "actions": ["create"],
    "before": null,
    "after": {
      "ami": "ami-0c55b159cbfafe1f0",
      "instance_type": "t3.micro"
    },
    "after_unknown": {
      "id": true,
      "public_ip": true
    }
  }
}
```

---

## Change Actions

| Action                                      | Meaning                                      |
|---------------------------------------------|----------------------------------------------|
| `["create"]`                                | New resource will be created                 |
| `["update"]`                                | Existing resource will be modified in-place  |
| `["delete"]`                                | Resource will be destroyed                   |
| `["delete", "create"]` or `["create", "delete"]` | Resource will be replaced             |
| `["no-op"]`                                 | No changes                                   |
| `["read"]`                                  | A data resource will be read                 |
| `["forget"]`                                | Resource will be removed from state          |

---

## Parse with jq

```bash
# Count resources being created
jq '[.resource_changes[] | select(.change.actions == ["create"])] | length' plan.json

# List all resources being destroyed
jq -r '.resource_changes[] | select(.change.actions[] == "delete") | .address' plan.json

# Check if any IAM resources have changes planned
jq -r '.resource_changes[] | select(.type | startswith("aws_iam")) | select(.change.actions != ["no-op"]) | .address' plan.json
```

---

## Policy Gate in CI/CD

```bash
DESTROYS=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' plan.json)
if [ "$DESTROYS" -gt 0 ]; then
  echo "ERROR: Plan contains $DESTROYS resource deletions - manual approval required"
  exit 1
fi
```

---

## Summary

Generate a JSON plan with `tofu plan -out=tfplan && tofu show -json tfplan`. The `resource_changes` array contains per-resource `actions` arrays indicating common operations like `create`, `update`, `delete`, and `no-op`, with replacements represented as `["delete", "create"]` or `["create", "delete"]`. Parse with `jq` to build automated policy gates, count destructive changes, or generate human-readable summaries in CI/CD pipelines.
