# Validation Summary: How to Use the indent Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (`indent`, `templatefile`, `jsonencode`, `yamldecode`, `trimspace`, `base64encode`, `join` functions)
- HCL (HashiCorp Configuration Language) heredoc strings and template interpolation
- Terraform (compatible function)
- Kubernetes (ConfigMap manifests via `kubernetes_manifest` resource)
- AWS EC2 user_data
- Cloud-init YAML templates

## Sources Consulted
- Official OpenTofu `indent` function documentation: https://opentofu.org/docs/language/functions/indent/
- Terraform `indent` function documentation: https://developer.hashicorp.com/terraform/language/functions/indent
- HCL template syntax for verifying nested double-quoted strings inside `${...}` interpolation

## Issues Found
No technical issues found.

The function signature `indent(num_spaces, string)` matches the official documentation. The behavior described — that the function adds spaces to all lines EXCEPT the first — is accurate, and the rationale for this design (allowing the first line to align inline with the surrounding template position) matches the official explanation. The basic example outputs are correct:

- `indent(4, "line1\nline2\nline3")` → `"line1\n    line2\n    line3"` ✓
- `"key: |\n  ${indent(2, "line1\nline2\nline3")}"` → `"key: |\n  line1\n  line2\n  line3"` ✓

Nested double-quoted strings inside `${...}` interpolation (used in the `yaml_indent` example) are valid HCL — the official OpenTofu docs use the same pattern. All other functions referenced (`templatefile`, `jsonencode`, `yamldecode`, `trimspace`, `base64encode`, `join`) are real OpenTofu functions used correctly. The `tofu console` CLI command and `<<-` indented heredoc syntax are accurate.

## Review Notes
- The `indent(0, local.bootstrap_commands)` call in the AWS user_data example is technically valid but functionally a no-op (zero spaces added). It does not break anything, but readers may find it slightly confusing as a demonstration; the example would still work without the `indent` call.
- The "Embedding Scripts in YAML Templates" section shows the template content with `#` comment markers as if illustrating what the `.tpl` file would contain. Real `.tpl` files would not have those leading `#` characters; this is a presentation choice in the prose rather than literal template content. The IaC code block (the `variable` and `locals` definitions) below it is correct as-is.
- The `kubernetes_manifest` resource expects a structured value, and `yamldecode` returns one — the usage pattern is correct.
