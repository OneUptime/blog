# Validation Summary: How to Set Up S3 with CloudFront for a CDN-Backed Static Site

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- Amazon CloudFront
- AWS Certificate Manager
- Route 53
- AWS CLI
- CloudFront Origin Access Control
- CloudFront cache policies and invalidations

## Sources Consulted
- AWS CLI Command Reference: cloudfront create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Amazon CloudFront Developer Guide: Serve compressed files - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
- Amazon CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS General Reference: Amazon S3 endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/s3.html
- AWS CloudFormation User Guide: Route 53 template snippets for CloudFront aliases - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-route53.html
- AWS CLI Command Reference: s3 sync - https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- Amazon CloudFront Developer Guide: Pay for file invalidation - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html

## Issues Found
- The post said `Compress: true` enables automatic gzip/brotli compression. AWS documentation states Brotli requires cache policies with Brotli enabled in addition to the CloudFront compression setting. Updated the text to tie Brotli support to the managed CachingOptimized policy used in the example.
- The deployment script sets HTML files to `Cache-Control: max-age=0,no-cache,no-store,must-revalidate`, but the managed CachingOptimized policy has a 1-second minimum TTL and CloudFront enforces that minimum even when origin headers say not to cache. Added a short note in the script comment.

## Review Notes
The main S3 REST-origin plus CloudFront OAC approach is current and matches AWS guidance. The ACM `us-east-1` requirement, OAC bucket policy shape, CloudFront hosted zone ID for Route 53 aliases, managed cache policy ID, HTTP/3 setting, invalidation pricing note, and AWS CLI options reviewed are technically correct. The local environment did not have the AWS CLI installed, so command verification was done against current official AWS CLI documentation rather than local `--help` output.
