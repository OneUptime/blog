# Validation Summary: How to Use for_each with Maps to Create Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources (`aws_s3_bucket`, `aws_launch_template`, `aws_security_group`, `aws_subnet`)
- Infrastructure as Code

## Sources Consulted
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `zipmap` function docs: https://opentofu.org/docs/language/functions/zipmap/
- OpenTofu output values docs: https://opentofu.org/docs/language/values/outputs/
- AWS provider `aws_s3_bucket` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider `aws_launch_template` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider `aws_security_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_subnet` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet

## Issues Found
- The "Adding/Removing Map Entries Safely" snippet reused the `s3_buckets` variable name from the earlier example but omitted the `lifecycle` attribute from each object value. That conflicted with the earlier declared type of `map(object({ versioning = bool, lifecycle = bool }))`. I updated the example entries to include both required attributes so the example remains type-consistent and valid.

## Review Notes
- The post's explanation of `for_each`, `each.key`, `each.value`, map-based addressing, and dynamic map construction with `zipmap` matches current OpenTofu documentation.
- The `aws_security_group` example is syntactically valid, but the current AWS provider documentation recommends dedicated `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources instead of inline rules as the preferred pattern.
- The `aws_s3_bucket` example uses literal bucket names for illustration. In real AWS deployments, S3 bucket names must be globally unique.
