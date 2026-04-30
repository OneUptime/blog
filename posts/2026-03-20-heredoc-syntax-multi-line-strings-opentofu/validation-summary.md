# Validation Summary: How to Use Heredoc Syntax for Multi-Line Strings in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL string templates and heredoc syntax
- AWS provider examples (`aws_instance`, `aws_ssm_parameter`, `aws_iam_policy`)
- Kubernetes provider example (`kubernetes_config_map`)

## Sources Consulted
- OpenTofu strings and templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `jsonencode` function: https://opentofu.org/docs/language/functions/jsonencode/
- OpenTofu `yamlencode` function: https://opentofu.org/docs/language/functions/yamlencode/
- Terraform Registry, AWS provider `aws_ssm_parameter` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform Registry, AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry, AWS provider `aws_iam_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform Registry, AWS provider `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform Registry, Kubernetes provider `kubernetes_config_map` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map

## Issues Found
- The introduction and `<<-` section described indented heredocs as stripping leading whitespace. OpenTofu actually trims the minimum common leading spaces across the heredoc body, so I corrected that wording and the inline comment to match the official behavior.
- The summary said `$${` is used to include literal dollar signs. In OpenTofu, `$${` produces a literal `${` sequence; a plain `$` is already literal unless it begins `${`. I corrected the escaping guidance in the summary.
- The JSON example note understated OpenTofu's guidance for structured data. The official docs recommend using `jsonencode()` or `yamlencode()` instead of heredocs when generating JSON or YAML, so I updated the note and added the matching YAML caveat.

## Review Notes
- The resource snippets are syntactically valid as partial examples. Some referenced variables and resources, such as `aws_db_instance.main` and `data.aws_ami.amazon_linux`, are intentionally omitted because the post is illustrating heredoc usage rather than presenting a complete module.
- The environment does not have the `tofu` CLI installed, so I could not perform local console verification. The review was completed against the current official OpenTofu language documentation and the current provider documentation URLs above.
