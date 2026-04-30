# Validation Summary: How to Use the indent Function in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu built-in string functions (`indent`, `yamlencode`, `templatefile`)
- Kubernetes ConfigMaps and Secrets
- AWS Systems Manager Parameter Store

## Sources Consulted
- OpenTofu `indent` function: https://opentofu.org/docs/language/functions/indent/
- OpenTofu `jsonencode` function: https://opentofu.org/docs/language/functions/jsonencode/
- OpenTofu `yamlencode` function: https://opentofu.org/docs/language/functions/yamlencode/
- OpenTofu strings and indented heredocs: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `templatefile` function: https://opentofu.org/docs/language/functions/templatefile/
- Terraform Registry, `kubernetes_config_map` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map.html
- Terraform Registry, `aws_ssm_parameter` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter

## Issues Found
- The two main `indent()` examples used `jsonencode()` even though OpenTofu documents that `jsonencode()` returns minified JSON. That made the examples effectively single-line, so `indent()` would not demonstrate its intended effect. I changed those examples to `yamlencode()`, which produces multi-line block-style YAML and matches the article's explanation of embedding multi-line content.
- Both heredoc examples overcounted the indentation passed to `indent()`. OpenTofu's `<<-` heredoc form trims the common leading spaces from the heredoc body, so the interpolation line already contributes the initial indentation. I corrected the examples to use `indent(4, ...)`, which aligns continuation lines correctly under the YAML block scalar.
- The second heredoc example mixed in undefined AWS resource and variable references for a snippet that was meant to explain `indent()`. I replaced those with self-contained example values so the example remains focused on `indent()` and is technically coherent on its own.

## Review Notes
- The `templatefile()` example is technically valid. OpenTofu recommends using `jsonencode()` or `yamlencode()` inside templates when generating JSON or YAML, rather than manually assembling those formats with many template directives.
