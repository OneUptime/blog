# Validation Summary: How to Use the md5 Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`md5`, `substr`, `file`, `templatefile` functions; `tofu console`)
- Terraform HCL
- Terraform AWS provider (`aws_instance`, `aws_s3_bucket`, `aws_lambda_function`, `aws_cloudfront_distribution`)
- Terraform `archive` provider (`archive_file` data source)
- Terraform `null` provider (`null_resource` with `local-exec`)
- AWS CLI (`aws cloudfront create-invalidation`)

## Sources Consulted
- OpenTofu `md5` function: https://opentofu.org/docs/language/functions/md5/
- OpenTofu `substr` function: https://opentofu.org/docs/language/functions/substr/
- OpenTofu `templatefile` function: https://opentofu.org/docs/language/functions/templatefile/
- Terraform AWS provider — `aws_instance` (`user_data_replace_on_change`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider — CloudFront resources index: https://registry.terraform.io/providers/hashicorp/aws/latest/docs (no `aws_cloudfront_invalidation` resource exists)
- Terraform AWS provider issue tracking native invalidation support: https://github.com/hashicorp/terraform-provider-aws/issues/13298
- Terraform `archive_file` data source (`output_base64sha256`, `output_path`): https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- Verified MD5 outputs locally with `md5sum` (hello world, empty string, hello, myproject)

## Issues Found

1. **Non-existent resource `aws_cloudfront_invalidation`.** The "Cache Invalidation" example used `resource "aws_cloudfront_invalidation"`, which is not a real resource in the Terraform AWS provider — invalidations have historically had no first-class managed resource. Replaced the example with the conventional pattern: a `null_resource` whose `triggers` include the MD5 of the config content, calling `aws cloudfront create-invalidation` via a `local-exec` provisioner. This preserves the section's intent (use MD5 to drive invalidation on content change) while using a configuration that actually applies.

2. **Incorrect `substr(md5("myproject"), 0, 8)` output.** The `tofu console` example claimed the result was `"c55e0f9e"`. The actual MD5 of `"myproject"` is `4da39212894ad06eb7c95810f8a2a6b0`, so the first 8 characters are `"4da39212"`. Updated the example output accordingly.

## Review Notes
- Other MD5 outputs in the post are correct: `md5("hello world")` = `5eb63bbbe01eeed093cb22bb8f5acdc3`, `md5("")` = `d41d8cd98f00b204e9800998ecf8427e`, and `md5("hello")` = `5d41402abc4b2a76b9719d911017c592`.
- `aws_instance.user_data_replace_on_change` is valid (added in AWS provider v4.0, Feb 2022).
- `archive_file.output_base64sha256` is valid and is the recommended value for `aws_lambda_function.source_code_hash`.
- The `nodejs18.x` Lambda runtime used in the example is deprecated as of 2025; readers writing new code should consider `nodejs20.x` or `nodejs22.x`. Left as-is since it does not affect the MD5 lesson and the post is not focused on Lambda runtimes.
- Terraform 1.14+ introduced an `aws_cloudfront_create_invalidation` action that could also satisfy this use case for users on a recent enough Terraform; the `null_resource` pattern was chosen because it works on both Terraform and OpenTofu without relying on the actions feature.
