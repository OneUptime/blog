# Validation Summary: How to Use Heredoc Strings in Terraform for Multi-Line Text

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform heredoc strings
- Terraform string interpolation and escape sequences
- Terraform `templatefile`
- AWS provider resources and IAM policy documents
- Kubernetes provider ConfigMaps
- Shell scripts embedded in Terraform strings

## Sources Consulted
- Terraform Language: Strings and Templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform Language: `templatefile` function: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform Language: `yamlencode` function: https://developer.hashicorp.com/terraform/language/functions/yamlencode
- HashiCorp HCL parser source for indented heredoc whitespace trimming: https://raw.githubusercontent.com/hashicorp/hcl/main/hclsyntax/parser_template.go
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_iam_policy_document` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Kubernetes provider `kubernetes_config_map` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map

## Issues Found
- The initial `<<-` explanation incorrectly said Terraform strips indentation based on the closing delimiter. Updated it to match Terraform's documented behavior: Terraform finds the heredoc content line with the smallest leading whitespace and trims that many spaces from the beginning of the lines.
- The detailed indentation example described the closing delimiter as controlling the trim width. Updated the comments so they refer to the least-indented content line instead.
- The shell command substitution example used `CURRENT_DATE=$$(date +%Y-%m-%d)`. Terraform does not require escaping `$(`, and the resulting shell syntax would be wrong. Changed it to `CURRENT_DATE=$(date +%Y-%m-%d)`.
- The shell arithmetic example used `RETRY_COUNT=$$((RETRY_COUNT + 1))`. Terraform does not require escaping `$((...))`, and the resulting shell syntax would be wrong. Changed it to `RETRY_COUNT=$((RETRY_COUNT + 1))`.
- Clarified the Terraform escape sequence guidance from `$${ }` to `$${...}` / `$${`, matching Terraform's documented special escape for literal `${`.

## Review Notes
- The Terraform language documentation recommends `jsonencode` or `yamlencode` instead of heredoc strings for generated JSON and YAML so Terraform can guarantee valid syntax. The post already notes that `aws_iam_policy_document` is preferable for IAM policies; future revisions could add a similar note near the YAML examples.
- The local Terraform CLI was not installed, so validation was performed against official Terraform, HCL, AWS provider, and Kubernetes provider documentation rather than by running `terraform validate`.
