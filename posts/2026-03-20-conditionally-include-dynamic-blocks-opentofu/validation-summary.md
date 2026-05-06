# Validation Summary: How to Conditionally Include Dynamic Blocks in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- Amazon S3
- Application Load Balancer
- AWS Lambda

## Sources Consulted
- OpenTofu dynamic blocks documentation: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- OpenTofu lifecycle blocks documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- AWS provider documentation for `aws_s3_bucket_server_side_encryption_configuration`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- AWS provider documentation for `aws_lb_listener`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener.html.markdown
- AWS provider documentation for `aws_s3_bucket_lifecycle_configuration`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- AWS provider documentation for `aws_lambda_function`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown
- AWS Lambda runtime support matrix: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The S3 encryption example claimed the KMS block was only included when a key was provided, but the original condition only checked `enable_encryption`. I updated the `for_each` conditions so the KMS block is emitted only when `kms_key_id` is non-empty, with `AES256` as the fallback.
- The ALB example redirected HTTP traffic to HTTPS without actually creating an HTTPS listener. I added a conditional `aws_lb_listener "https"` resource with `count`, `certificate_arn`, and a valid `default_action` so the redirect target exists.
- The lifecycle section mixed up OpenTofu's `lifecycle` meta-argument with Amazon S3 lifecycle configuration and used mismatched variables (`prevent_destroy` vs. `enable_lifecycle`). I corrected the note, renamed the section, added the matching variables, and kept the example on the dedicated `aws_s3_bucket_lifecycle_configuration` resource.
- The Lambda example used `nodejs20.x`, which AWS deprecated on April 30, 2026, and referenced `enable_xray` without defining it. I updated the runtime to `nodejs24.x` and added the missing variable declaration.

## Review Notes
- OpenTofu's `dynamic` blocks can generate nested blocks, but they cannot generate meta-argument blocks such as `lifecycle`. For whole resources, `count`, `for_each`, or OpenTofu's newer `enabled` meta-argument are the appropriate tools.
- AWS still allows deprecated Lambda runtimes for a grace period. As of May 6, 2026, `nodejs20.x` is deprecated but not yet blocked for new function creation; AWS documents the create block date as August 31, 2026 and the update block date as September 30, 2026.
