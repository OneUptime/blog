# Validation Summary: How to Use for_each with Sets to Create Resources in OpenTofu (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider
- AWS IAM
- AWS EC2
- AWS KMS
- AWS VPC

## Sources Consulted
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `replace` function: https://opentofu.org/docs/language/functions/replace/
- AWS provider `aws_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_iam_group_membership` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_group_membership.html.markdown
- AWS provider `aws_kms_grant` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_grant.html.markdown
- AWS provider `aws_security_group_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown
- AWS provider `aws_subnet` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown

## Issues Found
- The EC2 example used a hard-coded AMI ID that was region-specific and stale. I replaced it with the provider-documented SSM AMI reference for Amazon Linux 2023 so the example follows a current pattern.
- The `DNS Records with Sets` section was mislabeled. I renamed it to `Security Group Ingress Rules with Sets` because the code configures security group ingress, not DNS.
- The security group example used `aws_security_group_rule`, which the current AWS provider documentation recommends avoiding in favor of `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`. I updated the resource and its arguments accordingly.
- The conclusion described address stability in terms of items being added or removed from the "middle" of a collection, which is imprecise for sets because sets are unordered. I reworded it to explain that stability comes from value-based keys rather than numeric indices.

## Review Notes
- `toset()` removes duplicates and discards ordering when converting a list to a set. The examples remain correct because they use unique string values.
- `aws_iam_group_membership` is an exclusive top-level group membership resource. The example is valid as written, but the same group should not be managed by multiple `aws_iam_group_membership` resources.
- Local `tofu` and `terraform` CLIs were not available in this environment, so validation was performed against current official documentation rather than by executing the snippets.
