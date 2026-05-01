# Validation Summary: How to Use Dynamic Blocks for Load Balancer Listeners in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Application Load Balancer (ALB)
- Terraform AWS Provider

## Sources Consulted
- OpenTofu dynamic blocks documentation: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- OpenTofu `for_each` documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- AWS provider `aws_lb_listener` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener.html.markdown
- AWS provider `aws_lb_listener_rule` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener_rule.html.markdown
- AWS Application Load Balancer security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS `CreateListener` API reference: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateListener.html
- AWS guide for creating an HTTPS listener on an ALB: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html

## Issues Found
- The `listener_rules` and `weighted_targets` examples used empty strings for `target_group_arn`. The AWS provider expects target group ARNs for these fields, so the published defaults were not valid working examples. I replaced the empty strings with well-formed example ARNs.

## Review Notes
- The listener rule example using `for_each`, the weighted `forward` block with nested `dynamic "target_group"` blocks, and the multi-listener example with two conditional `dynamic "default_action"` blocks are all valid against the current OpenTofu language and AWS provider schema.
- I also validated the patterns locally with OpenTofu `v1.11.0` and `hashicorp/aws` provider `v6.43.0`.
