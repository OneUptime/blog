# Validation Summary: How to Use strcontains(), startswith(), and endswith() in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HCL (HashiCorp Configuration Language)
- AWS provider (used in examples: `aws_instance`, `aws_s3_bucket`)

## Sources Consulted
- OpenTofu `strcontains` function docs: https://opentofu.org/docs/language/functions/strcontains/
- OpenTofu `startswith` function docs: https://opentofu.org/docs/language/functions/startswith/
- OpenTofu `endswith` function docs: https://opentofu.org/docs/language/functions/endswith/

## Issues Found
No technical issues found.

All three function signatures match the official documentation:
- `strcontains(string, substr)` returns boolean
- `startswith(string, prefix)` returns boolean
- `endswith(string, suffix)` returns boolean

The interactive console (`>`) examples produce the documented results. Variable `validation` block usage is correct, the `for` expression with `if` filtering is syntactically valid, and the predicted filtered list outputs match what the expressions would produce given the inputs. The case-sensitivity note in the conclusion is accurate — these functions perform exact matching.

## Review Notes
- The graviton filter in the "Filtering Lists" section (`endswith(t, "g.micro") || strcontains(t, "g.")`) is logically redundant because any string ending with `g.micro` also contains `g.`. The output remains correct, so this is a style/clarity observation rather than a technical error.
- The post does not state minimum OpenTofu/Terraform versions; for reference, all three functions have been available since Terraform 1.5 / OpenTofu 1.6.
