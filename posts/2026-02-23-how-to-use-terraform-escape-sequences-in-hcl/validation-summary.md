# Validation Summary: How to Use Terraform Escape Sequences in HCL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HCL / Terraform language string expressions
- Terraform template interpolation and directives
- Terraform heredoc strings
- Terraform functions: `jsonencode`, `templatefile`, `replace`, `regex`, `format`
- Terraform provisioners: `local-exec`
- JSON and regular expressions in Terraform strings

## Sources Consulted
- Terraform Strings and Templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform `format` function documentation: https://developer.hashicorp.com/terraform/language/functions/format
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Referenced OneUptime link: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-json-policies-in-terraform/view

## Issues Found
- Terraform heredoc markers cannot be single-quoted to disable interpolation. Replaced the invalid `<<'EOF'` example with the documented `$${` escaping pattern and updated the explanation.
- The post described `$$` as though it were a general dollar-sign escape in a shell script. Terraform's documented special escape is `$${` for a literal `${`; a lone `$` does not need escaping. Updated command substitution and `$PATH` examples accordingly.
- The indented heredoc explanation said the closing marker determines the indentation level. Terraform instead trims the smallest common leading-space count from the heredoc sequence. Updated the explanation.
- The JSON pitfall label said "unescaped quotes" while the shown string already escaped quotes. Updated the label to describe the real issue: manual JSON string escaping is hard to read and error-prone.

## Review Notes
- Terraform was not installed in the local environment, so validation was performed against official HashiCorp documentation rather than by running `terraform validate`.
- The `templatefile` example uses `.sh.tpl`; Terraform's current documentation recommends `*.tftpl` for editor support, but `.sh.tpl` remains valid.
