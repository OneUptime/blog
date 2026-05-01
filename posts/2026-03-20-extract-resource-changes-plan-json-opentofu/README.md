# How to Extract Resource Changes from Plan JSON in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Plan JSON, Jq, Automation, Infrastructure as Code

Description: Learn how to extract and filter specific resource change information from OpenTofu plan JSON output using jq and Python.

The `resource_changes` array in a `tofu show -json` plan includes one entry for each resource instance in the configuration, including unchanged resources with `["no-op"]` actions. Extracting precisely the information you need - changed attributes, resource addresses, before/after values - powers automated reports and approval workflows.

## Generating Plan JSON

```bash
tofu plan -out=tfplan
tofu show -json -plan=tfplan > plan.json
```

## Extracting All Changes with jq

```bash
# List every resource change with its action and address

jq -r '.resource_changes[] | select(.change.actions != ["no-op"]) | "\(.change.actions | join(","))\t\(.address)"' plan.json

# Output example:
# create    aws_vpc.main
# create    aws_subnet.public
# update    aws_security_group.web
# delete    aws_instance.old
```

## Filtering by Resource Type

```bash
# Extract only S3 bucket changes
jq -r '.resource_changes[] | select(.type == "aws_s3_bucket" and .change.actions != ["no-op"]) | {address, actions: .change.actions}' plan.json

# Extract only IAM changes (any IAM resource type)
jq -r '.resource_changes[] | select((.type | startswith("aws_iam")) and .change.actions != ["no-op"]) | .address' plan.json
```

## Extracting Before and After Values

The `before` field holds the current state, and `after` holds the planned state. For creates, `before` is unset (which `jq` will show as `null`). For deletes and forgets, `after` is unset.

```bash
# Show what will change for security group rules
jq -r '.resource_changes[] |
  select(.type == "aws_security_group" and (.change.actions | contains(["update"]))) |
  {
    address,
    before_ingress: .change.before.ingress,
    after_ingress: .change.after.ingress
  }' plan.json
```

## Extracting Unknown Values (Computed After Apply)

`after_unknown` mirrors the structure of `after`, but replaces unknown leaf values with `true`. Those values will only be known after apply:

```bash
# Show which attributes will be computed after apply
jq -r '.resource_changes[] |
  select((.change.after_unknown // {}) | length > 0) |
  {
    address,
    computed_attrs: [
      .change.after_unknown
      | paths(type == "boolean")
      | map(tostring)
      | join(".")
    ]
  }' plan.json
```

## Python: Structured Extraction

```python
#!/usr/bin/env python3
# extract-changes.py - structured extraction of resource changes

import json
import sys

with open(sys.argv[1]) as f:
    plan = json.load(f)

print(f"{'ACTION':<10} {'TYPE':<35} {'NAME':<30}")
print("-" * 75)

for change in plan.get("resource_changes", []):
    actions = change["change"]["actions"]
    if actions == ["no-op"]:
        continue  # Skip unchanged resources

    action_str = "+".join(actions)
    rtype  = change.get("type", "")
    rname  = change.get("name", "")

    print(f"{action_str:<10} {rtype:<35} {rname:<30}")

print(f"\nTotal changes: {sum(1 for c in plan['resource_changes'] if c['change']['actions'] != ['no-op'])}")
```

```bash
python3 extract-changes.py plan.json
```

## Extracting Module-Scoped Changes

Resources inside modules have a `module_address` field:

```bash
# Get all changes inside a specific module
jq -r '.resource_changes[] |
  select(.module_address == "module.networking" and .change.actions != ["no-op"]) |
  "\(.change.actions | join(","))\t\(.address)"' plan.json
```

## Extracting Sensitive Value Indicators

OpenTofu marks sensitive values in `after_sensitive`:

```bash
# Find resources whose planned values include sensitive attributes
jq -r '.resource_changes[] |
  select((.change.after_sensitive // {}) | length > 0) |
  {
    address,
    sensitive_attrs: [
      .change.after_sensitive
      | paths(type == "boolean")
      | map(tostring)
      | join(".")
    ]
  }' plan.json
```

## Conclusion

The `resource_changes` array is the foundation for all programmatic plan analysis. Use `jq` for quick ad-hoc extractions in shell scripts and Python for structured reporting and policy enforcement tools. Pair attribute-level extraction with before/after comparisons to build precise change summaries.
