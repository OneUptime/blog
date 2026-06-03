# Validation Summary: How to Export DynamoDB Data to S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB export to S3
- DynamoDB point-in-time recovery (PITR)
- Amazon S3
- AWS CLI
- AWS SDK for JavaScript v3
- DynamoDB Streams
- AWS Lambda
- Amazon Athena
- EventBridge

## Sources Consulted
- Amazon DynamoDB Developer Guide: DynamoDB data export to Amazon S3: how it works - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.HowItWorks.html
- Amazon DynamoDB Developer Guide: DynamoDB table export output format - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.Output.html
- AWS CLI Command Reference: dynamodb export-table-to-point-in-time - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/export-table-to-point-in-time.html
- AWS SDK for JavaScript v3 documentation: What's different between v2 and v3 - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-whats-different.html
- AWS Developer Tools Blog: Announcing end-of-support for AWS SDK for JavaScript v2 effective September 8, 2025 - https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS SDK for JavaScript v3 API Reference: S3 PutObjectCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/
- AWS SDK for JavaScript v3 API Reference: DynamoDB ScanCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/command/ScanCommand/
- Amazon DynamoDB Developer Guide: DynamoDB Streams and AWS Lambda triggers - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html

## Issues Found
- The post description mentioned AWS Data Pipeline, but the article does not cover Data Pipeline. Changed it to DynamoDB Streams to match the actual content.
- Several example DynamoDB ARNs used a 9-digit account ID. AWS account IDs are 12 digits, so the examples were updated to use `123456789012`.
- The Ion export comment described Ion as "more compact." DynamoDB exports Ion in Ion text format, so the comment was changed to "Amazon Ion text format."
- JavaScript examples used AWS SDK for JavaScript v2 APIs such as `aws-sdk`, `AWS.DynamoDB.DocumentClient()`, and `.promise()`. AWS SDK for JavaScript v2 reached end-of-support on September 8, 2025, so the snippets were updated to SDK v3 clients and commands.
- The custom S3 upload examples mixed SDK v2-style calls with SDK v3 imports. Updated uploads to use `S3Client` with `PutObjectCommand`.
- The DynamoDB Streams Lambda snippet used `AWS.DynamoDB.Converter.unmarshall` without importing `AWS` and relied on SDK v2. Updated it to SDK v3's `@aws-sdk/util-dynamodb` `unmarshall`.
- The Athena SQL used escaped `&lt;` and `&gt;` entities inside a code block, which would not be valid copied SQL. Replaced them with actual angle brackets.
- The Athena table location omitted the generated export ID directory under `AWSDynamoDB/`. Updated the location to include the export ID path shown earlier in the post.

## Review Notes
The CSV export example remains intentionally simple for a tutorial, but for very large tables it would need streaming or multipart output instead of building the entire CSV in memory.
