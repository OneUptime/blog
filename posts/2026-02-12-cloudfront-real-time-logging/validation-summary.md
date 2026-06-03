# Validation Summary: How to Configure CloudFront Real-Time Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront real-time access logs
- CloudFront standard access logs
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- AWS Identity and Access Management (IAM)
- AWS Lambda
- Amazon CloudWatch metrics
- Amazon OpenSearch Service
- AWS CLI

## Sources Consulted
- Amazon CloudFront Developer Guide: Use real-time access logs - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html
- Amazon CloudFront Developer Guide: Standard logging reference - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html
- Amazon CloudFront Developer Guide: Configure standard logging (v2) - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html
- Amazon CloudFront Developer Guide: Configure standard logging (legacy) - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging-legacy-s3.html
- AWS CLI Command Reference: cloudfront create-realtime-log-config - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-realtime-log-config.html
- AWS CLI Command Reference: firehose create-delivery-stream - https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- Amazon Data Firehose Developer Guide: Understand data delivery - https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html

## Issues Found
- Corrected standard access log timing. The post said standard logs have a 5-30 minute delay; AWS documents that CloudFront usually delivers logs within an hour, with some entries delayed up to 24 hours.
- Corrected standard log pricing wording. Standard logging has no additional CloudFront enablement charge, but destination delivery, storage, and access costs can apply.
- Corrected the real-time log cost wording to include CloudFront real-time log charges in addition to Kinesis charges.
- Added the recommended `aws:SourceAccount` condition to the CloudFront IAM role trust policy to match AWS guidance and reduce confused deputy risk.
- Corrected the description of available real-time log fields. Real-time log records can include up to 40 selected fields from the available real-time log field list.
- Corrected the `cs-uri-stem` description for real-time logs because it includes the query string in real-time logs, unlike standard logs.
- Fixed the Lambda consumer parsing. CloudFront delivers selected real-time log fields in CloudFront's documented field order, not in the order passed to `--fields`; the sample now maps records by the delivered field order.
- Added the missing CloudWatch `publish_metrics` implementation so the Lambda sample is syntactically complete for the shown metric-publishing behavior.
- Corrected the OpenSearch option. Firehose OpenSearch delivery expects each record to be a single-line JSON object, so the example now calls out and configures a Lambda transform before indexing CloudFront's tab-delimited records.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI verification was done against the current official AWS CLI documentation instead of local `--help` output.
