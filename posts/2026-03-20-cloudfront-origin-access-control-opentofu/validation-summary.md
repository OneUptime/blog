# Validation Summary: How to Set Up CloudFront Origin Access Control with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS CloudFront
- Amazon S3
- AWS KMS
- HCL
- Terraform AWS provider / OpenTofu AWS provider compatibility

## Sources Consulted
- AWS CloudFront Developer Guide, "Restrict access to an Amazon S3 origin": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront API Reference, `OriginAccessControlConfig`: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_OriginAccessControlConfig.html
- AWS CloudFront API Reference, `Origin`: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_Origin.html
- AWS CloudFront Developer Guide, "Use various origins with CloudFront distributions": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html
- Terraform AWS provider docs, `aws_cloudfront_origin_access_control`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_access_control.html.markdown
- Terraform AWS provider docs, `aws_cloudfront_distribution`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- OpenTofu CLI docs, `tofu init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs, `tofu apply`: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
1. Updated the introduction to reflect current AWS-documented OAC capabilities more precisely. The original text used an outdated/incomplete description of supported origin types; current AWS documentation describes OAC support for S3, MediaStore, MediaPackage v2, and Lambda function URL origins, while the S3-specific guidance emphasizes SSE-KMS support and dynamic requests.
2. Added `kms:Encrypt` to the KMS key policy example. AWS's official SSE-KMS example for CloudFront OAC includes `kms:Decrypt`, `kms:Encrypt`, and `kms:GenerateDataKey*`; the post omitted `kms:Encrypt`.

## Review Notes
- The CloudFront distribution example correctly uses `origin_access_control_id` without an `s3_origin_config` block; this matches the current Terraform AWS provider example for an S3 origin with OAC.
- The post correctly uses `bucket_regional_domain_name`, which is appropriate for an S3 bucket origin. S3 static website endpoints must be configured as custom origins and cannot use OAC.
- AWS documentation notes that S3 bucket origins using OAC require compatible S3 Object Ownership settings. New S3 buckets default to `Bucket owner enforced`, so the example remains workable as written.
