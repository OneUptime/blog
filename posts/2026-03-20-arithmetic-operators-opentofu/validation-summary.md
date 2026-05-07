# Validation Summary: How to Use Arithmetic Operators in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider
- CIDR subnet calculations

## Sources Consulted
- OpenTofu Arithmetic and Logical Operators: https://opentofu.org/docs/v1.11/language/expressions/operators/
- OpenTofu Functions index: https://opentofu.org/docs/language/functions/
- OpenTofu `ceil` function: https://opentofu.org/docs/language/functions/ceil/
- OpenTofu `floor` function: https://opentofu.org/docs/language/functions/floor/
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu Types and Values: https://opentofu.org/docs/language/expressions/types/
- OpenTofu `cidrsubnet` function: https://opentofu.org/docs/language/functions/cidrsubnet/
- AWS provider `aws_autoscaling_group` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/autoscaling_group.html.markdown
- AWS provider `aws_ebs_volume` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ebs_volume.html.markdown
- AWS provider `aws_security_group_rule` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown

## Issues Found
- The post used `round()` in the division example and conclusion, but current OpenTofu built-in functions do not include a `round` function. I removed that example, kept the supported `floor()` and `ceil()` examples, and updated the wording from “floats” to “fractional numbers” to match OpenTofu’s `number` type terminology.
- The port calculation example used `aws_security_group_rule`. Current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` as best practice for new rules. I updated the snippet to `aws_vpc_security_group_ingress_rule` and changed the arguments accordingly (`cidr_ipv4` and `ip_protocol`).
- The percentages example comment said it reserved 20% capacity for surge, but the code actually calculated an 80% on-demand and 20% spot split. I corrected the comment so the explanation matches the calculation.

## Review Notes
- The arithmetic operator examples themselves are correct: OpenTofu documents `+`, `-`, `*`, `/`, `%`, and unary `-` as supported arithmetic operators.
- The `count` meta-argument and the `cidrsubnet` `netnum` argument both require whole numbers. The examples satisfy that requirement with the defaults shown.
- `launch_template.version = "$Latest"` is valid for `aws_autoscaling_group`. The AWS provider docs note that `instance_refresh` is not triggered automatically when `version = "$Latest"` is used, but that caveat does not make the example incorrect for this post.
