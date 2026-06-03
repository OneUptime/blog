# Validation Summary: How to Configure Dead Letter Queues for Lambda Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda asynchronous invocations
- AWS Lambda dead-letter queues
- Amazon SQS
- Amazon SNS
- AWS CloudFormation
- AWS CDK v2
- AWS CLI
- CloudWatch alarms and metrics
- Python boto3

## Sources Consulted
- AWS Lambda Developer Guide: How Lambda handles errors and retries with asynchronous invocation: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda Developer Guide: Capturing records of Lambda asynchronous invocations: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function DeadLetterConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-function-deadletterconfig.html
- AWS CDK v2 API Reference: AWS Lambda FunctionProps / EventInvokeConfigOptions: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.EventInvokeConfigOptions.html
- AWS CDK v2 Java API Reference: FunctionProps.Builder: https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/lambda/FunctionProps.Builder.html
- AWS Lambda Developer Guide: Creating and configuring an Amazon SQS event source mapping: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- Amazon SQS FAQ: message retention limits and defaults: https://aws.amazon.com/sqs/faqs/
- AWS announcement: Lambda supports Amazon S3 as a failed-event destination for asynchronous and stream event sources: https://aws.amazon.com/about-aws/whats-new/2024/11/aws-lambda-s3-failed-event-destination-stream-event-sources/

## Issues Found
- The post said Lambda supports SQS and SNS as DLQ targets without qualifying the resource type. Updated this to specify standard SQS queues and standard SNS topics because AWS docs state FIFO queues and FIFO topics are not supported for Lambda DLQs.
- The SNS DLQ guidance said alerts can be triggered immediately upon failure. Updated this to say alerts happen when Lambda gives up on an event, because DLQs receive events only after processing attempts are exhausted or the event expires.
- The DLQ message attribute description said `ErrorCode` is usually 200 for handled errors or 5xx for crashes. Updated this to the AWS-documented definition: it is the HTTP status code. Also updated `ErrorMessage` to note AWS only includes the first 1 KB.
- The Lambda Destinations comparison omitted Amazon S3 as a supported failure destination. Updated the table to include S3 for failure destinations and clarified that some event source mappings also support failure destinations.
- The IAM permissions warning said Lambda silently drops failed events if DLQ permissions are missing. Updated this to say Lambda deletes the event and emits the `DeadLetterErrors` metric, which matches AWS documentation.
- The SQS-triggered Lambda DLQ explanation said the source queue DLQ catches messages that could not be delivered to Lambda and the Lambda function DLQ catches execution failures. Updated this to explain that SQS event source mappings invoke Lambda synchronously, so processing failures should be handled with the source SQS queue redrive policy rather than the function-level asynchronous DLQ.

## Review Notes
- The CloudFormation `DeadLetterConfig`, SQS `MessageRetentionPeriod`, Lambda execution role permissions, and AWS CLI `update-function-configuration --dead-letter-config TargetArn=...` examples match AWS documentation.
- The CDK `deadLetterQueue`, `retryAttempts`, and `maxEventAge` properties are valid in current AWS CDK v2 documentation.
- The local workspace does not have the AWS CLI installed, so CLI syntax was verified against official AWS documentation rather than local `aws --help` output.
- The three OneUptime links referenced in the post returned HTTP 200 during review.
