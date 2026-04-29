# Validation Summary: How to Mark Outputs as Sensitive in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu CLI
- Infrastructure as Code

## Sources Consulted
- OpenTofu docs: Output values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu docs: Input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu docs: `tofu output` command: https://opentofu.org/docs/cli/commands/output/
- OpenTofu source: `internal/command/output_test.go`: https://github.com/opentofu/opentofu/blob/main/internal/command/output_test.go
- OpenTofu source: `internal/command/apply_test.go`: https://github.com/opentofu/opentofu/blob/main/internal/command/apply_test.go

## Issues Found
- The post stated that sensitive outputs are always shown as `(sensitive value)`. OpenTofu uses `<sensitive>` in the `Outputs:` section and for the default `tofu output <name>` command, while `(sensitive value)` is used in other plan/apply UI contexts. I corrected the introductory explanation and both CLI examples to match the documented and tested behavior.

## Review Notes
- Sensitive outputs are still stored in OpenTofu state in cleartext unless separate state protection mechanisms are used. The post is still technically correct after the CLI-redaction fixes, but that caveat could be worth mentioning in a future revision.
