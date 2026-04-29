# How to Use the -json Flag for Machine-Readable Output in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Automation

Description: Learn how to use the -json flag with various OpenTofu commands to generate machine-readable JSON output for CI/CD pipelines, automation, and tooling integration.

## Introduction

The `-json` flag is available on many OpenTofu commands and outputs results in JSON format instead of human-readable text. Some commands return a single JSON document, while long-running commands like `tofu plan -json` emit a stream of JSON UI messages, one per line. This is essential for CI/CD pipelines, automated parsing, and building tooling around OpenTofu.

## Commands Supporting -json

### tofu plan -json

```bash
# Generate machine-readable JSON UI output

tofu plan -json

# Or save a binary plan file for later inspection
tofu plan -json -out=plan.tfplan

# Parse planned-change messages with jq
tofu plan -json | jq 'select(.type == "planned_change") | {address: .change.resource.addr, action: .change.action}'
```

Sample planned-change message:
```json
{
  "@level": "info",
  "@message": "aws_instance.web: Plan to create",
  "@module": "tofu.ui",
  "@timestamp": "2026-03-20T12:00:01Z",
  "change": {
    "resource": {
      "addr": "aws_instance.web",
      "resource_type": "aws_instance",
      "resource_name": "web"
    },
    "action": "create"
  },
  "type": "planned_change"
}
```

### tofu show -json

```bash
# Current state as JSON
tofu show -json

# Saved plan as JSON
tofu show -json -plan=plan.tfplan

# Extract resource IDs
tofu show -json | jq '.values.root_module.resources[] | {address: .address, id: .values.id}'
```

### tofu validate -json

```bash
# Validation results as JSON
tofu validate -json

# Check if valid
tofu validate -json | jq '.valid'

# Get error messages
tofu validate -json | jq '.diagnostics[] | {severity: .severity, summary: .summary}'
```

### tofu output -json

```bash
# All outputs as JSON
tofu output -json

# Specific output as JSON
tofu output -json vpc_id

# Extract value from output
tofu output -json | jq -r '.vpc_id.value'
```

### tofu version -json

```bash
# Version information as JSON
tofu version -json

# Check version
tofu version -json | jq -r '.terraform_version'
```

### tofu providers schema -json

```bash
# Provider schemas as JSON
tofu providers schema -json

# Get resource attributes
tofu providers schema -json | jq \
  '.provider_schemas["aws"].resource_schemas["aws_instance"].block.attributes | keys'
```

## CI/CD Integration Patterns

### Check for Planned Changes

```bash
#!/bin/bash
# check-changes.sh

tofu plan -out=plan.tfplan
tofu show -json -plan=plan.tfplan > plan_output.json

CHANGES=$(jq '.resource_changes | length' plan_output.json)
CREATES=$(jq '[.resource_changes[] | select(.change.actions | index("create"))] | length' plan_output.json)
UPDATES=$(jq '[.resource_changes[] | select(.change.actions | index("update"))] | length' plan_output.json)
DESTROYS=$(jq '[.resource_changes[] | select(.change.actions | index("delete"))] | length' plan_output.json)

echo "Total changes: $CHANGES"
echo "Creates: $CREATES, Updates: $UPDATES, Destroys: $DESTROYS"

if [ "$DESTROYS" -gt 0 ]; then
  echo "WARNING: $DESTROYS resources will be destroyed"
  jq -r '.resource_changes[] | select(.change.actions | index("delete")) | .address' plan_output.json
fi
```

### Post Plan Summary to PR

```bash
# Generate human-friendly summary from JSON plan
tofu show -json -plan=plan.tfplan | jq -r '
  "## OpenTofu Plan Summary\n" +
  "| Action | Count |\n" +
  "|--------|-------|\n" +
  "| Create | \([.resource_changes[] | select(.change.actions | index("create"))] | length) |\n" +
  "| Update | \([.resource_changes[] | select(.change.actions | index("update"))] | length) |\n" +
  "| Delete | \([.resource_changes[] | select(.change.actions | index("delete"))] | length) |"
'
```

## Conclusion

The `-json` flag transforms OpenTofu from an interactive tool into an automation-friendly API. Use it in CI/CD pipelines to programmatically analyze plans before applying, extract output values for downstream processes, and build custom dashboards and reporting tools. Combine with `jq` for powerful, composable data extraction from OpenTofu's structured JSON output.
