# Validation Summary: How to Debug Terragrunt with OpenTofu Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terragrunt
- OpenTofu
- HCL configuration language
- Bash / shell tooling (jq, find, tee)

## Sources Consulted
- [Terragrunt Configuration Blocks and Attributes reference](https://docs.terragrunt.com/reference/config-blocks-and-attributes)
- [Terragrunt CLI options reference](https://docs.terragrunt.com/reference/cli-options)
- [Terragrunt Global Flags reference](https://docs.terragrunt.com/reference/cli/global-flags/)
- [Terragrunt CLI Redesign migration guide](https://docs.terragrunt.com/migrate/cli-redesign/)
- [Terragrunt `render` command documentation](https://terragrunt.gruntwork.io/docs/reference/cli/commands/render/)
- [Terragrunt `run` command documentation](https://terragrunt.gruntwork.io/docs/reference/cli/commands/run/)

## Issues Found
1. **Invalid value for `mock_outputs_merge_strategy_with_state`** — The post used `"shallow_merge"`, which is not a recognized value. The valid values for this attribute are `"no_merge"`, `"shallow"`, and `"deep_map_only"` (per Terragrunt's dependency block documentation). Changed `"shallow_merge"` to `"shallow"` in the "Debugging Mock Outputs" section.

## Review Notes
- The post uses the legacy `--terragrunt-*` prefixed flags (e.g., `--terragrunt-log-level`, `--terragrunt-working-dir`, `--terragrunt-no-auto-init`, `--terragrunt-source-update`, `--terragrunt-parallelism`, `--terragrunt-fetch-dependency-output-from-state`, `--terragrunt-json-out`) and legacy commands (`render-json`, `validate-inputs`, `graph-dependencies`, `run-all`). As of Terragrunt v1.0, these have been deprecated in favor of shorter equivalents (e.g., `--log-level`, `--working-dir`, `render --json -w`, `hcl validate --inputs`, `dag graph`, `run --all`), but the legacy forms still work during the deprecation period and emit warnings rather than errors. The content remains functional but a future revision could update to the new CLI surface.
- The "Error reading file" section conflates a few unrelated failure modes (heredoc interpolation vs. an undefined local). The example as written is still valid HCL and the fix shown is reasonable; left as-is since it is not technically incorrect.
- The `--terragrunt-fetch-dependency-output-from-state` flag has caveats not mentioned in the post: it only supports the S3 backend and is incompatible with OpenTofu state encryption. Not added to the post since the existing usage is correct, just narrow.
