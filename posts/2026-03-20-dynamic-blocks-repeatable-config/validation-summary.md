# Validation Summary: How to Use Dynamic Blocks for Repeatable Configuration in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform language / HCL
- AWS provider
- Amazon EC2 and EBS
- Amazon EC2 Auto Scaling
- Amazon S3
- Amazon CloudFront

## Sources Consulted
- OpenTofu `dynamic` blocks documentation: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- Terraform `for` expressions and element ordering: https://developer.hashicorp.com/terraform/language/expressions/for
- AWS provider `aws_security_group` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- AWS provider `aws_instance` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_autoscaling_group` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- AWS provider `aws_s3_bucket` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- AWS provider `aws_s3_bucket_lifecycle_configuration` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- AWS provider `aws_cloudfront_distribution` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown

## Issues Found
- The "Nested Dynamic Blocks" example did not actually use nested `dynamic` blocks, and it modeled listener rules as if they were nested inside `aws_lb_listener`. I replaced it with a valid nested example using `aws_cloudfront_distribution` with `origin_group` and nested `member` blocks, which matches the provider schema.
- The conditional S3 example used the deprecated inline `lifecycle_rule` block on `aws_s3_bucket`. I replaced it with the current `aws_s3_bucket_lifecycle_configuration` resource and a dynamic `rule` block, including the required `id` and `status` arguments.
- The best-practice guidance about iteration order was inaccurate. I corrected it to use lists when block order matters and maps when stable keys are needed for identification.
- The `toset()` tip could mislead readers because sets are unordered. I clarified that it is appropriate for unique values only when order does not matter.
- The conclusion referenced "listener rules" based on the incorrect nested example. I updated it to refer to nested block structures more generally.

## Review Notes
- The inline `ingress` example is syntactically valid, but current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for production use.
- The `ebs_block_device` example is valid, but the AWS provider documentation notes drift-detection limitations and recommends `aws_ebs_volume` plus `aws_volume_attachment` when block devices need to be managed independently.
- OpenTofu documentation cautions against overusing `dynamic` blocks. They are most useful when generating repeatable nested blocks in reusable modules, not as a default replacement for literal blocks.
