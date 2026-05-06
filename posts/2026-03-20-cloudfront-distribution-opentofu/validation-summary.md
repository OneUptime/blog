# Validation Summary: How to Create a CloudFront Distribution with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS CloudFront
- Amazon S3
- AWS provider for OpenTofu/Terraform
- Infrastructure as Code (HCL)

## Sources Consulted
- OpenTofu `init` command docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- AWS provider `aws_cloudfront_distribution` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS provider `aws_cloudfront_origin_access_control` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_access_control.html.markdown
- Amazon CloudFront OAC with S3 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Amazon CloudFront request/response behavior for S3 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorS3Origin.html
- Amazon CloudFront custom error response behavior: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages-procedure.html
- Amazon S3 `GetObject` API docs: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html

## Issues Found
- The SPA routing example only handled `404` errors. For a private S3 origin behind CloudFront OAC, Amazon S3 can return `403 Access Denied` for missing objects when the caller lacks `s3:ListBucket`. I added a matching `custom_error_response` block for `403` so SPA deep links work correctly with the OAC-based setup described in the post.
- The provider comment implied `us-east-1` was required for the AWS provider because CloudFront is global. I clarified the comment to state that `us-east-1` is the example region for origin resources, while ACM certificates used by CloudFront viewers must be requested or imported in `us-east-1`.

## Review Notes
- The CloudFront distribution, OAC resource, S3 bucket policy, and OpenTofu commands are otherwise technically consistent with the current AWS provider and AWS service documentation.
- The post correctly uses the S3 regional bucket endpoint as the CloudFront origin, which is the right pattern for OAC-backed S3 origins rather than S3 website endpoints.
- The review was documentation-based. The local review environment did not have the `tofu` CLI installed, so the commands were validated against official OpenTofu documentation rather than executed locally.
