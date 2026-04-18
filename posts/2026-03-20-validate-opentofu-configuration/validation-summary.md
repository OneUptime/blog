# Validation Summary: How to Validate Your OpenTofu Configuration with tofu validate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu validate`, `tofu init`, `tofu fmt`, `tofu plan`)
- HCL (HashiCorp Configuration Language)
- AWS provider (`hashicorp/aws` ~> 5.0)
- GitHub Actions (`opentofu/setup-opentofu@v1`)
- Makefile
- jq (JSON processing)

## Sources Consulted
- OpenTofu `tofu validate` docs: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu Input Variables docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu Custom Conditions docs: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu 1.9.0 release notes: https://github.com/opentofu/opentofu/releases/tag/v1.9.0

## Issues Found
- **Incorrect version claim for variable validation**: The post stated "OpenTofu 1.9+ supports custom validation rules in variable blocks." Custom variable validation rules have been supported since OpenTofu 1.0 (inherited from Terraform 0.13). OpenTofu 1.9.0's headline features are `for_each` in provider configurations and the `-exclude` planning option — not variable validation. Changed the sentence to "OpenTofu supports custom validation rules in variable blocks:" to remove the misleading version restriction. The example code only uses self-references (`var.environment` inside the `environment` variable's validation), which has always been supported.

## Review Notes
- The `tofu validate` command, its `-json` flag, and the documented JSON output schema (`format_version`, `valid`, `error_count`, `warning_count`, `diagnostics`) all match the official OpenTofu CLI docs.
- `tofu init -backend=false` and `tofu fmt -check -recursive` flags are correct and current.
- The `opentofu/setup-opentofu@v1` GitHub Action and `tofu_version: "1.9.0"` are valid (1.9.0 was released January 2025).
- The error-output JSON snippet omits `format_version` and `warning_count` for brevity (the snippet uses `...` to indicate truncation), which is acceptable as an illustrative example.
- Cross-variable references inside `validation` blocks are supported in modern OpenTofu, but the post's examples don't exercise this, so no further changes were needed there.
