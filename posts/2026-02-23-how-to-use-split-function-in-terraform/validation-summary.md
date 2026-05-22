# Validation Summary: How to Use the split Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform string and collection functions
- AWS ARNs
- AWS security group rules

## Sources Consulted
- Terraform `split` function documentation: https://developer.hashicorp.com/terraform/language/functions/split
- Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- Terraform `compact` function documentation: https://developer.hashicorp.com/terraform/language/functions/compact
- Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- Terraform `element` function documentation: https://developer.hashicorp.com/terraform/language/functions/element
- Terraform `length` function documentation: https://developer.hashicorp.com/terraform/language/functions/length
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `trimspace` function documentation: https://developer.hashicorp.com/terraform/language/functions/trimspace
- Terraform `tonumber` function documentation: https://developer.hashicorp.com/terraform/language/functions/tonumber
- AWS IAM ARN format documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html

## Issues Found
- The ARN section said `split` handles ARNs "perfectly" and extracted only `local.arn_parts[6]` as the resource. AWS ARN formats define the resource portion as the sixth field, and that field can include a resource type separated from the resource ID by a colon, such as `function:my-processor`. Updated the text to note that the resource portion can contain colons and changed the example to rejoin parts from index 5 onward.
- The domain example described `example.com` as the top-level domain. The actual top-level domain is `com`; `example.com` is the registered/root domain in this example. Renamed the comment and local value to `registered_domain`.

## Review Notes
- Terraform was not installed in the local environment, so examples were checked against official Terraform documentation rather than `terraform console`.
- The environment-variable parsing example is correct for the simple input shown, but values containing additional `=` characters would need more robust parsing.
