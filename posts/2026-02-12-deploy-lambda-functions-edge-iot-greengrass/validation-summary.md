# Validation Summary: How to Deploy Lambda Functions to Edge with IoT Greengrass

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- AWS IoT Greengrass v2
- Greengrass Lambda components
- Greengrass Core Python SDK
- Greengrass Legacy Subscription Router
- AWS CLI
- Python
- Raspberry Pi GPIO

## Sources Consulted
- AWS IoT Greengrass: Run AWS Lambda functions: https://docs.aws.amazon.com/greengrass/v2/developerguide/run-lambda-functions.html
- AWS IoT Greengrass: Import a Lambda function as a component (AWS CLI): https://docs.aws.amazon.com/greengrass/v2/developerguide/import-lambda-function-cli.html
- AWS IoT Greengrass API Reference: LambdaEventSource: https://docs.aws.amazon.com/greengrass/v2/APIReference/API_LambdaEventSource.html
- AWS IoT Greengrass: Legacy subscription router: https://docs.aws.amazon.com/greengrass/v2/developerguide/legacy-subscription-router-component.html
- AWS IoT Greengrass: Publish/subscribe local messages: https://docs.aws.amazon.com/greengrass/v2/developerguide/ipc-publish-subscribe.html
- AWS IoT Greengrass: Component recipe reference: https://docs.aws.amazon.com/greengrass/v2/developerguide/component-recipe-reference.html
- AWS IoT Greengrass: Greengrass CLI component: https://docs.aws.amazon.com/greengrass/v2/developerguide/greengrass-cli-component.html
- AWS Greengrass Core Python SDK documentation: https://aws.github.io/aws-greengrass-core-sdk-python/
- AWS Lambda Python runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html

## Issues Found
- The Lambda component creation example used an inline component recipe with Lambda execution settings in component configuration. AWS documents importing Lambda functions with `create-component-version` using the `lambdaFunction` request shape and `componentLambdaParameters`. Updated the command to use `--cli-input-json` with `lambdaFunction`, a versioned Lambda ARN, `componentName`, `componentVersion`, environment variables, and `eventSources`.
- The example used 9-digit placeholder AWS account IDs in ARNs. AWS account IDs are 12 digits. Updated placeholders to `123456789012`.
- The deployment example explicitly deployed Lambda launcher and runtime components but omitted the Lambda manager dependency. AWS documents these Lambda dependencies as included when deploying a Lambda function component. Removed the explicit launcher/runtime deployment entries and kept the Lambda component deployment focused.
- The Greengrass Core Python SDK examples used `publish()` without explaining that Greengrass v2 requires the `aws.greengrass.LegacySubscriptionRouter` component for that legacy SDK publish path. Added the router to the deployment example and added a note explaining when it is required.
- The long-lived Lambda example ran an infinite loop inside `lambda_handler` and manually called `lambda_handler(None, None)` at module load. AWS documents that long-lived handler invocations still have timeouts and indefinite work should not block initialization. Updated the example to start continuous processing in a background thread and keep the handler available for work messages.

## Review Notes
- The post now uses the legacy Greengrass Core Python SDK examples correctly by documenting and configuring the Legacy Subscription Router. For new Greengrass v2 custom component development, AWS recommends using IPC through the AWS IoT Device SDK v2 instead of the legacy SDK publish path.
- Python 3.11 remains a supported AWS Lambda runtime as of this review date, but it has scheduled runtime lifecycle dates. Future reviews should re-check Lambda runtime support.
