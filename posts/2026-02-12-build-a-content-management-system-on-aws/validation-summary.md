# Validation Summary: How to Build a Content Management System on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS
- Amazon DynamoDB
- Amazon S3
- Amazon CloudFront
- AWS Lambda
- Amazon API Gateway
- Amazon OpenSearch Service
- AWS SDK for JavaScript v3
- Node.js
- sharp

## Sources Consulted
- AWS SDK for JavaScript v3 DynamoDB document client documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- Amazon DynamoDB key condition expression documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- Amazon DynamoDB JavaScript programming guide for marshalling and unmarshalling: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- AWS Lambda S3 trigger JavaScript example: https://docs.aws.amazon.com/lambda/latest/dg/example_serverless_S3_Lambda_section.html
- AWS SDK for JavaScript v3 S3 presigned URL guidance: https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/
- Amazon API Gateway Lambda authorizer documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
- Amazon CloudFront metrics documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html

## Issues Found
- The version snapshot `PutCommand` set `SK` before spreading `contentItem`, then set `SK: undefined`. In JavaScript the later property wins, and AWS SDK for JavaScript v3 does not omit `undefined` values by default. Changed the object to spread `contentItem` first and then set `SK: 'VERSION#000001'`.
- The delivery API could return the mutable metadata record instead of the immutable published snapshot, which could expose draft edits after a published entry was updated. Updated the GSI3 sort-key pattern to include a snapshot state, wrote published snapshots with `STATE#published`, queried that prefix for lists, and selected the `PUBLISHED` item for slug delivery.
- The publish update changed `GSI3PK` without refreshing `GSI3SK`, which would leave status-list ordering stale. Updated the publish command to refresh `GSI3SK`.
- The S3 processing Lambda only read the first event record and did not convert `+` characters in URL-encoded S3 keys back to spaces. Updated the handler to iterate all records and decode keys using the AWS-documented JavaScript pattern.
- The DynamoDB Streams indexer parsed `fields` from `newImage.fields.S`, but stream records expose DynamoDB AttributeValue shapes and document-client maps are represented as `M`, not JSON strings. Added `@aws-sdk/util-dynamodb` `unmarshall()` and indexed from the unmarshalled item.

## Review Notes
- The snippets are illustrative and still assume helper functions and initialized clients such as `docClient`, `s3`, `validateFields`, `getContent`, `getContentBySlug`, `resolveReferences`, `opensearch`, and `stripHtml`.
- Slug uniqueness is checked before writing but is not enforced atomically in the shown code. A production implementation should use a conditional unique-slug item or a DynamoDB transaction.
