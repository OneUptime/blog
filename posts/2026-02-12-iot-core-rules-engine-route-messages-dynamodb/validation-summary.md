# Validation Summary: How to Use IoT Core Rules Engine to Route Messages to DynamoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core Rules Engine
- AWS IoT SQL
- Amazon DynamoDB
- DynamoDB TTL
- AWS IAM
- AWS CLI
- AWS CloudFormation
- Amazon CloudWatch Logs
- Amazon S3 rule actions

## Sources Consulted
- AWS IoT Core DynamoDBv2 rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/dynamodb-v2-rule-action.html
- AWS IoT Core DynamoDB rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/dynamodb-rule-action.html
- AWS IoT Core SQL functions documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-functions.html
- AWS IoT Core SELECT clause documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-select.html
- AWS IoT Core rule creation documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-create-rule.html
- AWS CLI create-topic-rule command reference: https://docs.aws.amazon.com/cli/latest/reference/iot/create-topic-rule.html
- AWS CloudFormation AWS::IoT::TopicRule documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iot-topicrule.html
- AWS CloudFormation DynamoDBv2Action documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-iot-topicrule-dynamodbv2action.html
- Amazon DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- Amazon DynamoDB TTL computation documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-before-you-start.html
- Amazon DynamoDB constraints documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- Amazon DynamoDB read consistency documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- AWS IoT Core CloudWatch Logs rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/cloudwatch-logs-rule-action.html

## Issues Found
- The sample ARNs used a 9-digit account ID (`123456789`), which is not a valid AWS account ID format. Updated the examples to use the standard 12-digit placeholder `123456789012`.
- The IoT rule payloads omitted `awsIotSqlVersion`. AWS recommends specifying it, and AWS CLI / CloudFormation rules default to `2015-10-08` when it is omitted. Added `awsIotSqlVersion: 2016-03-23` to the CLI examples and `AwsIotSqlVersion: '2016-03-23'` to the CloudFormation rule.
- The CloudWatch Logs error action used the DynamoDB role without granting CloudWatch Logs permissions or creating the referenced log group. Added a `create-log-group` command and `logs:CreateLogStream` / `logs:PutLogEvents` permissions for `/iot/rules/errors`.
- The DynamoDB TTL expression divided the millisecond IoT timestamp by 1000 but did not force epoch seconds to an integer. Updated the SQL expression to use `floor(timestamp() / 1000) + 2592000`.

## Review Notes
The article's core flow is accurate: DynamoDBv2 writes attributes from the SQL result into DynamoDB, the selected root-level keys match the DynamoDB table keys, and the classic DynamoDB action fields match AWS IoT Core documentation. The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and AWS service documentation.
