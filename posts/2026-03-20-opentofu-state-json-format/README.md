# How to Use State File JSON Format in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State

Description: Learn about the OpenTofu state file JSON format, its structure, and how to safely read and process state data programmatically.

## Introduction

OpenTofu state is stored as JSON in a well-defined format. Understanding the schema allows you to extract resource data, build audit tools, and integrate with external systems. OpenTofu provides a stable JSON output format specifically for machine consumption.

## State File Top-Level Structure

```json
{
  "version": 4,
  "terraform_version": "1.8.0",
  "serial": 42,
  "lineage": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "outputs": { },
  "resources": [ ]
}
```

| Field | Description |
|---|---|
| `version` | State format version (currently 4) |
| `terraform_version` | OpenTofu version that last wrote the file |
| `serial` | Increments on each write; used to detect conflicts |
| `lineage` | UUID that identifies this state lineage |
| `outputs` | Root module output values |
| `resources` | All tracked resources |

Resource Entry Structure

```json
{
  "mode": "managed",
  "type": "aws_s3_bucket",
  "name": "example",
  "provider": "provider[\"registry.opentofu.org/hashicorp/aws\"]",
  "instances": [
    {
      "schema_version": 0,
      "attributes": {
        "id": "my-unique-bucket",
        "bucket": "my-unique-bucket",
        "arn": "arn:aws:s3:::my-unique-bucket",
        "region": "us-east-1"
      },
      "sensitive_attributes": []
    }
  ]
}
```

## Using tofu show -json (Preferred)

For programmatic consumption, use `tofu show -json` instead of reading state directly - it provides a stable schema:

```bash
# Get structured state as JSON

tofu show -json > state-structured.json

# The output has a different, richer schema
tofu show -json | jq '.values.root_module.resources[].address'
```

## Querying State with jq

```bash
# List all resource types
tofu state pull | jq -r '[.resources[].type] | unique[]'

# Get all resource addresses
tofu state pull | jq -r '.resources[] | "\(.type).\(.name)"'

# Find all S3 bucket ARNs
tofu state pull | jq -r '
  .resources[]
  | select(.type == "aws_s3_bucket")
  | .instances[].attributes.arn
'

# Get all outputs
tofu state pull | jq '.outputs | to_entries[] | {key: .key, value: .value.value}'
```

## Counting Resources by Type

```bash
tofu state pull | jq '
  [.resources[].type]
  | group_by(.)
  | map({type: .[0], count: length})
  | sort_by(-.count)
' | head -20
```

## Getting Module Resources

```bash
# List all module paths
tofu state pull | jq -r '[.resources[] | .module // "root"] | unique[]'

# Resources in a specific module
tofu state pull | jq '
  .resources[]
  | select(.module == "module.vpc")
'
```

## State Version Compatibility

OpenTofu can read older state format versions and will upgrade them automatically. Never manually edit the `version` field.

## Important: Don't Edit State Directly

While state is JSON, never edit it directly:
- Use `tofu state mv`, `tofu state rm`, and `tofu import` for state modifications
- Direct edits can corrupt the state or cause consistency errors
- If manual editing is necessary, use `tofu state push` after editing

## Conclusion

Understanding the OpenTofu state JSON format enables programmatic state inspection, audit tooling, and integration with external systems. Use `jq` for ad-hoc queries, `tofu show -json` for a stable programmatic schema, and `tofu state pull` to access the raw state. Never edit state directly - use the purpose-built `tofu state` subcommands instead.
