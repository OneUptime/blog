# Validation Summary: How to Use IoT Core Rules Engine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS IoT Core Rules Engine
- AWS IoT SQL
- AWS CLI
- Amazon DynamoDB
- AWS Lambda
- Amazon S3
- Amazon SNS
- Amazon Kinesis Data Streams
- Amazon CloudWatch Logs and Metrics
- IAM roles and policies
- Python with boto3

## Sources Consulted
- AWS IoT Core: Creating an AWS IoT rule: https://docs.aws.amazon.com/iot/latest/developerguide/iot-create-rule.html
- AWS IoT Core: AWS IoT rule actions: https://docs.aws.amazon.com/iot/latest/developerguide/iot-rule-actions.html
- AWS IoT Core: AWS IoT SQL reference: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-reference.html
- AWS IoT Core: SQL operators: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-operators.html
- AWS IoT Core: SQL functions: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-functions.html
- AWS IoT Core: JSON extensions: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-json.html
- AWS IoT Core: Substitution templates: https://docs.aws.amazon.com/iot/latest/developerguide/iot-substitution-templates.html
- AWS IoT Core: DynamoDBv2 rule action: https://docs.aws.amazon.com/iot/latest/developerguide/dynamodb-v2-rule-action.html
- AWS IoT Core: Lambda rule action: https://docs.aws.amazon.com/iot/latest/developerguide/lambda-rule-action.html
- AWS IoT Core: S3 rule action: https://docs.aws.amazon.com/iot/latest/developerguide/s3-rule-action.html
- AWS IoT Core: SNS rule action: https://docs.aws.amazon.com/iot/latest/developerguide/sns-rule-action.html
- AWS IoT Core: Kinesis Data Streams rule action: https://docs.aws.amazon.com/iot/latest/developerguide/kinesis-rule-action.html
- AWS IoT Core: CloudWatch Logs rule action: https://docs.aws.amazon.com/iot/latest/developerguide/cloudwatch-logs-rule-action.html
- AWS IoT Core: CloudWatch Metrics rule action: https://docs.aws.amazon.com/iot/latest/developerguide/cloudwatch-metrics-rule-action.html
- AWS IoT Core: Granting an AWS IoT rule the access it requires: https://docs.aws.amazon.com/iot/latest/developerguide/iot-create-role.html
- AWS CLI: iot create-topic-rule: https://docs.aws.amazon.com/cli/latest/reference/iot/create-topic-rule.html
- AWS CLI: dynamodb create-table: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- AWS IoT Core: Testing custom authorizers: https://docs.aws.amazon.com/iot/latest/developerguide/custom-auth-testing.html
- AWS IoT Core: Tutorial testing rules with MQTT client: https://docs.aws.amazon.com/iot/latest/developerguide/iot-ddb-rule.html

## Issues Found
- The SQL examples used `--` comments inside AWS IoT SQL snippets. AWS IoT SQL does not support comments, so the comment lines were removed from SQL code blocks.
- The filtering example used `LIKE`, which is not listed as a supported AWS IoT SQL operator. Changed it to `startswith(device_id, 'warehouse')`, a supported AWS IoT SQL function.
- The functions example used `round(temperature, 1)`, but AWS IoT SQL documents `round(Decimal)` with one argument. Changed it to `round(temperature)`.
- The nested JSON example used `IS NOT NULL`, which is not supported by AWS IoT SQL operators. Changed it to `NOT isUndefined(readings.temp) AND NOT isNull(readings.temp)`.
- Example ARNs used a 9-digit account ID. AWS account IDs are 12 digits, so example ARNs were updated to `123456789012`.
- The Lambda rule action example did not mention the required Lambda resource-based permission for AWS IoT invocations when creating rules outside the AWS IoT console. Added a minimal `aws lambda add-permission` command.
- The IAM section said each rule action needs an IAM role. Lambda rule actions instead require a Lambda resource-based permission, so the wording was corrected.
- The CloudWatch metric action used `${timestamp()}` for `metricTimestamp`, but the action expects Unix epoch seconds while `timestamp()` returns milliseconds. Changed it to `${timestamp() / 1000}`.
- The testing section showed `aws iot test-invoke-authorizer`, which tests custom authorizers, not rule SQL. Removed that command and kept the official MQTT test client approach.
- The rule component description implied the error action was required. Clarified that error actions are optional but recommended.
- The error handling section said failed actions were silently lost. AWS documents retries and CloudWatch Logs failure details, so the wording was corrected.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI syntax was verified against the official AWS CLI documentation instead of local `--help` output.
