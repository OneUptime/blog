# Validation Summary: How to Configure DynamoDB Streams with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS DynamoDB
- DynamoDB Streams
- AWS Lambda
- AWS IAM
- AWS CLI
- Amazon SQS

## Sources Consulted
- DynamoDB Streams and AWS Lambda triggers: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
- Core components of Amazon DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
- DynamoDB `StreamSpecification` API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_StreamSpecification.html
- Lambda parameters for Amazon DynamoDB event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-params.html
- Process DynamoDB records with Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-eventsourcemapping.html
- Configuring partial batch response with DynamoDB and Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-batchfailurereporting.html
- Retain discarded records for a DynamoDB event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html
- Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWSLambdaDynamoDBExecutionRole managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaDynamoDBExecutionRole.html
- Actions, resources, and condition keys for Amazon DynamoDB: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondynamodb.html
- AWS CLI `dynamodb describe-table` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html
- AWS provider `aws_dynamodb_table` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- AWS provider `aws_lambda_event_source_mapping` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_event_source_mapping.html.markdown
- AWS provider `aws_lambda_function` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown

## Issues Found
- The prerequisites only mentioned DynamoDB and Lambda permissions, but the example also creates IAM resources and configures an SQS on-failure destination. I updated the prerequisite to include IAM and SQS permissions.
- The inline IAM policy scoped `dynamodb:ListStreams` to the table stream ARN. DynamoDB's service authorization reference shows `ListStreams` does not support resource-level permissions, so I changed it to `Resource = "*"` and kept the stream-scoped permissions on a separate statement.
- The event source mapping configured an SQS on-failure destination, but the Lambda execution role was missing `sqs:SendMessage` permission for that queue. I added the permission so discarded batches can be delivered to the destination.
- The Lambda function used `runtime = "nodejs20.x"`. AWS lists Node.js 20 as deprecated starting on April 30, 2026, so I updated the example to `nodejs22.x`.
- The `TRIM_HORIZON` comment said it reads “all historical records.” DynamoDB Streams retains records for 24 hours, so I corrected the wording to “the oldest available records in the stream.”
- The `NEW_AND_OLD_IMAGES` comment said it is “required for Global Tables,” which is too broad for current DynamoDB documentation. I removed that claim and kept the accurate description of the stream view type.
- The conclusion overstated `ReportBatchItemFailures` by saying successfully processed records are not reprocessed. AWS documents that Lambda checkpoints to the lowest failed sequence number, which reduces retries but can still retry some successful records after that point. I corrected the explanation and noted that the handler must return partial batch responses.
- The on-failure destination comment implied the queue receives raw failed records. For DynamoDB stream event source mappings, Lambda sends discarded batch details/metadata to SQS or SNS destinations, so I updated the wording to match the documented behavior.

## Review Notes
- `LATEST` is a valid starting position, but AWS notes it can miss events during event source mapping creation or updates. `TRIM_HORIZON` is safer when you need to avoid gaps during setup.
- The post does not include the Lambda handler implementation. The infrastructure configuration is now correct, but `ReportBatchItemFailures` only has effect if the handler returns the documented `batchItemFailures` response structure using DynamoDB sequence numbers.
- `tofu` and `terraform` were not installed in the review environment, so validation was documentation-based rather than CLI schema-based.
