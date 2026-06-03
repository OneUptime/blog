# Validation Summary: How to Build an ETL Pipeline with AWS Glue and Step Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Glue
- AWS Glue Data Catalog and crawlers
- AWS Step Functions
- Amazon S3
- Amazon Athena
- Amazon EventBridge
- Amazon CloudWatch
- Amazon SNS
- AWS CDK for TypeScript
- AWS SDK for JavaScript v3
- PySpark and AWS Glue DynamicFrames

## Sources Consulted
- AWS Step Functions optimized AWS Glue integration: https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html
- AWS Step Functions AWS SDK service integrations: https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html
- AWS Glue StartCrawler API: https://docs.aws.amazon.com/glue/latest/webapi/API_StartCrawler.html
- AWS Glue crawler API and crawler states: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-crawling.html
- AWS Glue GlueContext API: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html
- AWS Glue partitioned ETL output: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-partitions.html
- AWS CDK CfnJob documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnJob.html
- AWS CDK CfnCrawler documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnCrawler.html
- Amazon Athena StartQueryExecution API: https://docs.aws.amazon.com/athena/latest/APIReference/API_StartQueryExecution.html
- Amazon Athena GetQueryExecution API: https://docs.aws.amazon.com/athena/latest/APIReference/API_GetQueryExecution.html
- Amazon Athena GetQueryResults API: https://docs.aws.amazon.com/athena/latest/APIReference/API_GetQueryResults.html
- AWS SDK for JavaScript v3 Athena commands: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/athena/
- Referenced OneUptime article: https://oneuptime.com/blog/post/2026-02-12-build-logging-and-monitoring-stack-on-aws/view

## Issues Found
- The S3 bucket examples used fixed names such as `my-datalake-raw`, which can fail because S3 bucket names are globally unique. Removed the fixed names so CDK generates deployable bucket names while preserving later `bucket.bucketName` references.
- The Glue job snippet referenced `scriptsBucket` without defining it. Added a `GlueScriptsBucket` bucket in the data lake CDK snippet.
- The Step Functions workflow used `arn:aws:states:::glue:startCrawler.sync`, but AWS documents the optimized `.sync` Glue integration for `StartJobRun`, not `StartCrawler`. Replaced crawler steps with AWS SDK integrations for `startCrawler` and `getCrawler`, plus wait/choice polling.
- The workflow referenced crawler names that were not set in the CDK crawler resources. Added explicit `raw-data-crawler` and `processed-data-crawler` names and added the missing processed crawler definition.
- The data quality Lambda imported Athena commands but did not define `runAthenaQuery`, so the example would fail at runtime. Added a complete Athena helper using `StartQueryExecution`, `GetQueryExecution`, and `GetQueryResults`.
- The duplicate-check Athena SQL concatenated values without safely casting `user_id`. Changed it to use `CONCAT` with explicit casts.
- The monitoring snippet used `cloudwatch` without importing it. Added the missing CDK CloudWatch import.

## Review Notes
The snippets are still presented as blog-sized examples rather than a complete deployable CDK stack. In a full production implementation, the Lambda should set `ATHENA_OUTPUT` to an S3 query-results location, IAM policies should be scoped for Athena/S3/Glue/SNS/Step Functions access, and the Step Functions state machine should be generated from CDK or validated with deployment tooling.
