# Validation Summary: How to Use the alltrue Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (HCL language built-in functions)
- Infrastructure as Code (IaC)
- Terraform-compatible HCL syntax

## Sources Consulted
- OpenTofu `alltrue` function docs: https://opentofu.org/docs/language/functions/alltrue/
- OpenTofu `anytrue` function docs: https://opentofu.org/docs/language/functions/anytrue/
- OpenTofu `strcontains` function docs: https://opentofu.org/docs/language/functions/strcontains/
- OpenTofu `cidrcontains` function docs: https://opentofu.org/docs/language/functions/cidrcontains/
- OpenTofu CLI `tofu console` reference: https://opentofu.org/docs/cli/commands/console/

## Issues Found
No technical issues found.

All claims verified:
- `alltrue` returns `true` if all elements of a boolean list are `true`, `false` if any element is `false`, and `true` for an empty list (vacuous truth). Confirmed against the official docs.
- `strcontains(string, substr)` is a valid built-in function.
- `cidrcontains(network_prefix, target)` is a valid OpenTofu function (note: this is OpenTofu-specific and not present in upstream Terraform; the example usage in the post is consistent with the documented signature).
- `anytrue` description in the comparison table is accurate.
- The HCL examples (validation block, locals, output, for-expression in tofu console) are syntactically correct.
- The `tofu console` REPL behavior shown matches the actual interactive prompt format.

## Review Notes
- The `cidrcontains` function is OpenTofu-specific and is not available in HashiCorp Terraform. Readers porting these examples to Terraform should be aware of this distinction; the post is correctly framed as OpenTofu-focused so this is acceptable.
- The instance-type validation example assumes a fixed list of family prefixes (`t3`, `m5`, `r5`, `c5`). This is illustrative; AWS regularly adds new instance families, so users adopting this pattern should keep the allowlist current.
