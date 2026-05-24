# Validation Summary: How to Handle Multi-Line Strings in Terraform Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform / HCL2 (heredoc strings, indented heredocs, interpolation, escape sequences)
- Terraform built-in functions: `jsonencode`, `chomp`, `trimspace`, `join`, `file`, `templatefile`
- AWS provider resources: `aws_instance`, `aws_iam_policy`, `aws_s3_bucket`, `aws_db_instance`
- Kubernetes provider: `kubernetes_config_map`
- `null_resource` with `local-exec` provisioner
- Nginx config syntax (used as templating example)

## Sources Consulted
- HashiCorp Terraform docs — Strings and Templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- HCL2 native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Terraform docs — `jsonencode`: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform docs — `chomp`: https://developer.hashicorp.com/terraform/language/functions/chomp
- Terraform docs — `trimspace`: https://developer.hashicorp.com/terraform/language/functions/trimspace
- Terraform docs — `templatefile`: https://developer.hashicorp.com/terraform/language/functions/templatefile
- AWS provider docs for `aws_db_instance` attributes (`address`, `port`, `db_name`)

## Issues Found

### 1. Incorrect escape sequence in Nginx interpolation example
**Location:** "Multi-Line Strings with Interpolation" section, the literal-`${` escape example.

**What was wrong:** The post wrote `set $$request_uri $${uri};` inside a heredoc and described `$${}` (with empty braces) as the escape sequence. In HCL2, the escape is `$${` — it only triggers when `$$` is immediately followed by `{`. A bare `$$` not followed by `{` is preserved verbatim as two dollar signs (per the HCL2 spec and Terraform's strings documentation, which only list `$${` and `%%{` as escape sequences). So `$$request_uri` renders as `$$request_uri`, not `$request_uri` — which would break a real Nginx config.

**What I changed:** Replaced `$$request_uri` with `$request_uri` (a lone `$` not followed by `{` is already literal and needs no escaping), corrected the inline description from `$${}` to `$${`, and added a one-sentence clarification that the escape is only required when the next character would start an interpolation.

## Review Notes

- The indented heredoc examples around `chomp(<<-EOF ... EOF )` and `trimspace(<<-EOF ... EOF )` place the closing marker at less indentation (2 spaces) than the body lines (4 spaces). Because the indented heredoc strips the *minimum* leading whitespace across all lines including the marker, the body retains 2 leading spaces in the final string. This is functional and the `chomp`/`trimspace` calls still demonstrate what's intended, but a reader reproducing the snippet should be aware. Not a correctness bug — left as-is.
- The conditional heredoc example (`var.enable_ssl ? <<-EOF ... EOF : ""`) with the `:` token on its own line after the closing marker is valid in modern Terraform (1.x). Verified against the HCL2 expression grammar.
- All other claims — heredoc marker placement rules, `<<-` indentation stripping behavior, `chomp` and `trimspace` semantics, `jsonencode` recommendation over manual JSON heredocs, `file()` / `templatefile()` usage, the trailing-newline behavior of heredocs, and the `aws_db_instance` attribute names — match the official documentation.
