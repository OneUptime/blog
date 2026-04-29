# Validation Summary: How to Use List Variables in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_lb`, `aws_instance`)

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Type Constraints: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu function docs: `length`, `contains`, `slice`, `concat`, `distinct`, `flatten`, `index`, `sort`, `toset` under https://opentofu.org/docs/language/functions/
- AWS provider `aws_lb` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- AWS provider `aws_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown

## Issues Found
- The "Declaring List Variables" example declared `availability_zones` twice in one module-scoped snippet. OpenTofu requires variable names to be unique within a module, so the first example was renamed to `instance_ids`.
- The load balancer example used `aws_alb`. The current AWS provider resource name is `aws_lb`, with `aws_alb` documented as an equivalent alias, so the example was updated to use the current name.
- The `for_each` comment said it requires "a set or map". OpenTofu specifically accepts a map or a set of strings, so the wording was corrected.
- The conclusion treated `count` and `for_each` as interchangeable primary patterns. OpenTofu documents that `count` with list indexing is fragile when list membership changes, so the guidance was updated to recommend `for_each` when stable per-item identity matters.

## Review Notes
- No additional technical issues found after the fixes.
- `toset()` removes duplicate values and discards ordering, which is important when converting lists for `for_each` or other set-oriented usage.
- The AWS examples are illustrative snippets and still require surrounding provider configuration and environment-specific values such as a valid AMI selection strategy for real deployments.
