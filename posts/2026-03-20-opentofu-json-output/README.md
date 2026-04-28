# How to Use OpenTofu's JSON Output Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, JSON Output, Automation, CI/CD, Infrastructure as Code, Scripting

Description: Learn how to use OpenTofu's JSON output formats for plan files, state, and provider schemas - enabling automation, CI/CD integration, and programmatic processing of infrastructure changes.

## Introduction

OpenTofu provides JSON-formatted output for plans, state, provider schemas, and output values. This machine-readable format enables CI/CD automation, cost estimation (Infracost), policy-as-code (OPA/conftest), and custom tooling to programmatically interact with infrastructure changes.

## JSON Plan Output

```bash
# Generate a plan and convert to JSON

tofu plan -out=tfplan.binary
tofu show -json tfplan.binary > tfplan.json

# View the JSON structure
cat tfplan.json | jq 'keys'
# ["configuration", "format_version", "output_changes", "planned_values", "prior_state", "resource_changes", "terraform_version", "timestamp", "variables"]
```

## Key Sections of the JSON Plan

### resource_changes

The most useful section - shows what will change:

```bash
# Show all planned changes
cat tfplan.json | jq '.resource_changes[] | {address, type, actions: .change.actions}'

# Show only resources being created
cat tfplan.json | jq '.resource_changes[] | select(.change.actions[] == "create") | .address'

# Show resources being destroyed
cat tfplan.json | jq '.resource_changes[] | select(.change.actions[] == "delete") | .address'

# Count changes by type
cat tfplan.json | jq '
  .resource_changes
  | group_by(.change.actions[0])
  | map({action: .[0].change.actions[0], count: length})
'
```

### output_changes

```bash
# Show planned output value changes
cat tfplan.json | jq '.output_changes'
```

### variables

```bash
# Show variable values used in the plan
cat tfplan.json | jq '.variables | to_entries | map({name: .key, value: .value.value})'
```

## JSON State Output

```bash
# Get current state as JSON
tofu show -json > current-state.json

# Extract specific resource attributes
cat current-state.json | jq '
  .values.root_module.resources[]
  | select(.type == "aws_instance")
  | {address, instance_id: .values.id, private_ip: .values.private_ip}
'

# Get all resource addresses in state
cat current-state.json | jq '.values.root_module.resources[].address'
```

## JSON Output Values

```bash
# Get all outputs as JSON
tofu output -json

# Get a specific output as JSON
tofu output -json vpc_id

# Use in scripts
VPC_ID=$(tofu output -json vpc_id | jq -r '.')
echo "VPC: $VPC_ID"

# Parse complex output (list)
SUBNET_IDS=$(tofu output -json private_subnet_ids | jq -r '.[]')
for subnet in $SUBNET_IDS; do
  echo "Subnet: $subnet"
done
```

## Provider Schema

```bash
# Get provider schema as JSON (useful for tooling authors)
tofu providers schema -json > provider-schema.json

# List all resources a provider supports
cat provider-schema.json | jq '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas | keys | sort'

# Get attributes for a specific resource
cat provider-schema.json | jq '
  .provider_schemas["registry.opentofu.org/hashicorp/aws"]
  .resource_schemas["aws_instance"]
  .block.attributes | keys
'
```

## Using JSON Plan in CI/CD Automation

```bash
#!/bin/bash
# scripts/analyze-plan.sh - analyze a plan before applying

set -euo pipefail

PLAN_FILE="${1:-tfplan.json}"

echo "=== Plan Analysis ==="

# Count changes
CREATES=$(jq '[.resource_changes[] | select(.change.actions[] == "create")] | length' "$PLAN_FILE")
UPDATES=$(jq '[.resource_changes[] | select(.change.actions[] == "update")] | length' "$PLAN_FILE")
DESTROYS=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' "$PLAN_FILE")

echo "Creates: $CREATES"
echo "Updates: $UPDATES"
echo "Destroys: $DESTROYS"

# Safety check: fail if there are unexpected destroys
if [ "$DESTROYS" -gt 0 ]; then
  echo ""
  echo "WARNING: The following resources will be DESTROYED:"
  jq -r '.resource_changes[] | select(.change.actions[] == "delete") | .address' "$PLAN_FILE"
  echo ""

  if [ "${REQUIRE_APPROVAL_FOR_DESTROYS:-true}" = "true" ]; then
    echo "ERROR: Destroys require explicit approval. Set REQUIRE_APPROVAL_FOR_DESTROYS=false to skip."
    exit 1
  fi
fi

echo "Plan analysis complete."
```

## Format Version Compatibility

```bash
# Check the plan format version
cat tfplan.json | jq '.format_version'
# "1.2"

# OpenTofu guarantees backward compatibility within major versions
# Always check format_version before parsing in automated tools
```

## Conclusion

OpenTofu's JSON output formats enable automation at every stage: use `tofu show -json tfplan.binary` for plan analysis, OPA/conftest policy enforcement, and cost estimation; use `tofu output -json` for downstream automation that needs infrastructure values; use `tofu providers schema -json` when building tooling that needs to understand provider capabilities. The JSON formats are stable within format version and are the foundation for OpenTofu's integrations with Infracost, conftest, Checkov, and CI/CD tooling.
