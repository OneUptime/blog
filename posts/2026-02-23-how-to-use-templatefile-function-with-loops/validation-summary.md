# Validation Summary: How to Use the templatefile Function with Loops

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL string templates
- `templatefile`
- `templatestring`
- `jsonencode`
- Nginx configuration
- Kubernetes YAML
- Shell scripts

## Sources Consulted
- HashiCorp Terraform documentation: Strings and Templates - https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Terraform documentation: `templatefile` Function - https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform documentation: `templatestring` Function - https://developer.hashicorp.com/terraform/language/functions/templatestring
- HashiCorp Terraform documentation: `jsonencode` Function - https://developer.hashicorp.com/terraform/language/functions/jsonencode

## Issues Found
- The whitespace-trimming example used leading strip markers (`%{~for ...}` and `%{~endfor}`) in a way that would strip whitespace before the directives, including the newline after `Items:`. Changed the example to use trailing strip markers (`%{for ...~}` and `%{endfor~}`), which matches the intended explanation of removing newlines after directives.
- The explanation of `~` markers implied that "beginning" and "end" corresponded generally to directive placement. Updated it to state the documented behavior precisely: a marker immediately after `%{` strips whitespace before the sequence, while a marker immediately before `}` strips whitespace after it.
- The text said `%{for}` works only inside template files or template strings used with `templatestring`. Updated it to clarify that Terraform string templates also include quoted and heredoc string expressions, while preserving the post's focus on `templatefile`.

## Review Notes
- Terraform was not installed in the local environment, so examples were reviewed statically against official HashiCorp documentation rather than executed with `terraform console`.
- The `.tpl` filenames in the post are valid, but HashiCorp currently recommends the `.tftpl` naming pattern for Terraform template files to improve editor support.
- For JSON and YAML generation, HashiCorp recommends using `jsonencode` or `yamlencode` where practical to avoid escaping and delimiter mistakes. The post already notes this for JSON.
