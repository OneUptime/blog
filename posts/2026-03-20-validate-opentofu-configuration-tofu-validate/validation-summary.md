# Validation Summary: How to Validate Your OpenTofu Configuration with tofu validate - Tofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- HCL (HashiCorp Configuration Language)
- `tofu validate`, `tofu init`, `tofu fmt`, `tofu plan`
- GitHub Actions CI
- Python 3 (for parsing JSON output)

## Sources Consulted
- OpenTofu `validate` command docs: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `init` command docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `fmt` command docs: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu variables docs (reserved names): https://opentofu.org/docs/language/values/variables/

## Issues Found
1. **Reserved variable name `count`**: The "Type mismatch" example declared `variable "count" { ... }`. `count` is a reserved variable name in OpenTofu (along with `source`, `version`, `providers`, `for_each`, `lifecycle`, `depends_on`, `locals`) and cannot be used as a variable identifier. The example would fail validation with a "Reserved argument name" error, not the intended type-mismatch error. Renamed the variable to `instance_count` in both the ERROR and FIX blocks so the example actually demonstrates the type-mismatch diagnostic the post describes.

2. **Cyclic dependency claim**: The "What tofu validate Checks" list included "Cyclic dependencies". The official OpenTofu docs describe `validate` as checking syntax and internal consistency (attribute names, value types, reference correctness) but do not document cycle detection as a `validate` feature — cycle detection is performed during `plan`'s graph walk. Removed this bullet to keep the feature list aligned with the documented behavior.

## Review Notes
- JSON output format (`format_version: "1.0"`, `valid`, `error_count`, `warning_count`, `diagnostics`) matches the official spec.
- `tofu init -backend=false` is the officially recommended approach for validation in CI (per the validate command docs).
- `tofu fmt -check` flag usage is correct.
- The error output ASCII uses `│` box-drawing characters, which matches OpenTofu's actual diagnostic formatting.
- Minor future improvement: the inline Python one-liners using `python3 -c "..."` with embedded double-quoted JSON keys (`result[\"error_count\"]`) work but are fragile in shell contexts; a heredoc-based script or `jq` would be more robust in real CI pipelines. Not changed since it is functional.
