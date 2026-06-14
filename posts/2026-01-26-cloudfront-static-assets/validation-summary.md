# Validation Summary: How to Configure CloudFront for Static Assets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- Amazon S3
- Origin Access Control (OAC)
- AWS CloudFormation
- AWS CLI
- CloudFront cache policies and cache behaviors
- CloudFront invalidations
- CloudFront standard and real-time logs
- Amazon CloudWatch
- GitHub Actions
- Python boto3

## Sources Consulted
- AWS CloudFormation: AWS::CloudFront::OriginAccessControl - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-originaccesscontrol.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CloudFormation: AWS::CloudFront::Distribution Origin - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-origin.html
- AWS CloudFormation: AWS::CloudFront::Distribution DefaultCacheBehavior - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-defaultcachebehavior.html
- AWS CloudFormation: AWS::CloudFront::Distribution CacheBehavior - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-cachebehavior.html
- AWS CloudFormation: AWS::CloudFront::ResponseHeadersPolicy CorsConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-responseheaderspolicy-corsconfig.html
- AWS CloudFormation: AWS::CloudFront::RealtimeLogConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-realtimelogconfig.html
- Amazon CloudFront Developer Guide: Use real-time access logs - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html
- Amazon CloudFront Developer Guide: Configure standard logging (legacy) - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging-legacy-s3.html
- Amazon CloudFront Developer Guide: Types of metrics for CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CLI Command Reference: aws cloudfront create-invalidation - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- Amazon CloudFront Developer Guide: What you need to know when invalidating paths - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html
- AWS CLI Command Reference: aws s3 cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The architecture diagram labeled the private S3 access component as Origin Access Identity even though the tutorial uses Origin Access Control. Changed the diagram label and arrows to OAC.
- The font upload comment claimed the command uploaded fonts with CORS headers, but the command only sets Cache-Control metadata. Changed the comment to describe long-lived cache headers.
- The bucket policy instruction appeared before the distribution ID was available, even though the OAC bucket policy condition depends on the CloudFront distribution ARN. Clarified that the policy is applied after a distribution ID exists.
- The CloudFormation response headers policy omitted the required `AccessControlAllowCredentials` property in `CorsConfig`. Added `AccessControlAllowCredentials: false`.
- The monitoring snippet described the distribution `Logging` block as real-time logs, but that block configures standard logs. Updated the comment and added the required `RealtimeLogConfigArn` attachment to the cache behavior for real-time logs.
- CloudFront standard logging to S3 has a current bucket ACL requirement for legacy standard logs. Added an inline note to use a separate log bucket with ACLs enabled.

## Review Notes
The GitHub Actions workflow uses long-lived cache headers for JS and CSS, which is best paired with content-hashed filenames to avoid broad invalidations on every deploy. The post already mentions content hashes in the cost optimization section.
