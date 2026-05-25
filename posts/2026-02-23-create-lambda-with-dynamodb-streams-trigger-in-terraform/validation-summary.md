# Validation Summary: How to Create Lambda with DynamoDB Streams Trigger in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Lambda
- Amazon DynamoDB Streams
- AWS IAM
- Amazon SQS
- Amazon CloudWatch
- Python 3.12

## Sources Consulted
- AWS Lambda Developer Guide: Lambda parameters for Amazon DynamoDB event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-params.html
- AWS Lambda Developer Guide: Process DynamoDB records with Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-eventsourcemapping.html
- AWS Lambda Developer Guide: Configuring partial batch response with DynamoDB and Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-batchfailurereporting.html
- AWS Lambda Developer Guide: Retain discarded records for a DynamoDB event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html
- AWS Lambda Developer Guide: Control which events Lambda sends to your function: https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
- Amazon DynamoDB Developer Guide: DynamoDB Streams and AWS Lambda triggers: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
- Amazon DynamoDB Developer Guide: Using filters to process some events with DynamoDB and Lambda: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.Tutorial2.html
- Terraform AWS Provider documentation: aws_lambda_event_source_mapping: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS Provider documentation: aws_dynamodb_table: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS Provider documentation: aws_sqs_queue: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS Provider documentation: aws_cloudwatch_metric_alarm: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS announcement: Lambda support for Python 3.12: https://aws.amazon.com/about-aws/whats-new/2023/12/aws-lambda-support-python-3-12
- Boto3 DynamoDB TypeDeserializer reference: https://docs.aws.amazon.com/boto3/latest/_modules/boto3/dynamodb/types.html

## Issues Found
- The Lambda handler returned `record['eventID']` as the partial batch failure `itemIdentifier`. For DynamoDB Streams, Lambda partial batch failure reporting expects the stream record sequence number. Changed the code to return `record['dynamodb']['SequenceNumber']`.
- The Python deserializer used `deserialize_value()` for list values but never defined that function. Added `deserialize_value()` and updated `deserialize()` to use it consistently for DynamoDB attribute values.
- The event filtering comment said a filter detected status changes to `shipped`, but the filter only verifies that `NewImage.status` is `shipped` on a `MODIFY` event. Updated the wording to avoid implying an `OldImage` comparison.
- The failure destination wording implied SQS receives the complete failed records. AWS documents SQS/SNS on-failure destinations for DynamoDB event source mappings as receiving failed invocation metadata. Updated the wording to be precise.

## Review Notes
- Terraform was not installed in the local workspace, so Terraform validation was performed against the official Terraform AWS provider documentation rather than by running `terraform validate`.
- The Python code block was parsed with Python 3 and is syntactically valid after the fixes.
