# Validation Summary: How to Use CloudFront Origin Access Control (OAC) for S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- CloudFront Origin Access Control (OAC)
- CloudFront Origin Access Identity (OAI)
- Amazon S3
- AWS KMS / SSE-KMS
- AWS CLI
- IAM resource policies

## Sources Consulted
- AWS CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFront Developer Guide: Use various origins with CloudFront distributions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html
- AWS CloudFront API Reference: DistributionConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DistributionConfig.html
- AWS CloudFront API Reference: DefaultCacheBehavior - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DefaultCacheBehavior.html
- AWS CloudFront API Reference: AllowedMethods - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_AllowedMethods.html
- AWS CloudFront API Reference: S3OriginConfig - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_S3OriginConfig.html
- AWS CLI Command Reference: create-origin-access-control - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-origin-access-control.html
- AWS CLI Command Reference: create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- GitHub author profile link - https://github.com/nawazdhandala

## Issues Found
- The CloudFront distribution JSON used array values for `AllowedMethods` and `CachedMethods`. The CloudFront API and AWS CLI expect `AllowedMethods` to be a structure with `Quantity`, `Items`, and optional nested `CachedMethods`, so the example was updated to the correct shape.
- The OAI limitation list said OAI did not support S3 buckets in different AWS accounts. AWS documentation lists the relevant OAI limitations as SSE-KMS, all/newer S3 Regions, dynamic S3 requests, and scenarios like S3 Object Lambda requiring OAC. The cross-account limitation claim was replaced with documented Region and dynamic-request limitations.
- The existing-distribution update instructions did not make clear that the `ETag` from `get-distribution-config` is used separately from the edited `DistributionConfig`. The comments were clarified so the `update-distribution --distribution-config ... --if-match ...` command is consistent.
- The SSE-KMS section said to add KMS decrypt permission to the bucket policy. KMS permissions belong in the KMS key policy; the bucket policy only grants S3 object access. The wording was corrected.
- The public access block section claimed it alone ensures the only access path is CloudFront. The wording was narrowed to anonymous/public access with the preceding bucket policy in place.

## Review Notes
The AWS CLI binary was not available in the local environment, so command verification was performed against official AWS CLI and CloudFront documentation. The post remains technically relevant and current for CloudFront OAC with S3 as of 2026-06-03.
