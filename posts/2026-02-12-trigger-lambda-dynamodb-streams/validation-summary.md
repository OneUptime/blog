# Validation Summary: How to Trigger Lambda Functions from DynamoDB Streams

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon DynamoDB Streams
- AWS Lambda
- AWS CDK v2
- AWS SDK for JavaScript v3
- Amazon OpenSearch Service client
- Amazon CloudWatch metrics

## Sources Consulted
- AWS DynamoDB Developer Guide: Change data capture for DynamoDB Streams - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- AWS Lambda Developer Guide: Using AWS Lambda with Amazon DynamoDB - https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html
- AWS Lambda Developer Guide: Process DynamoDB records with Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-eventsourcemapping.html
- AWS Lambda Developer Guide: Configuring partial batch response with DynamoDB and Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-batchfailurereporting.html
- AWS Lambda Developer Guide: Retain discarded records for a DynamoDB event source in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html
- AWS Lambda API Reference: CreateEventSourceMapping - https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS CDK API Reference: StreamEventSourceProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.StreamEventSourceProps.html
- AWS CDK API Reference: Lambda Runtime - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Amazon DynamoDB Developer Guide: Programming Amazon DynamoDB with JavaScript - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html

## Issues Found
- The CDK example used `lambda.Runtime.NODEJS_20_X`. As of June 2, 2026, AWS lists Node.js 20 as a deprecated Lambda runtime. Changed the example to `lambda.Runtime.NODEJS_22_X`, which is currently supported and available in CDK.
- The introduction implied one Lambda invocation per changed row and always receiving old/new values. Lambda receives batches through an event source mapping, and old/new values depend on the stream view type. Reworded the sentence to describe batched stream records and `NEW_AND_OLD_IMAGES`.
- The partial batch failure explanation said Lambda retries only the specific failed records. AWS documents that Lambda checkpoints at the lowest failed sequence number and retries from that record. Updated the explanation and configuration bullet accordingly.
- The error handling section said DynamoDB Streams are ordered per partition key. AWS documents ordering for modifications to each item. Updated the wording to item-level ordering.
- The retry guidance used `maxRetryAttempts`, while the CDK property in the example is `retryAttempts`. Updated the guidance to match the CDK API.
- The failure destination link pointed to asynchronous Lambda destinations, which are different from event source mapping on-failure destinations. Updated the link and text to the DynamoDB event source on-failure destination documentation.

## Review Notes
The remaining code snippets are illustrative and assume dependencies such as `@aws-sdk/util-dynamodb`, `@aws-sdk/client-dynamodb`, and `@opensearch-project/opensearch` are packaged with the Lambda function. The `sendShippingNotification` helper is intentionally placeholder logic in the example.
