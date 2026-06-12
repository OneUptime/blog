# Validation Summary: How to Create AWS DynamoDB Streams Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS DynamoDB
- DynamoDB Streams
- AWS Lambda
- AWS CloudFormation
- AWS CDK for TypeScript
- Terraform AWS provider
- TypeScript
- Python
- Amazon SQS
- Amazon SNS
- Amazon CloudWatch
- Amazon OpenSearch

## Sources Consulted
- AWS DynamoDB Streams documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- AWS DynamoDB StreamSpecification API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_StreamSpecification.html
- AWS CloudFormation AWS::DynamoDB::Table StreamSpecification reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-dynamodb-table-streamspecification.html
- AWS Lambda DynamoDB event source documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html
- AWS Lambda partial batch response for DynamoDB: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-batchfailurereporting.html
- AWS Lambda on-failure destinations for DynamoDB event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html
- AWS CloudFormation AWS::Lambda::EventSourceMapping reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-eventsourcemapping.html
- AWS CloudFormation EventSourceMapping OnFailure reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-eventsourcemapping-onfailure.html
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CDK DynamoDB TableProps reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html
- AWS CDK PointInTimeRecoverySpecification reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.PointInTimeRecoverySpecification.html
- AWS CDK Lambda Runtime reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CDK Lambda EventSourceMapping reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.EventSourceMapping.html
- AWS CDK Lambda event sources documentation: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda_event_sources/README.html
- Terraform aws_dynamodb_table resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- DefinitelyTyped aws-lambda DynamoDB stream event types: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/aws-lambda/trigger/dynamodb-stream.d.ts

## Issues Found
- The CloudFormation and CDK Lambda examples used the deprecated `nodejs18.x` runtime. Updated them to `nodejs24.x` / `lambda.Runtime.NODEJS_24_X`, which is a currently supported AWS Lambda runtime.
- The CDK DynamoDB table example used the deprecated `pointInTimeRecovery` property. Replaced it with `pointInTimeRecoverySpecification` and `pointInTimeRecoveryEnabled: true`.
- The partial batch failure example returned `record.eventID` as `itemIdentifier`. For DynamoDB streams, Lambda expects the failed record's stream `SequenceNumber`, so the example now reports `record.dynamodb?.SequenceNumber`.
- The partial batch failure examples did not show the required event source mapping configuration. Added `FunctionResponseTypes: [ReportBatchItemFailures]` in CloudFormation and `reportBatchItemFailures: true` in CDK.
- The partial batch failure comments said Lambda retries only the listed record. For DynamoDB streams, Lambda checkpoints before the lowest failed sequence number and retries from there, so the wording was corrected.
- The DLQ processing example assumed an SQS on-failure destination message contained the original DynamoDB stream record. AWS documents that SQS/SNS destinations receive failed invocation metadata, while S3 can include the full invocation payload. Updated the example to process invocation metadata and alert for manual review/replay.
- Replaced the outdated downstream label `ElasticSearch` with `OpenSearch` and adjusted the placeholder indexing comment.

## Review Notes
- The code examples are illustrative and still use placeholder downstream integrations, S3 bucket names, and SNS ARNs that must be replaced for a real deployment.
- The primary batch processor examples intentionally retry the whole batch on any per-record failure; the separate partial batch response example shows the more efficient pattern.
- DynamoDB stream records are retained for up to 24 hours, so any manual replay strategy based on the stream must operate within that retention window unless failed payloads are retained separately.
