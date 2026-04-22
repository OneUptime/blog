# Validation Summary: How to Set Up S3 Static Website Hosting with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS S3
- Amazon CloudFront
- CloudFront Origin Access Control
- AWS Route 53
- AWS Certificate Manager
- AWS CLI
- Terraform AWS provider HCL resources

## Sources Consulted
- AWS CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront Developer Guide: Use various origins with CloudFront distributions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html
- AWS CloudFront Developer Guide: Origin settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- AWS S3 User Guide: Website endpoints - https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html
- AWS S3 API Reference: GetObject - https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- AWS CloudFront Developer Guide: Create a custom error page for specific HTTP status codes - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/creating-custom-error-pages.html
- AWS Route 53 Developer Guide: Routing traffic to an Amazon CloudFront distribution by using your domain name - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html
- AWS CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CLI Command Reference: cloudfront create-invalidation - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- AWS CLI Command Reference: s3 sync - https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- OpenTofu CLI documentation - https://opentofu.org/docs/cli/commands/
- Terraform AWS provider registry documentation for aws_cloudfront_distribution, aws_cloudfront_origin_access_control, aws_s3_bucket_public_access_block, and aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The original post mixed S3 website endpoint configuration with CloudFront Origin Access Control. OAC applies to S3 bucket origins, while S3 website endpoints are custom origins, support only publicly readable content, and do not support HTTPS to the origin. Removed the `aws_s3_bucket_website_configuration` block and updated the text to describe a private S3 origin served through CloudFront.
- The S3 Public Access Block example set `block_public_policy` and `restrict_public_buckets` to `false` and stated this was required for OAC. That is not required for the scoped CloudFront service-principal policy. Changed all four public access block settings to `true`.
- The SPA fallback handled only 404 responses. With a private S3 origin that grants only `s3:GetObject`, S3 can return 403 for missing objects when `s3:ListBucket` is not granted. Added a CloudFront custom error response for 403 that returns `/index.html` with status 200.
- The prerequisites omitted Route 53 permissions even though the tutorial creates Route 53 records. Added Route 53 to the AWS permissions prerequisite.
- The ACM prerequisite did not specify the required region for CloudFront viewer certificates. Updated it to require an ACM certificate in `us-east-1`.
- The CloudFront distribution enabled IPv6, but the DNS example only created an A alias record. Added an AAAA alias record for IPv6 traffic.

## Review Notes
The HCL and AWS CLI examples were reviewed against official documentation, but local CLI validation was not possible because `tofu`, `terraform`, and `aws` were not installed in the workspace.
