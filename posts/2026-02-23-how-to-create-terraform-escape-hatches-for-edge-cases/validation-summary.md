# Validation Summary: How to Create Terraform Escape Hatches for Edge Cases

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform (HCL syntax, variables, modules, resources, locals, data sources)
- Terraform `optional()` type modifier (introduced in Terraform 1.3)
- Terraform built-in functions: `concat`, `jsonencode`, `coalesce`, `try`, `sha256`
- `null_resource` from the `hashicorp/null` provider
- `local-exec` provisioner
- `data "external"` from the `hashicorp/external` provider
- AWS provider resources: `aws_iam_role_policy`, `aws_security_group`, `aws_subnet`, `aws_cloudwatch_log_group`
- AWS IAM policy document JSON schema (Version 2012-10-17)
- Python (os.walk, re module) for tooling/analysis

## Sources Consulted
- Terraform Language documentation: https://developer.hashicorp.com/terraform/language
- Optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- `coalesce` function: https://developer.hashicorp.com/terraform/language/functions/coalesce
- `try` function: https://developer.hashicorp.com/terraform/language/functions/try
- `concat` function: https://developer.hashicorp.com/terraform/language/functions/concat
- `null_resource`: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- `local-exec` provisioner: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- `external` data source: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- AWS IAM JSON policy reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies.html
- AWS provider `aws_security_group` and `aws_iam_role_policy` docs on the Terraform Registry

## Issues Found
No technical issues found.

The HCL code samples use valid syntax. The `optional()` type modifier is correctly used (available since Terraform 1.3). The `coalesce(var.custom_security_group_id, try(aws_security_group.default[0].id, null))` pattern is sound — exactly one of the two arguments will be non-null given the `count` guard on the default security group. The `null_resource` + `local-exec` provisioner pattern is correct, and the `data "external"` schema (`program` + `query`, with `result` as a map of strings) matches the provider documentation. The AWS IAM policy JSON structure (Version, Effect, Action, Resource) is correct.

## Review Notes
- The consumer examples reference variables (`team`, `container_image`, `container_port`, `vpc_id`, `alb_security_group_id`) that are not declared in the snippets shown. This is acceptable for a tutorial showing partial examples but readers should know they would also need to define those inputs.
- The Python regex `r'# ESCAPE HATCH:(.+?)(?=\n[^#])'` requires a non-`#` line to follow the comment block, so an escape hatch block that ends at EOF (with no trailing non-comment line) would not match. This is a minor edge case in the analysis script, not in the Terraform patterns being taught.
- Using `local-exec` provisioners and `null_resource` is correctly flagged in the post as a last-resort escape hatch; HashiCorp's own guidance discourages relying on them when a native resource exists.
- The shell-out in the `local-exec` example interpolates `${var.vendor_api_token}` and `${jsonencode(var.custom_config)}` into a shell command. This works but is sensitive to shell quoting (the JSON payload is wrapped in single quotes, which would break if the JSON contained a single quote). The post does not need to address this — it is a known caveat of `local-exec` rather than a factual error.
