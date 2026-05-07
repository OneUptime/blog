# Validation Summary: How to Assert Output Values in OpenTofu Tests

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL / OpenTofu test files (`*.tftest.hcl`)
- Provider mocking in OpenTofu tests
- AWS provider examples

## Sources Consulted
- OpenTofu CLI docs: Command `test` - https://opentofu.org/docs/cli/commands/test/
- OpenTofu language docs: Output Values - https://opentofu.org/docs/language/values/outputs/
- OpenTofu language docs: Custom Conditions - https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu language docs: `nonsensitive` function - https://opentofu.org/docs/language/functions/nonsensitive/
- OpenTofu GitHub releases: v1.11.6 - https://github.com/opentofu/opentofu/releases/tag/v1.11.6

## Issues Found
- The sensitive-output section said sensitive values are redacted in test failure messages. Current OpenTofu behavior is narrower: you can use sensitive outputs in `assert` conditions, but if `error_message` references a sensitive value, OpenTofu suppresses the rendered message and emits a warning instead. I updated the prose and inline comment to reflect the actual behavior without changing the example's intent.

## Review Notes
- Validated against current OpenTofu documentation and a local verification run using OpenTofu v1.11.6.
