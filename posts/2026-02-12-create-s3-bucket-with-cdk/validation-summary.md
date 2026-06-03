# Validation Summary: How to Create an S3 Bucket with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Amazon S3
- AWS KMS
- AWS IAM bucket policies
- S3 lifecycle rules
- S3 server access logging
- S3 CORS
- S3 event notifications
- TypeScript

## Sources Consulted
- AWS CDK API Reference: `aws-cdk-lib.aws_s3.Bucket` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
- AWS CDK API Reference: `aws-cdk-lib.aws_s3.BucketProps` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html
- AWS CDK API Reference: `aws-cdk-lib.aws_s3.BucketGrants` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketGrants.html
- AWS CDK Developer Guide: Permissions and grants - https://docs.aws.amazon.com/cdk/v2/guide/permissions.html
- AWS CDK API Reference: `aws-cdk-lib.aws_s3.EventType` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.EventType.html
- AWS CDK API Reference: `aws-cdk-lib.aws_kms.Alias` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms.Alias.html
- AWS CDK API Reference: `aws-cdk-lib.aws_kms.KeyProps` - https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_kms/KeyProps.html
- Amazon S3 User Guide: Default encryption FAQ - https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
- Amazon S3 User Guide: Access control and Block Public Access defaults - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-management.html
- Amazon S3 User Guide: Website endpoints - https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html
- Amazon CloudFront Developer Guide: Origin settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Issues Found
- The static website example mixed S3 website endpoint settings with a private CloudFront S3 origin pattern. S3 website endpoints are separate from CloudFront S3 bucket origins that support origin access control, and website endpoints do not support HTTPS. Updated the section to describe a private S3 bucket for static assets served through CloudFront and removed the `websiteIndexDocument` / `websiteErrorDocument` properties from that private-bucket example.
- The KMS key example used `alias: 'data-bucket-key'`. KMS alias names must start with `alias/`, so this was changed to `alias: 'alias/data-bucket-key'`.
- The grants example used the older `bucket.grantRead()`, `bucket.grantWrite()`, and related methods. These methods still exist, but current CDK guidance prefers grants helpers. Updated the examples to use `bucket.grants.read()`, `bucket.grants.write()`, `bucket.grants.readWrite()`, `bucket.grants.put()`, and `bucket.grants.delete()`.
- The bucket policy comment said "Deny unencrypted uploads", but the policy actually denies uploads that do not request SSE-KMS. Since S3 applies SSE-S3 by default to new objects, the comment was changed to "Deny uploads that don't request SSE-KMS".

## Review Notes
The remaining examples are illustrative CDK snippets and assume surrounding stack context plus declared Lambda, SQS, SNS, and principal variables. I did not run a full TypeScript compile because the post intentionally shows partial snippets rather than a complete CDK app.
