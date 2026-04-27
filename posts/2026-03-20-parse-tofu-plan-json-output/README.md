# How to Parse tofu plan JSON Output Programmatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Plan JSON, Automation, CI/CD, Infrastructure as Code

Description: Learn how to export OpenTofu plan output in JSON format and parse it programmatically to build automated review and approval workflows.

OpenTofu can serialize its plan output as structured JSON, making it possible to analyze planned changes in scripts, CI pipelines, and custom tools without screen-scraping human-readable text.

## Generating a JSON Plan

```bash
# Step 1: Create a binary plan file

tofu plan -out=tfplan

# Step 2: Convert the binary plan to JSON
tofu show -json tfplan > plan.json

# One-liner for pipelines
tofu plan -out=tfplan && tofu show -json tfplan > plan.json
```

## JSON Plan Structure

The top-level keys of the JSON plan are:

```json
{
  "format_version": "1.0",
  "prior_state": { ... },
  "configuration": { ... },
  "planned_values": { ... },
  "variables": { ... },
  "resource_changes": [ ... ],
  "resource_drift": [ ... ],
  "relevant_attributes": [ ... ],
  "output_changes": { ... },
  "checks": [ ... ],
  "timestamp": "2026-03-20T12:00:00Z",
  "errored": false
}
```

The most useful section for automation is `resource_changes`, which lists every resource that will be created, updated, or destroyed.

## Anatomy of a resource_changes Entry

```json
{
  "address": "aws_instance.web",
  "module_address": null,
  "mode": "managed",
  "type": "aws_instance",
  "name": "web",
  "provider_name": "aws",
  "change": {
    "actions": ["create"],
    "before": null,
    "after": {
      "ami": "ami-0c55b159cbfafe1f0",
      "instance_type": "t3.micro"
    },
    "after_unknown": { "id": true, "public_ip": true }
  }
}
```

The `actions` array can contain: `["no-op"]`, `["create"]`, `["read"]`, `["update"]`, `["delete"]`, `["delete", "create"]` (replace, destroy-then-create), `["create", "delete"]` (replace, create-before-destroy), or `["forget"]`.

## Parsing with Python

```python
#!/usr/bin/env python3
# parse-plan.py - summarize resource changes from a tofu plan JSON file

import json
import sys

with open(sys.argv[1]) as f:
    plan = json.load(f)

changes = plan.get("resource_changes", [])

# Group changes by action type
summary = {"create": [], "update": [], "delete": [], "replace": [], "no-op": []}

for change in changes:
    actions = change["change"]["actions"]
    address = change["address"]

    if actions == ["no-op"]:
        summary["no-op"].append(address)
    elif actions == ["create"]:
        summary["create"].append(address)
    elif actions == ["update"]:
        summary["update"].append(address)
    elif actions == ["delete"]:
        summary["delete"].append(address)
    elif set(actions) == {"delete", "create"}:
        summary["replace"].append(address)

# Print summary
for action, resources in summary.items():
    if resources and action != "no-op":
        print(f"\n{action.upper()} ({len(resources)}):")
        for r in resources:
            print(f"  {r}")
```

```bash
python3 parse-plan.py plan.json
```

## Parsing with jq

For quick shell-based analysis:

```bash
# Count changes by action type
jq '[.resource_changes[].change.actions[]] | group_by(.) | map({action: .[0], count: length})' plan.json

# List all resources being created
jq -r '.resource_changes[] | select(.change.actions == ["create"]) | .address' plan.json

# List all resources being destroyed
jq -r '.resource_changes[] | select(.change.actions == ["delete"]) | .address' plan.json
```

## Extracting Variable Values

```bash
# List all input variable values used in the plan
jq '.variables | to_entries[] | {name: .key, value: .value.value}' plan.json
```

## Conclusion

Exporting the OpenTofu plan as JSON enables powerful automated analysis workflows. Use Python or `jq` to parse `resource_changes`, detect destructive operations, enforce policies, and build custom approval dashboards - all without parsing human-readable text output.
