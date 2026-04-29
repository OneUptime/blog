# Validation Summary: How to Create Lambda Event Source Mappings for DynamoDB with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Lambda
- Amazon DynamoDB
- DynamoDB Streams
- AWS IAM
- Amazon SQS
- Python 3.12

## Sources Consulted
- AWS Lambda, Process DynamoDB records with Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-eventsourcemapping.html
- AWS Lambda, Lambda parameters for Amazon DynamoDB event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-params.html
- AWS Lambda, Retain discarded records for a DynamoDB event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html
- AWS Lambda, Control which events Lambda sends to your function: https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
- Amazon DynamoDB, DynamoDB Streams and Time to Live: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-streams.html
- Amazon DynamoDB, Change data capture for DynamoDB Streams: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- AWS Managed Policy Reference, AWSLambdaDynamoDBExecutionRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaDynamoDBExecutionRole.html
- AWS Lambda, Building Lambda functions with Python: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Terraform Registry, `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform Registry, `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform Registry, `archive_file` data source: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file

## Issues Found
- The Lambda example referenced `aws_iam_role.lambda` and `data.archive_file.zip` without defining either one, so the HCL would not plan as written. Added the `archive_file` data source, the Lambda execution role, and the role trust policy.
- The original inline DynamoDB Streams policy did not match AWS's documented Lambda execution-role setup and also omitted CloudWatch Logs permissions. Replaced it with the AWS-managed `AWSLambdaDynamoDBExecutionRole` attachment, which AWS documents for DynamoDB stream consumers.
- The event source mapping used an SQS on-failure destination but the execution role did not have the required `sqs:SendMessage` permission. Added a queue-scoped inline IAM policy for that permission.
- The filter example tried to exclude TTL deletions with `userIdentity = null` while still matching `REMOVE` events. That is not a valid or reliable TTL-filtering pattern based on AWS's documented event-filtering rules and TTL examples. Removed the incorrect filter block and updated the surrounding wording.
- The SQS queue comment implied that the destination receives the original unprocessable stream events. For DynamoDB event source mappings, AWS documents that SQS/SNS on-failure destinations receive invocation records for discarded batches. Updated the wording to match the documented behavior.

## Review Notes
- Python `3.12` is a supported Lambda runtime as of April 29, 2026, so the runtime selection in the post is current.
- The post's use of `stream_view_type = "NEW_AND_OLD_IMAGES"` is appropriate for handlers that compare prior and current item state on `MODIFY` events.
- If this post is later expanded to cover TTL-specific filtering, that should be shown as a dedicated example using the documented `userIdentity.type = Service` and `userIdentity.principalId = dynamodb.amazonaws.com` pattern, rather than mixed into a general CDC mapping.
- Local checks: `validation.json` was validated with `jq`. Runtime validation with `tofu` or `terraform` was not possible in this workspace because neither CLI is installed, and no live AWS deployment was performed.
