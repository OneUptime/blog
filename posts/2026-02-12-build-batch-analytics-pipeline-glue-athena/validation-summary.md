# Validation Summary: How to Build a Batch Analytics Pipeline with Glue and Athena

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3
- AWS Glue crawlers
- AWS Glue Data Catalog
- AWS Glue PySpark ETL jobs
- AWS Glue job bookmarks
- Amazon Athena
- AWS IAM
- Amazon CloudWatch metrics and alarms
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: `aws glue create-crawler` - https://docs.aws.amazon.com/cli/latest/reference/glue/create-crawler.html
- AWS Glue Developer Guide: Scheduling incremental crawls for adding new partitions - https://docs.aws.amazon.com/glue/latest/dg/incremental-crawls.html
- AWS Glue Developer Guide: Managing partitions for ETL output - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-partitions.html
- AWS Glue Developer Guide: Tracking processed data using job bookmarks - https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html
- AWS Glue Developer Guide: Using job bookmarks - https://docs.aws.amazon.com/glue/latest/dg/programming-etl-connect-bookmarks.html
- AWS CLI Command Reference: `aws glue create-trigger` - https://docs.aws.amazon.com/cli/latest/reference/glue/create-trigger.html
- AWS CLI Command Reference: `aws glue create-job` - https://docs.aws.amazon.com/cli/latest/reference/glue/create-job.html
- AWS CLI Command Reference: `aws athena create-work-group` - https://docs.aws.amazon.com/cli/latest/reference/athena/create-work-group.html
- AWS CLI Command Reference: `aws athena start-query-execution` - https://docs.aws.amazon.com/cli/latest/reference/athena/start-query-execution.html
- Amazon Athena User Guide: CREATE VIEW - https://docs.aws.amazon.com/athena/latest/ug/create-view.html
- AWS Glue Developer Guide: Monitoring AWS Glue using Amazon CloudWatch metrics - https://docs.aws.amazon.com/glue/latest/dg/monitoring-awsglue-with-cloudwatch-metrics.html

## Issues Found
- The raw Glue crawler used `CRAWL_NEW_FOLDERS_ONLY` with `UpdateBehavior` set to `UPDATE_IN_DATABASE`. AWS documentation for incremental crawls says this mode forces update and delete behavior to `LOG`, so the crawler command was changed to `UpdateBehavior: LOG`.
- The CloudWatch alarm for `glue.driver.aggregate.numFailedTasks` omitted the documented `Type=count` dimension. The alarm dimensions were updated to include `Name=Type,Value=count` so the alarm targets the published Glue metric.

## Review Notes
- The local environment did not have the AWS CLI installed, so CLI syntax was validated against the official AWS CLI command reference and AWS service documentation.
- The example uses Glue version `4.0`, which remains valid, but newer Glue versions exist. Future revisions could consider whether to update the tutorial to Glue 5.x.
