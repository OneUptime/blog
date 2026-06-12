# Validation Summary: How to Use Lambda Destinations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda Destinations
- AWS Lambda asynchronous invocation
- Amazon SQS
- Amazon SNS
- Amazon EventBridge
- Amazon S3 failure destinations
- AWS CLI
- Terraform AWS Provider
- AWS SAM
- AWS SDK for JavaScript v3
- CloudWatch metrics and alarms

## Sources Consulted
- AWS Lambda documentation, "Capturing records of Lambda asynchronous invocations": https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS Lambda documentation, "Invoking a Lambda function asynchronously": https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html
- AWS Lambda documentation, "Configuring error handling settings for Lambda asynchronous invocations": https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html
- AWS Lambda API Reference, Invoke: https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
- AWS CLI Command Reference, lambda put-function-event-invoke-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-event-invoke-config.html
- AWS CloudFormation Template Reference, AWS::Lambda::EventInvokeConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-eventinvokeconfig.html
- AWS SAM Developer Guide, EventInvokeConfiguration and EventInvokeDestinationConfiguration: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-eventinvokeconfiguration.html
- AWS SAM Developer Guide, OnSuccess destination property: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-onsuccess.html
- Amazon EventBridge User Guide, resource-based policies: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Terraform AWS Provider documentation, aws_lambda_function_event_invoke_config: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_event_invoke_config
- AWS Developer Tools Blog, "Announcing end-of-support for AWS SDK for JavaScript v2": https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS SDK for JavaScript v3 Developer Guide, Lambda examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_lambda_code_examples.html

## Issues Found
1. **Supported destination types were incomplete**: Updated the description and DLQ comparison table to include S3 as an on-failure destination and to clarify that SQS and SNS destinations must be standard queues/topics, not FIFO.

2. **Missing EventBridge destination permission**: Added an IAM policy granting `events:PutEvents` to the Lambda execution role for the EventBridge destination example. AWS requires the source function execution role to have permission for the destination service.

3. **EventBridge rule matched the wrong payload field**: Changed the EventBridge event pattern from `responsePayload.orderTotal` to `responsePayload.total` to match the `processedOrder` object returned by the example Lambda function.

4. **Missing EventBridge-to-Lambda target permission**: Added an `aws_lambda_permission` resource so the EventBridge rule can invoke the `premium_handler` Lambda target.

5. **Incorrect Lambda-to-Lambda destination permission model**: Replaced the `aws_lambda_permission` resource in the chaining example with IAM role policies on the source Lambda execution roles. Lambda destinations require the source function's execution role to have `lambda:InvokeFunction` and destination-specific permissions.

6. **Outdated AWS SDK for JavaScript v2 example**: Replaced the `aws-sdk` v2 `new AWS.Lambda().invoke(...).promise()` example with AWS SDK for JavaScript v3 using `LambdaClient` and `InvokeCommand`, because AWS SDK for JavaScript v2 reached end-of-support on September 8, 2025.

7. **JavaScript snippet syntax issue**: Wrapped the SDK invocation example in an async function so it does not use top-level `await` in a CommonJS `require()` snippet.

8. **Overstated retry destination payload detail**: Changed the retry diagram note from saying the failure destination includes "all 3 attempt details" to saying it includes final failure details and the invoke count.

9. **Event source mapping caveat**: Clarified that Kinesis does not use function-level async destinations. AWS supports on-failure destinations for some event source mappings, which is separate from function-level asynchronous invocation destinations.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI flags and behavior were verified against the official AWS CLI and Lambda API documentation.
- The examples are still illustrative and omit surrounding resources such as IAM role definitions, deployment packages, and helper functions like `sendConfirmationEmail`.
- `put-function-event-invoke-config` overwrites existing async invocation configuration; readers updating only one setting should use `update-function-event-invoke-config`.
