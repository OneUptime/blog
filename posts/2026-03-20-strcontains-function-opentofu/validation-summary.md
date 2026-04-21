# Validation Summary: How to Use the strcontains Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu string functions: `strcontains()`, `startswith()`, `endswith()`, `lower()`
- OpenTofu expressions, local values, input variable validation, and `count`
- AWS provider `aws_cloudwatch_metric_alarm`
- AWS EC2, CloudWatch, S3, and IAM naming constraints

## Sources Consulted
- OpenTofu official documentation for `strcontains()`: https://opentofu.org/docs/language/functions/strcontains/
- OpenTofu official documentation for `startswith()`: https://opentofu.org/docs/language/functions/startswith/
- OpenTofu official documentation for `endswith()`: https://opentofu.org/docs/language/functions/endswith/
- OpenTofu official documentation for `lower()`: https://opentofu.org/docs/language/functions/lower/
- OpenTofu official documentation for `lookup()`: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu official documentation for `regex()` and `can()`: https://opentofu.org/docs/language/functions/regex/ and https://opentofu.org/docs/language/functions/can/
- OpenTofu official documentation for input variable validation and custom conditions: https://opentofu.org/docs/language/values/variables/ and https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu official documentation for the `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- HashiCorp AWS provider documentation source for `aws_cloudwatch_metric_alarm`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS EC2 documentation for burstable performance instance families: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html
- AWS EC2 documentation for CloudWatch CPU credit metrics: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS EC2 compute optimized instance types: https://aws.amazon.com/ec2/instance-types/compute-optimized/
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS IAM CreateRole API reference for role name constraints: https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateRole.html

## Issues Found
1. **Burstable EC2 instance family check was incomplete**: The example described checking whether an instance type is burstable, but only checked `t2.` and `t3.`. AWS currently documents T4g, T3a, T3, and previous-generation T2 as burstable performance instance types. Updated the expression to also check `t3a.` and `t4g.`.
2. **Compute-optimized example was worded too broadly**: The local value checked only `c5.` and `c6i.`, while AWS lists many compute-optimized families. Updated the comment to describe this as a selected-family check instead of a complete compute-optimized classifier.
3. **CloudWatch alarm snippet omitted required AWS provider arguments**: The `aws_cloudwatch_metric_alarm` example omitted `evaluation_periods` and the standard metric fields required when `metric_query` is not used. Added `evaluation_periods`, `metric_name`, `namespace`, `period`, and `statistic` for the `CPUCreditBalance` metric.

## Review Notes
- The core `strcontains()` syntax and behavior are correct. OpenTofu documents `strcontains(string, substr)` as checking whether a substring is within another string, and the examples align with that behavior.
- The variable validation examples are technically valid and use `validation` blocks with boolean `condition` expressions and `error_message` values.
- The regex comparison using `can(regex(pattern, s))` is valid, though OpenTofu also documents `regexall()` plus a length check as another pattern for testing regex matches.
- Local execution was not performed because neither `tofu` nor `terraform` is installed in this workspace; validation was performed against official documentation.
