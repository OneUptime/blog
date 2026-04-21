# How to Use State File JSON Format in OpenTofu - File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to read, parse, and understand the OpenTofu state file JSON format to extract information, troubleshoot issues, and build automation tools.

## Introduction

OpenTofu state snapshots are stored as JSON, but the raw state file format can change between OpenTofu versions. Understanding the structure allows you to write scripts that extract resource information, build audit tools, validate consistency, or integrate with other systems. This guide walks through the state file format and common patterns for working with it programmatically.

## The Top-Level Structure

A raw state snapshot, such as a local `terraform.tfstate` file or the output of `tofu state pull`, has this top-level structure:

```json
{
  "version": 4,
  "terraform_version": "1.8.0",
  "serial": 42,
  "lineage": "abc12345-6789-0000-0000-abcdef012345",
  "outputs": {
    "vpc_id": {
      "value": "vpc-0a1b2c3d",
      "type": "string"
    }
  },
  "resources": [],
  "check_results": null
}
```

Key fields:
- `version`: The state format version (currently 4)
- `terraform_version`: The version of OpenTofu that last modified the state
- `serial`: Monotonically increasing counter; helps detect state conflicts
- `lineage`: Unique ID for this state lineage; mismatches cause errors
- `outputs`: Map of output values from the root module
- `resources`: Array of managed resources and data sources tracked in state

The documented `tofu show -json` output uses a different top-level structure with `format_version`, `terraform_version`, `values`, and `checks`.

## The Resources Array

Each entry in the raw state's `resources` array represents a managed resource or data source block:

```json
{
  "mode": "managed",
  "type": "aws_instance",
  "name": "web",
  "provider": "provider[\"registry.opentofu.org/hashicorp/aws\"]",
  "instances": [
    {
      "schema_version": 1,
      "attributes": {
        "ami": "ami-0c55b159cbfafe1f0",
        "id": "i-0123456789abcdef0",
        "instance_type": "t3.micro",
        "tags": {
          "Name": "web-server"
        }
      },
      "sensitive_attributes": [],
      "private": "base64encodeddata=="
    }
  ]
}
```

Key fields:
- `mode`: `"managed"` for resources, `"data"` for data sources
- `type`: The resource type (e.g., `aws_instance`)
- `name`: The resource name from your configuration
- `instances`: Array of instances (for `count` > 1 or `for_each`, multiple entries)

## Extracting State Information with CLI Tools

OpenTofu provides commands to extract state information without parsing JSON directly:

```bash
# List all resources

tofu state list

# Show details for a specific resource
tofu state show aws_instance.web

# Show full state as JSON
tofu show -json > state.json

# Show outputs
tofu output -json
```

## Parsing State with jq

For scripts and automation, use `jq` to parse state JSON:

```bash
# Get all resource types and names
tofu show -json | jq 'def resources(m): (m.resources[]?), (m.child_modules[]? | resources(.)); resources(.values.root_module) | {address: .address, type: .type, name: .name}'

# Get all EC2 instance IDs
tofu show -json | jq 'def resources(m): (m.resources[]?), (m.child_modules[]? | resources(.)); resources(.values.root_module) | select(.mode == "managed" and .type == "aws_instance") | .values.id'

# Get resource count by type
tofu show -json | jq 'def resources(m): (m.resources[]?), (m.child_modules[]? | resources(.)); [resources(.values.root_module) | .type] | group_by(.) | map({type: .[0], count: length})'

# List all outputs
tofu output -json | jq 'to_entries[] | {name: .key, value: .value.value}'
```

## Reading State Directly

For tooling that reads the state file directly, use `tofu show -json` rather than parsing `terraform.tfstate` - it provides a stable format:

```bash
# Export state to a JSON file for external processing
tofu show -json > infrastructure-state.json

# Python script example to extract resource information
python3 << 'EOF'
import json

with open('infrastructure-state.json') as f:
    state = json.load(f)

def walk_module(module):
    for resource in module.get('resources', []):
        yield resource
    for child in module.get('child_modules', []):
        yield from walk_module(child)

# List all resource addresses
root_module = state.get('values', {}).get('root_module', {})
for resource in walk_module(root_module):
    print(f"{resource['address']}: {resource.get('values', {}).get('id', 'N/A')}")
EOF
```

## Understanding Sensitive Values in State JSON

When you run `tofu show -json`, sensitive values are not redacted; they are included in `values` and marked separately in `sensitive_values`:

```json
{
  "type": "aws_db_instance",
  "name": "main",
  "values": {
    "password": "actual-password",
    "username": "admin"
  },
  "sensitive_values": {
    "password": true
  }
}
```

Treat JSON output from `tofu show -json` and `tofu output -json` as sensitive. The actual raw state file can also contain these values unredacted unless state encryption is enabled.

## Working with Module Resources

Resources inside modules have a different address format:

```json
{
  "address": "module.networking.aws_vpc.main",
  "mode": "managed",
  "type": "aws_vpc",
  "name": "main",
  "values": {
    "id": "vpc-0a1b2c3d"
  }
}
```

```bash
# List module resources
tofu state list | grep "^module\."

# Show a module resource
tofu state show 'module.networking.aws_vpc.main'

# Extract module resources with jq
tofu show -json | jq 'def resources(m): (m.resources[]?), (m.child_modules[]? | resources(.)); .values.root_module.child_modules[]? | resources(.)'
```

## Conclusion

Understanding the OpenTofu state file JSON format empowers you to build automation, troubleshoot issues, and audit infrastructure. Use `tofu show -json` for a stable, documented format rather than parsing `terraform.tfstate` directly. Combined with `jq` or Python scripts, you can extract virtually any information about your managed infrastructure.
