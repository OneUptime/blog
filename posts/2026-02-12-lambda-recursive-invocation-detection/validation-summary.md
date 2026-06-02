# Validation Summary: How to Use Lambda Recursive Invocation Detection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- AWS Lambda recursive loop detection
- Amazon SQS
- Amazon S3
- Amazon SNS
- Amazon DynamoDB Streams
- Amazon EventBridge
- Amazon CloudWatch
- AWS CLI
- AWS CloudFormation
- Python
- boto3

## Sources Consulted
- AWS Lambda Developer Guide: Use Lambda recursive loop detection to prevent infinite loops: https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html
- AWS CLI Command Reference: get-function-recursion-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-recursion-config.html
- AWS Lambda Developer Guide: PutFunctionRecursionConfig CLI examples: https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html#invocation-recursion-allow
- AWS CloudFormation Template Reference: AWS::Lambda::Function: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CloudFormation Template Reference: AWS::Events::Rule Target: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-events-rule-target.html
- Amazon EventBridge User Guide: Using dead-letter queues to process undelivered events: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html
- Amazon EventBridge User Guide: Best practices for monitoring event delivery: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring-events-best-practices.html

## Issues Found
- The post used non-existent AWS CLI command names, `get-function-recursive-config` and `put-function-recursive-config`. Changed them to the documented `get-function-recursion-config` and `put-function-recursion-config` commands.
- The sample `get-function-recursion-config` output included an `Arn` field. The documented output is `RecursiveLoop`, so the example response was corrected.
- The post said Lambda recursive loop detection only covers SQS, SNS, and direct Lambda invocation, and listed S3 as unsupported. Current AWS documentation says Lambda detects loops involving SQS, S3, SNS, and Lambda-to-Lambda chains. Updated the supported and unsupported service lists, the S3 section, and the wrap-up.
- The explanation omitted the AWS SDK requirement for supported service loops. Added a note that SQS, S3, and SNS loops require a supported AWS SDK version to propagate recursion metadata.
- The Lambda CloudFormation snippet omitted the required `Role` property for an `AWS::Lambda::Function`. Added a placeholder execution role ARN.
- The EventBridge DLQ section incorrectly said EventBridge DLQs catch events dropped by Lambda recursion detection. Updated the text to clarify that EventBridge DLQs catch EventBridge target delivery failures after retrying, and that Lambda recursive loop detection does not cover EventBridge loops.
- The EventBridge CloudFormation example did not include the SQS queue policy EventBridge needs to send messages to the DLQ, or the Lambda permission needed for an EventBridge rule to invoke the function. Added both resources.

## Review Notes
The local workspace does not have the AWS CLI installed, so CLI commands were verified against official AWS CLI documentation rather than local `aws help` output. The Python snippets are syntactically valid examples, but the custom DynamoDB recursion guard is intentionally simplified; in production, the recursion marker must be propagated through downstream events for the guard to identify a request chain reliably.
