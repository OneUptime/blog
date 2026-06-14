# Validation Summary: How to Use DynamoDB Streams

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Streams
- AWS Lambda event source mappings
- AWS SAM / CloudFormation
- AWS CLI
- Terraform AWS provider
- Node.js / AWS SDK for JavaScript v3
- Python / boto3
- Amazon S3
- Amazon SQS
- Amazon CloudWatch
- OpenSearch

## Sources Consulted
- Amazon DynamoDB Developer Guide: DynamoDB Streams change data capture: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- AWS Lambda Developer Guide: Configuring partial batch response with DynamoDB and Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-batchfailurereporting.html
- AWS Lambda Developer Guide: Using event filtering with a DynamoDB event source: https://docs.aws.amazon.com/lambda/latest/dg/with-ddb-filtering.html
- AWS SAM Developer Guide: DynamoDB event source properties: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-dynamodb.html
- AWS SAM Developer Guide: DynamoDBStreamReadPolicy template: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html#dynamodbstreamreadpolicy
- AWS Lambda Developer Guide: Lambda metric types and IteratorAge: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS Lambda Developer Guide: Viewing Lambda metrics and dimensions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html
- Amazon DynamoDB Developer Guide: DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Terraform AWS provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- OpenSearch JavaScript client documentation: https://opensearch.org/docs/latest/clients/javascript/

## Issues Found
- Corrected the opening description from "Every insert, update, or delete" to "Every insert, delete, or data-changing update" because DynamoDB Streams does not write a stream record for no-op `PutItem` or `UpdateItem` operations.
- Replaced references implying Kinesis Data Streams directly consumes DynamoDB Streams with the DynamoDB Streams Kinesis adapter, matching AWS's documented stream-consumer model.
- Corrected the Node.js Lambda example to return `batchItemFailures` with `record.dynamodb.SequenceNumber` instead of swallowing errors and returning success. Swallowing errors would advance the checkpoint and prevent retries or on-failure handling.
- Corrected the Python partial batch failure example to return DynamoDB stream sequence numbers, not `eventID` values. Lambda's DynamoDB partial batch response requires `itemIdentifier` to be the stream sequence number.
- Narrowed the ordering claim from partition-key ordering to same-item ordering, which is the guarantee documented by DynamoDB Streams.
- Corrected the monitoring table and CloudWatch alarm example to use Lambda's `AWS/Lambda` `IteratorAge` metric with the `FunctionName` dimension. The original alarm used an `AWS/DynamoDB` `IteratorAge` metric and `TableName` dimension, which is not the documented Lambda stream-consumer lag metric.
- Clarified the Lambda filter example comment from "status changed to active" to "new status is active" because the provided filter only checks `NewImage.status` and does not compare old and new images.
- Clarified the idempotency note to say Lambda stream processing is at-least-once and duplicate processing can happen during retries.

## Review Notes
The examples are illustrative and omit production concerns such as full IAM permissions for S3/SQS/CloudWatch/OpenSearch, OpenSearch AWS SigV4 configuration, and use of official unmarshalling helpers such as `@aws-sdk/util-dynamodb` or `boto3.dynamodb.types.TypeDeserializer`. Those omissions are acceptable for the tutorial's scope but should be expanded if the post is later turned into a deployable reference implementation.
