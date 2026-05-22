# Validation Summary: How to Use Dynamic Blocks for S3 Bucket Lifecycle Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- AWS provider for Terraform
- Amazon S3 lifecycle configuration
- S3 storage classes and lifecycle transitions

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Amazon S3 lifecycle configuration elements documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 lifecycle transition constraints documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html

## Issues Found
- The main dynamic lifecycle rule example generated both `prefix` and `tag` entries inside the same `filter` block. The AWS provider requires a lifecycle `filter` block to be empty or to specify exactly one of `prefix`, `tag`, `and`, `object_size_greater_than`, or `object_size_less_than`. Updated the example to use `prefix` directly for prefix-only rules and an `and` block when tags are present.
- The filter-handling example used a null-sensitive tag check. Updated it to use `length(coalesce(rule.value.tags, {}))` so optional `tags` values are handled safely.
- The production backup example transitioned objects to `STANDARD_IA` after 7 days. Amazon S3 requires objects to be stored for at least 30 days before transitioning to Standard-IA or One Zone-IA. Updated that transition to 30 days and the following Glacier transition to 90 days.
- The validation example did not validate the `status` field even though the AWS provider only accepts `Enabled` or `Disabled`. Added a validation rule for those values.
- The validation example allowed noncurrent-version actions in the variable type but did not count them as valid lifecycle actions. Updated the validation condition and error message to include noncurrent-version expiration and transition rules.

## Review Notes
The post uses current standalone `aws_s3_bucket_lifecycle_configuration` examples rather than the deprecated `lifecycle_rule` argument on `aws_s3_bucket`. The examples do not discuss the current default behavior that prevents objects smaller than 128 KB from transitioning to any storage class unless overridden with object-size filters or provider options; this is a useful future caveat but not a correctness issue for the shown Terraform syntax.
