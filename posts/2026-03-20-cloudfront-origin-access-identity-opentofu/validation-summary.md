# Validation Summary: How to Set Up CloudFront Origin Access Identity with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CloudFront
- AWS S3
- CloudFront Origin Access Identity (OAI)
- CloudFront cache policies

## Sources Consulted
- AWS CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront Developer Guide: Origin settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- AWS CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- OpenTofu CLI docs: Basic CLI Features - https://opentofu.org/docs/cli/commands/
- OpenTofu CLI docs: Command: init - https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu CLI docs: Command: plan - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: Command: apply - https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform AWS Provider docs (official source): `aws_cloudfront_origin_access_identity` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_access_identity.html.markdown
- Terraform AWS Provider docs (official source): `aws_cloudfront_distribution` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- Terraform AWS Provider docs (official source): `aws_cloudfront_cache_policy` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_cache_policy.html.markdown
- Terraform AWS Provider docs (official source): `aws_s3_bucket_public_access_block` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_public_access_block.html.markdown

## Issues Found
- The `default_cache_behavior` example used the legacy `forwarded_values` block, which the current AWS provider documentation marks as deprecated. I replaced it with a current `aws_cloudfront_cache_policy` resource and `cache_policy_id` reference while preserving the intended cache behavior.
- The note about when to use OAI was too vague and implied an older-configuration-only use case. I updated it to match AWS's current guidance that OAI is legacy and lacks support for newer S3 Regions, SSE-KMS, and dynamic `PUT`, `POST`, and `DELETE` requests to S3.

## Review Notes
- The post is technically relevant and salvageable after the corrections above.
- AWS currently recommends Origin Access Control (OAC) for new CloudFront distributions; keeping this OAI-focused guide is reasonable as a legacy/compatibility reference.
- The local `tofu` binary was not available in the review environment, so command validation relied on the official OpenTofu CLI documentation rather than local `--help` output.
