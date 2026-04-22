# Validation Summary: How to Use Sensitive Variables to Redact Values in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu input variables
- OpenTofu local values
- OpenTofu output values
- OpenTofu CLI
- HCL

## Sources Consulted
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu Output Values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu `tofu output` command documentation: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu JSON Output Format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu `sensitive` function documentation: https://opentofu.org/docs/language/functions/sensitive/
- OpenTofu `nonsensitive` function documentation: https://opentofu.org/docs/language/functions/nonsensitive/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/

## Issues Found
- The introduction incorrectly stated that sensitive values are redacted in all terminal output, log files, and JSON plan files. Updated it to say that sensitive values are hidden from normal `tofu plan` and `tofu apply` CLI output, but remain in cleartext in state and saved plan files and can be displayed by commands such as `tofu output -json` and `tofu output -raw`.
- The plan-output example was fenced as `hcl` even though it is terminal output, not valid HCL. Changed the fence to `text`.
- The Sensitive Locals section implied that derived local values must be manually marked sensitive. Updated it to reflect OpenTofu's automatic sensitivity propagation, while keeping the `sensitive()` example as an explicit intent marker.
- The conclusion incorrectly claimed that `sensitive = true` keeps secrets out of JSON plans and logs. Updated it to refer to normal plan/apply terminal output and clarified that it does not encrypt state or saved plan data.

## Review Notes
The remaining examples are technically valid as illustrative snippets. `tofu output -json` and `tofu output -raw` are correct for automation, but they intentionally expose sensitive output values in plain text and should be used only in trusted execution contexts.
