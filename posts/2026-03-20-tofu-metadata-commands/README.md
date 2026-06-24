# How to Use tofu metadata Commands - Tofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use OpenTofu's tofu metadata subcommands to retrieve information about functions, schemas, and provider capabilities for tooling and integration.

## Introduction

The `tofu metadata` command group provides introspection capabilities - it lets you query information about OpenTofu function signatures. These commands are primarily used by tooling, editor extensions, and automation scripts rather than in day-to-day infrastructure management. For provider schemas, use the separate `tofu providers schema -json` command.

## tofu metadata functions

List all available OpenTofu function signatures:

```bash
# Print all available function signatures as JSON

tofu metadata functions -json

# Output (partial):
# {
#   "format_version": "1.0",
#   "function_signatures": {
#     "abs": {
#       "return_type": "number",
#       "parameters": [
#         {
#           "name": "num",
#           "type": "number"
#         }
#       ]
#     },
#     ...
#   }
# }
```

## tofu metadata functions -json

```bash
# JSON output for machine processing
tofu metadata functions -json

# Get all function names
tofu metadata functions -json | jq -r '.function_signatures | keys[]'

# Search function names
tofu metadata functions -json | jq -r '.function_signatures | keys[] | select(test("string|join|split"))'

# Get function signature
tofu metadata functions -json | jq '.function_signatures.cidrsubnet'
```

## Practical Function Discovery

```bash
# Find encoding and decoding functions by name
tofu metadata functions -json | jq '.function_signatures | keys[] | select(test("base64|json|yaml|csv|url"))'

# Find CIDR network functions
tofu metadata functions -json | jq '.function_signatures | keys[] | select(test("(^|::)cidr"))'

# Get a function's parameters
tofu metadata functions -json | \
  jq '.function_signatures.format | {parameters, variadic_parameter}'
```

## tofu providers schema

Retrieve provider schema information programmatically:

```bash
# Get provider schemas for providers in the configuration
tofu providers schema -json

# Get schema for a specific provider's resource
tofu providers schema -json | jq '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas["aws_instance"].block.attributes'
```

## Using Metadata in IDE Tooling

The `tofu metadata` commands are primarily used by:

- Language servers (tofu-ls)
- VS Code extensions
- IntelliJ plugins
- Custom tooling that needs to validate configurations

```bash
# Example: Check if a function exists
FUNC_EXISTS=$(tofu metadata functions -json | jq -r '.function_signatures | keys[] | select(. == "yamldecode")')
if [ -n "$FUNC_EXISTS" ]; then
  echo "yamldecode is available"
fi
```

## Listing All CLI Commands

```bash
# Get all available commands and subcommands
tofu --help

# Get help for a specific command
tofu metadata --help

# All metadata subcommands
tofu metadata functions --help
```

## Conclusion

The `tofu metadata` commands are designed for tooling integration and programmatic discovery of OpenTofu capabilities. Use `tofu metadata functions -json` to explore available built-in functions and their signatures. For most day-to-day infrastructure work, the OpenTofu documentation and IDE extensions provide better interfaces for this information, but the CLI commands are invaluable for building custom tools and automation around OpenTofu.
