# Validation Summary: How to Automatically Delete Old Objects with S3 Lifecycle Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Lifecycle rules
- AWS CLI
- S3 storage classes
- S3 Versioning
- S3 multipart uploads
- S3 Lifecycle event notifications

## Sources Consulted
- AWS CLI Command Reference: put-bucket-lifecycle-configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI Command Reference: s3 cp: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI Command Reference: put-object and put-object-tagging: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html and https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-tagging.html
- Amazon S3 User Guide: Lifecycle configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 User Guide: Adding filters to Lifecycle rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-filters.html
- Amazon S3 User Guide: How Amazon S3 handles conflicts in lifecycle configurations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-conflicts.html
- Amazon S3 User Guide: Transitioning objects using S3 Lifecycle: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 User Guide: Configuring S3 Lifecycle event notifications: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configure-notification.html
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The upload example for tag-based expiration used `aws s3 cp --tagging`, but the high-level `aws s3 cp` command does not support a `--tagging` option. Changed it to `aws s3api put-object` with `--tagging`, which is supported for setting tags during upload.
- The backup lifecycle example transitioned objects to `STANDARD_IA` after 14 days, but S3 does not support lifecycle transition to Standard-IA within the first 30 days. Changed the transition to 30 days.
- The monitoring section suggested looking for `requestParameters.lifecycle=true` in CloudTrail. Replaced that with the documented S3 Lifecycle event notification types, `s3:LifecycleExpiration:Delete` and `s3:LifecycleExpiration:DeleteMarkerCreated`.
- The "Transitioning tiny objects to IA" note described only minimum billing behavior. Updated it to reflect the current default behavior that new lifecycle configurations do not transition objects smaller than 128 KB by default.
- The overlapping-rules explanation said S3 applies the "most conservative" action. Updated it to match AWS documentation: S3 generally optimizes for lower cost, shorter expirations win, lower-cost transitions win, and permanent deletion takes precedence over transition.
- Added a caveat that date-based lifecycle rules continue applying after the specified date until the rule is disabled or removed.
- Added a caveat that the cost example depends on AWS Region and current S3 pricing.

## Review Notes
All lifecycle configuration snippets parse as valid JSON. AWS CLI is not installed in this workspace, so command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
