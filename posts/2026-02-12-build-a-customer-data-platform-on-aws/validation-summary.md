# Validation Summary: How to Build a Customer Data Platform on AWS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS Lambda
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- Amazon DynamoDB
- Amazon S3
- AWS Glue
- Amazon Redshift Serverless
- Amazon QuickSight
- Amazon API Gateway
- AWS SDK for JavaScript v3
- Node.js
- PySpark

## Sources Consulted
- AWS Kinesis Data Streams PutRecords API Reference: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- AWS Lambda Kinesis event source documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS SDK for JavaScript v3 DynamoDB document client documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- DynamoDB update expression documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- Amazon Data Firehose rename announcement: https://aws.amazon.com/about-aws/whats-new/2024/02/amazon-data-firehose-formerly-kinesis-data-firehose/
- Amazon Data Firehose documentation: https://docs.aws.amazon.com/firehose/
- AWS Glue CSV format documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format-csv-home.html
- AWS Glue GlueContext documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html

## Issues Found
- The architecture diagram used the old "Kinesis Firehose" service name. Changed it to "Amazon Data Firehose" because AWS renamed Amazon Kinesis Data Firehose to Amazon Data Firehose in 2024.
- The ingestion example called an undefined `generateId()` helper. Replaced it with Node.js `crypto.randomUUID()`.
- The ingestion example sent all events in one `PutRecordsCommand` call and did not handle partial failures. Updated it to batch records in groups of 500 and throw when `FailedRecordCount` is non-zero, matching the Kinesis `PutRecords` API constraints.
- The ingestion comment implied ordered processing from `PutRecords`. Updated the wording because `PutRecords` does not guarantee record ordering; the partition key maps records for the same identity to the same shard, but strict ordering needs a different write strategy.
- The DynamoDB profile update example could pass `undefined` expression values for optional page or email fields. Updated the `page_view` and `signup` cases to include those attributes only when values are present.

## Review Notes
- JavaScript code fences were syntax-checked with Node.js after edits.
- The linked OneUptime compliance article returned HTTP 200.
- The snippets remain illustrative and omit setup details such as imports for DynamoDB commands, IAM permissions, table/index definitions, retry/backoff policy, and consent enforcement logic.
