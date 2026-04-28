# How to Use tofu metadata Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu metadata commands to access OpenTofu function signatures and generate machine-readable schema information.

## Introduction

The `tofu metadata` command group provides utilities for accessing metadata about OpenTofu itself - primarily function signatures and schema information. These commands are primarily used by tooling authors (IDE plugins, documentation generators) but are also useful for exploring what functions are available and understanding their signatures.

## tofu metadata functions

`tofu metadata functions` prints signatures for all built-in functions available in the current OpenTofu version. The `-json` flag is a required option, so the output is always machine-readable JSON.

```bash
# Without -json, the command exits with an error
tofu metadata functions
# Error: The -json flag is required for the metadata functions command.
```

## JSON Output for Tooling

```bash
# Machine-readable function metadata
tofu metadata functions -json

# Output (excerpt):
# {
#   "format_version": "1.0",
#   "function_signatures": {
#     "abs": {
#       "description": "Returns the absolute value of the given number.",
#       "return_type": "number",
#       "parameters": [
#         {
#           "name": "number",
#           "type": "number"
#         }
#       ]
#     },
#     ...
#   }
# }
```

## Exploring Function Signatures with jq

```bash
# List all function names
tofu metadata functions -json | jq '.function_signatures | keys[]'

# Get details for a specific function
tofu metadata functions -json | jq '.function_signatures.cidrsubnet'
# Output:
# {
#   "description": "...",
#   "return_type": "string",
#   "parameters": [
#     {"name": "prefix", "type": "string"},
#     {"name": "newbits", "type": "number"},
#     {"name": "netnum", "type": "number"}
#   ]
# }
```

## Finding Functions by Return Type

```bash
# List all functions that return a string
tofu metadata functions -json | jq '
  .function_signatures |
  to_entries[] |
  select(.value.return_type == "string") |
  .key
'
```

## Count Available Functions

```bash
tofu metadata functions -json | jq '.function_signatures | length'
# Returns the count of all built-in functions
```

## Provider Schema via tofu providers schema

For provider-specific schema (resources, data sources, and provider configuration):

```bash
# Dump all provider schemas after init
tofu providers schema -json

# Get schema for a specific provider's resources
tofu providers schema -json | jq '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas | keys[]'

# Get attributes of a specific resource
tofu providers schema -json | jq '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas.aws_s3_bucket.block.attributes | keys[]'
```

## Use Cases for metadata Commands

**Documentation generators:** Extract all function signatures to build reference docs.
**IDE plugins:** Use function signatures for autocompletion and type hints.
**Linters:** Validate function calls against known signatures.
**Schema exploration:** Understand provider resource attributes without reading provider docs.

## Automation Example

```bash
#!/bin/bash
# Generate a function reference table
tofu metadata functions -json | jq -r '
  .function_signatures |
  to_entries[] |
  "\(.key) -> \(.value.return_type)"
' | sort > function-reference.txt
```

## Conclusion

`tofu metadata functions` is a low-level command primarily used by tooling authors. It provides machine-readable function signatures for all built-in OpenTofu functions. Pair it with `tofu providers schema -json` to get complete schema information for installed providers. Both commands are useful for building documentation, IDE integrations, and validation tooling. For day-to-day work, `tofu console` is more practical for testing function behavior.
