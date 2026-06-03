# Validation Summary: How to Create AWS Glue Crawlers for Data Cataloging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Glue Crawlers
- AWS Glue Data Catalog
- Amazon S3
- Amazon SQS event notifications for crawler event mode
- Amazon EventBridge monitoring
- AWS IAM
- boto3 for Python
- Amazon Athena and Redshift Spectrum integrations

## Sources Consulted
- AWS Glue crawler API documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-crawling.html
- boto3 `create_crawler` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/glue/client/create_crawler.html
- boto3 `create_classifier` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/glue/client/create_classifier.html
- AWS Glue incremental crawls documentation: https://docs.aws.amazon.com/glue/latest/dg/incremental-crawls.html
- AWS Glue S3 event notifications for crawlers documentation: https://docs.aws.amazon.com/glue/latest/dg/crawler-s3-event-notifications.html
- AWS Glue crawler grouping policy documentation: https://docs.aws.amazon.com/glue/latest/dg/crawler-grouping-policy.html
- AWS Glue schema-change configuration documentation: https://docs.aws.amazon.com/glue/latest/dg/crawler-schema-changes-prevent.html
- AWS Glue EventBridge events documentation: https://docs.aws.amazon.com/glue/latest/dg/automating-awsglue-with-cloudwatch-events.html

## Issues Found
- The running-crawler example read `TablesCreated`, `TablesUpdated`, and `TablesDeleted` from `LastCrawl`. AWS documents `LastCrawl` as status/error/log metadata only; table counts are exposed in crawler metrics. Updated the example to call `get_crawler_metrics`.
- `CRAWL_EVENT_MODE` was described as being triggered by S3 events and useful for real-time updates. AWS documents event-mode crawlers as consuming S3 events from SQS during manually started or scheduled crawler runs. Updated the description and scheduling guidance.
- `CRAWL_NEW_FOLDERS_ONLY` was described too broadly as scanning new prefixes for append-only data. AWS documents it as adding newly introduced partitions after an initial full crawl, with no detection of modifications or deletions of existing partitions. Added the stable-schema/new-partitions caveat.
- The recrawl-policy section omitted the AWS restriction that `CRAWL_NEW_FOLDERS_ONLY` forces schema update and delete behavior to `LOG`. Added that note.
- The monitoring section described `get_crawler_metrics` as CloudWatch metrics and suggested CloudWatch alarms for crawler failures. Updated it to describe Glue API crawler metrics and EventBridge rules for crawler state/failure events.
- The table-grouping caveat implied the setting is always absent by default. Updated the wording to avoid overstatement while preserving the practical warning.

## Review Notes
The IAM example is intentionally broad with `glue:*`; it is technically valid for a tutorial but should be narrowed in production. Event-based crawling also requires S3 event notification and SQS configuration that the post mentions only at a high level.
