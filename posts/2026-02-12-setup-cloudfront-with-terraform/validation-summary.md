# Validation Summary: How to Set Up CloudFront with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFront
- Amazon S3
- AWS Certificate Manager
- Terraform
- AWS CLI

## Sources Consulted
- HashiCorp Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- HashiCorp Terraform AWS provider documentation for `aws_cloudfront_origin_access_control`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- HashiCorp Terraform AWS provider documentation for `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- AWS CloudFront documentation on restricting access to an Amazon S3 origin with OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront documentation on SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront documentation on managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront documentation on serving compressed files: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
- AWS CLI documentation for `cloudfront create-invalidation`: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html

## Issues Found
- The main CloudFront distribution example used Terraform's deprecated `forwarded_values` block. I replaced it with AWS's managed CachingOptimized cache policy ID, which is the current recommended approach and preserves the article's 24-hour default TTL claim.
- The ACM section said the Terraform snippet "validates" the certificate via DNS, but the code only requests the certificate and outputs DNS validation records. I changed the wording to say it requests the certificate and outputs the records needed for validation.
- The OAC section said OAC "replaced" OAI. I adjusted this to say OAC is the newer AWS-recommended approach over OAI, which is more precise.
- The compression gotcha said `compress = true` enables gzip/br compression. AWS documentation requires cache policies for Brotli support, so I updated the wording to distinguish automatic compression from Brotli enablement.

## Review Notes
Terraform and AWS CLI were not installed locally, so command and schema validation was performed against official HashiCorp and AWS documentation rather than local CLI output.
