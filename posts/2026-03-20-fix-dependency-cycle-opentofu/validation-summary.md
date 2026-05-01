# Validation Summary: How to Fix Dependency Cycle Errors in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu dependency graph and `depends_on`
- AWS provider security group resources
- AWS provider IAM role and inline role policy resources
- HCL

## Sources Consulted
- OpenTofu `tofu graph` command docs: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu `depends_on` docs: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu references and implicit dependency docs: https://opentofu.org/docs/v1.9/language/expressions/references/
- OpenTofu output dependency docs: https://opentofu.org/docs/v1.9/language/values/outputs/
- AWS provider `aws_security_group` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- AWS provider `aws_security_group_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown
- AWS provider `aws_vpc_security_group_egress_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_egress_rule.html.markdown
- AWS provider `aws_iam_role` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role.html.markdown
- AWS provider `aws_iam_role_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown

## Issues Found
- The `tofu graph` example omitted the `-draw-cycles` flag, which OpenTofu documents specifically for diagnosing cycle errors. I updated both example commands to use `-draw-cycles`.
- The security group fix used `aws_security_group_rule`, which the current AWS provider documentation says to avoid in favor of `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`. I updated the fix and conclusion to use the current best-practice resource type.
- The security group fix changed the original rule behavior by converting one of the ingress relationships into a different egress rule on a different port. I corrected the fix so it preserves the original cross-security-group ingress intent while breaking the cycle.
- The IAM `depends_on` example omitted required arguments for `aws_iam_role` and `aws_iam_role_policy`, so it would fail before demonstrating the cycle. I added the required trust policy, inline policy, and role policy name, and split the wrong/correct examples into separate valid code blocks.

## Review Notes
- The module example is directionally correct: OpenTofu infers dependencies from references, and shared resources are often best extracted into a separate module or passed through outputs instead of creating circular relationships.
- The post still uses simplified examples rather than full runnable modules, but after the fixes the snippets are technically aligned with the current OpenTofu and AWS provider documentation.
