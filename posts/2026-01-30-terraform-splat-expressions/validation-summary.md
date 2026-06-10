# Validation Summary: How to Create Terraform Splat Expressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform / HCL (HashiCorp Configuration Language)
- Splat expressions (`[*]` and legacy `.*`)
- For expressions
- Terraform built-in functions (`values()`, `flatten()`, `zipmap()`, `slice()`, `element()`, `cidrsubnet()`, `length()`, `min()`, `upper()`)
- AWS provider resources (`aws_instance`, `aws_security_group`, `aws_subnet`, `aws_vpc`, `aws_ebs_volume`, `aws_lb_target_group`, `aws_lb_target_group_attachment`, `aws_route53_record`)
- AWS data sources (`aws_availability_zones`)
- `count` and `for_each` meta-arguments

## Sources Consulted
- HashiCorp Terraform docs: Splat Expressions — https://developer.hashicorp.com/terraform/language/expressions/splat
- HashiCorp Terraform docs: For Expressions — https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp Terraform docs: References to Resources (count.index, splat with count/for_each) — https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform docs: `values`, `flatten`, `zipmap`, `slice`, `element`, `cidrsubnet` function references
- Terraform AWS Provider docs for `aws_instance`, `aws_subnet`, `aws_route53_record`, `aws_lb_target_group_attachment` attribute references

## Issues Found

1. **"Splat with Conditional Logic" section was misleading.** The section title and intro claimed to demonstrate "combining splats with conditional expressions," but the code example used only a `for` expression with an `if` clause — no splat operator. Per HashiCorp docs, splat expressions cannot filter; that requires a `for` expression. Renamed the section to "Filtering with For Expressions" and updated the intro to accurately state that splat expressions cannot filter, so `for` expressions are required for conditional logic.

## Review Notes
- The post correctly describes the difference between `[*]` (full splat) and `.*` (legacy splat), and the recommendation to prefer `[*]` matches HashiCorp's official guidance (legacy splat is retained only for backward compatibility and may be deprecated in the future).
- The pattern `values(aws_subnet.private)[*].id` for splat with `for_each` resources is correct and matches official examples.
- The "Mistake 1" claim that splat on a single resource (no `count`/`for_each`) returns a single-element list is correct — the full splat coerces non-list values into a single-element tuple per the docs.
- Chained attribute access after splat (e.g., `aws_instance.web[*].tags.Name`) is supported by the full splat operator.
- The AMI ID `ami-0c55b159cbfafe1f0` is a placeholder format; real users will need to substitute a current AMI ID for their region. This is conventional for tutorial examples.
- The "Performance Considerations" claim that splat expressions are "evaluated during the plan phase and do not impact runtime performance" is a slight oversimplification — Terraform evaluates expressions during graph evaluation across both plan and apply, not exclusively at "plan phase." Since Terraform has no long-running runtime, the broader point (no runtime cost) is accurate enough for a tutorial audience and was left as-is.
- All AWS resource attributes referenced (`private_ip`, `public_dns`, `fqdn`, `cidr_block`, `availability_zone`, `arn`, etc.) are valid per the AWS provider docs.
