# Validation Summary: How to Choose Between count and for_each in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider resources for OpenTofu/Terraform-compatible IaC
- AWS EC2, VPC, IAM, and Route 53 resources

## Sources Consulted
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/count/
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `enabled` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- OpenTofu resource addressing docs: https://opentofu.org/docs/v1.7/cli/state/resource-addressing/
- AWS provider `aws_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_iam_user` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_user.html.markdown
- AWS provider `aws_subnet` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- AWS provider `aws_route53_record` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- AWS provider `aws_route53_zone` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone.html.markdown
- AWS provider `aws_security_group_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown

## Issues Found
- The comparison table said `for_each` accepted a generic “Map or Set”. Updated it to “Map or Set of strings” and clarified that `count` expects a whole number, matching the OpenTofu language docs.
- The `for_each` example used `aws_security_group_rule`. The current official AWS provider docs recommend avoiding that resource for new configurations in favor of `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`, so the example was updated to the current best-practice resource and argument names.
- The stability example used `name` as a top-level argument on `aws_instance`, which is not a valid argument for that resource. It was replaced with a valid `tags` block using `Name`.
- The stability example omitted required `aws_instance` arguments (`ami` and `instance_type`), so those were added to make the snippet valid as written.
- The explanation said index shifts cause “UNWANTED recreations.” That is too absolute: shifting indices causes unwanted changes to multiple instances, and whether those become replacements depends on which arguments changed. The wording was corrected to reflect actual OpenTofu/provider behavior.
- The decision guide described `for_each` as the choice for any “Collection,” which is broader than the documented resource behavior. It was narrowed to “Map or set of strings.”

## Review Notes
- OpenTofu v1.11 introduced the `enabled` meta-argument as a cleaner option for conditionally creating a single resource or module instance. The post’s `count = condition ? 1 : 0` example remains valid, but `enabled` is now an official alternative for that specific zero-or-one pattern.
- Using `toset(...)` for `for_each` removes ordering and duplicate values. That behavior is consistent with the article’s stability guidance and is worth keeping in mind when naming resources from a list.
