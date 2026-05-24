# Validation Summary: How to Fix Terraform Template Rendering Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL2)
- `templatefile()` function
- `template_file` data source (deprecated `hashicorp/template` provider)
- Template directives (`%{ if }`, `%{ for }`, `%{ endif }`, `%{ endfor }`)
- Whitespace control (`~`)
- `jsonencode()` / `yamlencode()` functions
- `path.module` / `path.root` references
- Bash (in template body examples)

## Sources Consulted
- Terraform `templatefile` function docs: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform string templates / directives: https://developer.hashicorp.com/terraform/language/expressions/strings
- HCL2 native syntax spec (template expressions): https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- `template_file` data source (deprecated): https://registry.terraform.io/providers/hashicorp/template/latest/docs/data-sources/file
- `jsonencode` / `yamlencode` function docs on developer.hashicorp.com
- Terraform `path.module` / `path.root` reference: https://developer.hashicorp.com/terraform/language/expressions/references

## Issues Found

1. **Error 3 — incorrect claim that spaces are required inside `%{ ... }` directives.**
   The post asserted that `%{if condition}` (without spaces) was invalid syntax and that `%{ if condition }` was required. The HCL2 template lexer skips whitespace between tokens inside a directive, so `%{if cond}` parses identically to `%{ if cond }`. The shown error message would not result from this. Removed the misleading "missing spaces" example and kept the genuinely accurate "mismatched directives" example that follows.

2. **Error 5 — overly strong claim that `${}` cannot be nested inside another `${}`.**
   Nested interpolation was problematic in Terraform 0.11 and earlier, but in HCL2 / Terraform 0.12+ a string template such as `"${var.env}-key"` is a valid expression inside another `${ ... }`. Reworded the section to note that nested interpolation is valid but redundant and harder to read, preserving the (still good) recommendation to extract a local.

## Review Notes
- The error message text in Error 1 and Error 6 is paraphrased rather than verbatim Terraform output, but the format is plausible and the substance is correct. Left as-is.
- The whitespace-control example in Error 8 is correct: `%{ for s in subnets ~}` strips the newline after the opening directive, the loop body's trailing `\n` provides the one-per-line separator, and `%{ endfor ~}` strips the trailing newline after the closing directive.
- The `template_file` data source is from the legacy `hashicorp/template` provider, which is archived and not supported on darwin_arm64 / new platforms; the migration guidance is current and accurate.
- For users on very recent Terraform versions, `jsonencode` / `yamlencode` are preferred for structured user-data, as the post correctly recommends.
