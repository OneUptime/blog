# Validation Summary: How to Fix DynamoDB 'ResourceNotFoundException' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Streams
- DynamoDB Local
- Boto3 for Python
- AWS CLI
- AWS CloudTrail
- Amazon CloudWatch metrics
- CloudFormation and Terraform resource provisioning

## Sources Consulted
- AWS CLI Command Reference: `aws dynamodb wait table-exists` - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/wait/table-exists.html
- Boto3 DynamoDB `Table.wait_until_exists` documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/wait_until_exists.html
- Boto3 DynamoDB `ResourceNotFoundException` documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/exceptions/ResourceNotFoundException.html
- Boto3 DynamoDB `describe_table` documentation, including GSI `IndexStatus` values - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/describe_table.html
- Amazon DynamoDB Local usage notes - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html
- AWS CLI Command Reference: `aws cloudtrail lookup-events` - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Boto3 DynamoDB `list_backups` documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/list_backups.html
- Boto3 DynamoDB `describe_backup` documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/describe_backup.html
- Boto3 DynamoDB Streams `describe_stream` documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodbstreams/client/describe_stream.html
- Amazon DynamoDB CloudWatch metrics and dimensions - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html

## Issues Found
- The post said `ResourceNotFoundException` applies to backups. DynamoDB backup APIs use `BackupNotFoundException` for missing backups, while DynamoDB Streams APIs can return `ResourceNotFoundException`. Updated the introduction and backup/stream section to distinguish these errors accurately.
- The monitoring section described CloudWatch `UserErrors` as a metric for DynamoDB tables. AWS documents `UserErrors` as an aggregate for DynamoDB or DynamoDB Streams HTTP 400 errors in the current account and region. Updated the wording to avoid implying a table-level dimension.

## Review Notes
The Python and AWS CLI examples use current Boto3 and AWS CLI APIs. The `table.wait_until_exists` and `aws dynamodb wait table-exists` examples correctly wait for `TableStatus` to become `ACTIVE`. DynamoDB Local endpoint and credential guidance is consistent with AWS documentation.
