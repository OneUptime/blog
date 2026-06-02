# Validation Summary: How to Use IoT Core Rules Engine to Route Messages to Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS IoT Core
- AWS IoT Rules Engine
- AWS Lambda
- AWS CLI
- Python 3.12
- Node.js AWS SDK v3
- DynamoDB
- Amazon SNS
- AWS SAM and CloudFormation
- CloudWatch Logs
- SQS dead letter queues

## Sources Consulted
- AWS IoT Core Lambda rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/lambda-rule-action.html
- AWS Lambda documentation for using Lambda with AWS IoT: https://docs.aws.amazon.com/lambda/latest/dg/services-iot.html
- AWS IoT Core SQL functions reference: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-functions.html
- AWS IoT Core error action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/rule-error-handling.html
- AWS IoT Core rule actions documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-rule-actions.html
- AWS Lambda asynchronous invocation error handling documentation: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS CLI lambda create-function command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS CLI lambda add-permission command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CLI iot create-topic-rule command reference: https://docs.aws.amazon.com/cli/latest/reference/iot/create-topic-rule.html
- AWS CloudFormation AWS::IoT::TopicRule reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iot-topicrule.html

## Issues Found
- The example ARNs used `123456789`, which is not a valid 12-digit AWS account ID placeholder. Updated the IAM, SNS, IoT, Lambda, and SQS ARNs to use `123456789012`.
- The error handling section said IoT Rules invoke Lambda synchronously and that IoT Core does not retry failed Lambda invocations. AWS documents the IoT Lambda rule action as asynchronous. Updated the section to explain that AWS IoT may retry intermittent action activation failures, Lambda handles function errors with its asynchronous retry policy after accepting the event, and DLQs capture async events discarded after retries.
- The error action guidance implied that rule error actions capture Lambda function failures. Updated it to clarify that error actions capture rule action failures, such as permission or service errors while invoking Lambda.

## Review Notes
The code examples and configuration snippets are otherwise consistent with the referenced AWS documentation. For production use, the Lambda execution role and the IoT CloudWatch Logs role must include the required DynamoDB, SNS, SQS, and CloudWatch Logs permissions, and high-throughput workloads should be tested against account-level IoT and Lambda quotas.
