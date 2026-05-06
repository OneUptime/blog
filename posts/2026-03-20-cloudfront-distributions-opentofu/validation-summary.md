# Validation Summary: How to Create CloudFront Distributions with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS CloudFront
- Amazon S3
- AWS Certificate Manager (ACM)
- AWS WAF
- CloudFront Functions

## Sources Consulted
- HashiCorp AWS provider docs for `aws_cloudfront_distribution`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- HashiCorp AWS provider docs for `aws_cloudfront_cache_policy` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/cloudfront_cache_policy.html.markdown
- HashiCorp AWS provider docs for `aws_cloudfront_origin_request_policy` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/cloudfront_origin_request_policy.html.markdown
- HashiCorp AWS provider docs for `aws_cloudfront_function`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_function.html.markdown
- AWS CloudFront docs, "Restrict access to an Amazon S3 origin": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront docs, "Requirements for using SSL/TLS certificates with CloudFront": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront docs, "Use managed cache policies": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront docs, "Use managed origin request policies": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- AWS CloudFront docs, "JavaScript runtime 2.0 features for CloudFront Functions": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html
- AWS CDK CloudFront `PriceClass` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.PriceClass.html

## Issues Found
- The provider-region comment said CloudFront resources must be in `us-east-1`. That is inaccurate. I corrected it to state that the ACM certificate for CloudFront aliases must be in `us-east-1`, which matches AWS certificate requirements for viewer-facing CloudFront HTTPS.
- The snippet referenced `data.aws_cloudfront_cache_policy.managed_caching`, `data.aws_cloudfront_cache_policy.managed_disabled`, and `data.aws_cloudfront_origin_request_policy.all_viewer` without defining those data sources. I added the missing AWS-managed policy data sources using the documented managed-policy names so the example is internally consistent.
- The `/api/*` ordered cache behavior targeted `APIOrigin`, but no `origin` block for `APIOrigin` existed. I added the missing custom origin configuration so the distribution example is valid.
- The `PriceClass_100` comment omitted Israel. I corrected the comment to match AWS's documented coverage for `PriceClass_100`.
- The best-practices bullet about managed cache policies was too broad. AWS documents that some managed policies, such as `CachingOptimized`, enforce a minimum TTL even when origin headers include `no-cache`, `no-store`, or `private`. I revised the wording to reflect that managed policies should be chosen based on workload and cache-header behavior.

## Review Notes
- The CloudFront Function example is technically valid with `cloudfront-js-2.0`; the runtime supports `String.prototype.includes()`.
- The post mentions WAF integration in the description, but WAF is only referenced as a best practice, not shown in the code example.
- The provider version pin `~> 5.30` is older than the current AWS provider release, but the resources and arguments used in the post remain valid for the documented example.
