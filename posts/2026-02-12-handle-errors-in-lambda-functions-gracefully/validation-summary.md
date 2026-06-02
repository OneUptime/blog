# Validation Summary: How to Handle Errors in Lambda Functions Gracefully

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- Lambda asynchronous invocations
- Lambda event source mappings
- Lambda dead letter queues and destinations
- AWS CloudFormation
- Amazon SQS
- Amazon CloudWatch Logs
- Node.js JavaScript handlers

## Sources Consulted
- AWS Lambda Developer Guide: Understanding retry behavior in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html
- AWS Lambda Developer Guide: How Lambda handles errors and retries with asynchronous invocation - https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda Developer Guide: Configuring error handling settings for Lambda asynchronous invocations - https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html
- AWS CloudFormation Template Reference: AWS::Lambda::EventInvokeConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-eventinvokeconfig.html
- AWS CloudFormation Template Reference: AWS::Lambda::EventInvokeConfig DestinationConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-eventinvokeconfig-destinationconfig.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function DeadLetterConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-deadletterconfig.html
- AWS Lambda API Reference: CreateEventSourceMapping - https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS Lambda Developer Guide: Using the Lambda context object to retrieve Node.js function information - https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
- AWS Lambda Developer Guide: Log and monitor Node.js Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html

## Issues Found
- Corrected the description of invocation errors and function errors. AWS documents timeouts and runtime failures as function errors, while invocation errors are failures that prevent Lambda from invoking the function.
- Clarified that the retry table describes default Lambda retry behavior for function errors. AWS notes that synchronous invoking services can have their own retry behavior.
- Narrowed the try/catch guidance to synchronous request/response integrations. For asynchronous and stream-based invocations, swallowing errors can prevent Lambda retries, DLQs, and destinations from seeing the failure.
- Added the required `Qualifier` property to the `AWS::Lambda::EventInvokeConfig` CloudFormation example.
- Corrected the CloudFormation property name from `MaximumEventAgeSeconds` to `MaximumEventAgeInSeconds`.
- Added a note that Lambda's execution role needs permission to send to the configured SQS DLQ or publish to an SNS DLQ.

## Review Notes
The JavaScript snippets are illustrative and reference placeholder functions such as `processEvent`, `chargePayment`, and `fetchFromApi`. They are syntactically reasonable for Node.js Lambda handlers but are not standalone runnable examples without those application-specific functions.
