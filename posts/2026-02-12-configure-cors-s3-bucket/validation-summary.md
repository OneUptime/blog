# Validation Summary: How to Configure CORS on an S3 Bucket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 CORS configuration
- AWS CLI
- CloudFront
- Browser CORS and preflight requests
- Python boto3
- curl

## Sources Consulted
- AWS CLI Command Reference: put-bucket-cors: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html
- Amazon S3 User Guide: Elements of a CORS configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html
- Amazon S3 User Guide: Testing CORS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/testing-cors.html
- Amazon CloudFront Developer Guide: Use managed origin request policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- Amazon CloudFront Developer Guide: Cache content based on request headers: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html
- Amazon CloudFront Developer Guide: Understand cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html

## Issues Found
- The `cors-config.json` example in Step 2 used the S3 console's JSON array shape, but the AWS CLI `--cors-configuration file://...` input expects an object with a `CORSRules` property. I wrapped the example in `{"CORSRules": [...]}` so the documented CLI command works.
- The development section said `MaxAgeSeconds: 0` means every request triggers a preflight. That is too broad because only requests that require preflight send OPTIONS requests. I changed it to say the browser will not cache preflight responses, so each preflighted request sends a fresh OPTIONS request.
- The CloudFront section called CORS-S3Origin a managed cache policy. AWS documents it as a managed origin request policy. I corrected the terminology, clarified that it forwards `Origin`, `Access-Control-Request-Headers`, and `Access-Control-Request-Method`, and noted that cache policies still control cache-key variation.

## Review Notes
The remaining S3 CORS fields, allowed methods, preflight test command shape, and boto3 `put_bucket_cors` usage are consistent with AWS documentation. The post's sample OneUptime links were not changed because they are internal cross-links and are plausible for related posts.
