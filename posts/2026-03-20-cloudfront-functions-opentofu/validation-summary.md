# Validation Summary: How to Create CloudFront Functions with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS CloudFront
- CloudFront Functions
- AWS provider for OpenTofu/Terraform
- JavaScript

## Sources Consulted
- AWS CloudFront Functions overview: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html
- AWS CloudFront Functions event structure: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- AWS restrictions on all edge functions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-function-restrictions-all.html
- AWS CloudFront JavaScript runtime 2.0: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html
- AWS managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS provider docs for `aws_cloudfront_function`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_function.html.markdown
- AWS provider docs for `aws_cloudfront_distribution`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS provider docs for `aws_cloudfront_cache_policy` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/cloudfront_cache_policy.html.markdown
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The distribution example used `forwarded_values`, which the current AWS provider documentation marks as deprecated. I replaced it with an `aws_cloudfront_cache_policy` data source lookup and `cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id`.
- The security headers example claimed it added headers to "all responses", but AWS does not invoke viewer-response edge functions when the origin returns HTTP 400 or higher. I changed the wording to describe viewer-response events instead of all responses.

## Review Notes
- The local environment did not have a `tofu` binary installed, so CLI command validation was done against the current OpenTofu documentation rather than local `--help` output.
- The JavaScript example uses `String.prototype.includes()` and `String.prototype.endsWith()`, both of which are supported in CloudFront JavaScript runtime 2.0.
