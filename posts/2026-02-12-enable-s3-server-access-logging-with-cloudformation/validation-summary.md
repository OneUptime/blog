# Validation Summary: How to Enable S3 Server Access Logging with CloudFormation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 server access logging
- AWS CloudFormation
- S3 bucket policies and service principals
- S3 lifecycle configuration and server-side encryption
- AWS CLI
- Amazon Athena and Hive RegexSerDe

## Sources Consulted
- AWS S3 User Guide: Enabling Amazon S3 server access logging: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html
- AWS S3 User Guide: Amazon S3 server access log format: https://docs.aws.amazon.com/AmazonS3/latest/userguide/LogFormat.html
- AWS S3 User Guide: Using Amazon S3 server access logs to identify requests: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-s3-access-logs-to-identify-requests.html
- AWS CloudFormation Template Reference: AWS::S3::Bucket LoggingConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-loggingconfiguration.html
- AWS CLI Command Reference: cloudformation deploy: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- OneUptime linked article: https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view

## Issues Found
- The introduction said S3 access logs record every request. AWS documents server access log delivery as best effort, so I changed this to say logs provide detailed records for requests.
- The description of source and target buckets omitted the current same-account and same-Region requirement for destination buckets. I added that constraint.
- The bucket policy explanation overstated the risk of omitting `aws:SourceArn` and `aws:SourceAccount`. AWS requires the destination bucket to be in the same account as the source bucket, so I changed the wording to describe the actual same-account exposure.
- The sample log entry and Athena table were missing current S3 server access log fields: `accesspointarn`, `aclrequired`, and the 2026 `sourceregion` field. I updated the sample line, the field summary, the table columns, and the RegexSerDe pattern to match AWS documentation.
- The CloudFormation troubleshooting note suggested using `DependsOn` broadly for access logging permission errors. That advice is not generally correct when the destination policy references the source bucket ARN, so I changed it to focus on stack execution role permissions, the destination bucket policy, and separate-stack deployment ordering.

## Review Notes
- The CloudFormation snippets use SSE-S3 (`AES256`) for the log bucket, which matches AWS guidance for server access log destinations. AWS warns that SSE-KMS default encryption is not sufficient for this use case.
- The AWS CLI is not installed in this workspace, so the deploy command was verified against the official AWS CLI command reference instead of local help output.
