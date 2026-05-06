# Validation Summary: How to Combine Variables and Locals Effectively in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS load balancer listener configuration patterns

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Local Values: https://opentofu.org/docs/language/values/locals/
- OpenTofu `coalesce` function: https://opentofu.org/docs/v1.8/language/functions/coalesce/
- OpenTofu `merge` function: https://opentofu.org/docs/v1.8/language/functions/merge/
- OpenTofu `concat` function: https://opentofu.org/docs/language/functions/concat/
- OpenTofu `timestamp` function: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `tostring` function: https://opentofu.org/docs/language/functions/tostring/
- Terraform AWS provider `aws_lb_listener` resource reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener

## Issues Found
- The tag-merging example used `merge()` in an order that allowed `var.extra_tags` to override values described as always-required tags. I reordered the arguments so computed tags win on conflicts, which matches OpenTofu's documented "later arguments take precedence" behavior.
- The same tag-merging example used `timestamp()` inside a tag map. OpenTofu documents that `timestamp()` changes every second and causes diffs on every run when used in resource attributes, so I removed that field from the example.
- The tag-merging example referenced `var.environment` and `var.project_name` without declaring them in that snippet. I added those variable declarations so the example is internally consistent.
- The listener example could redirect HTTP traffic to HTTPS even when no certificate ARN was provided, which would produce an invalid effective configuration. I added a computed `enable_https` local so redirect and HTTPS listener creation only happen when both SSL is enabled and a certificate ARN is set.
- The HTTPS listener object used `ssl_certificate`, which does not match the AWS listener argument naming used by the provider docs. I changed it to `certificate_arn`.

## Review Notes
- The environment-defaults example assumes `var.environment` is one of `dev`, `staging`, or `prod`. Adding variable validation would improve failure messages, but the current pattern is technically valid.
- The listener example is still a pattern snippet rather than a complete module; downstream resource code must map the local object fields consistently.
