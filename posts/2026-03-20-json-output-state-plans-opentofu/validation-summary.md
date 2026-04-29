# Validation Summary: JSON Output for State and Plans in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state and plan JSON output
- `jq`
- Infrastructure as Code

## Sources Consulted
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON output format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu `state show` command documentation: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The post used `tofu show -json aws_vpc.main` as if `tofu show` accepted a resource address. That is incorrect. I replaced it with a `tofu show -json | jq ...` example that selects a specific resource from the state JSON, which matches the documented `show` and `state show` behavior.
- Several `jq` examples claimed to list or query all state resources but only inspected `.values.root_module.resources`, which omits resources in child modules. I updated those examples to recurse through `child_modules` so they work for nested-module state as described.
- The plan JSON example used `"format_version": "1.1"`, while the OpenTofu JSON output format documentation currently defines the format version as `"1.0"`. I corrected the sample to match the official schema.
- The plan-to-JSON examples used legacy positional plan-file syntax. I updated them to `tofu show -plan=tfplan -json` to match the current recommended `show` command usage.
- The “empty plan” check used `.resource_changes | length == 0`, which is not a correct no-change test for OpenTofu plan JSON. I replaced it with a check that verifies all `resource_changes` are `["no-op"]` and that `output_changes` is empty.

## Review Notes
- `tofu show -json` can expose sensitive values from state in plain text. Any saved JSON artifacts or CI logs should be handled accordingly.
- The `format_version` field is the compatibility marker for the JSON schema. Consumers should tolerate unknown properties for forward compatibility with future minor-format additions.
