# Validation Summary: How to Use Lambda Function URLs for Simple HTTP Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Lambda Function URLs
- AWS CLI
- AWS CloudFormation
- CORS
- Node.js Lambda handlers
- Lambda response streaming
- Stripe webhooks
- Amazon API Gateway

## Sources Consulted
- AWS Lambda: Control access to Lambda function URLs: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS Lambda: Creating and managing Lambda function URLs: https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html
- AWS Lambda: Invoking Lambda function URLs: https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
- AWS Lambda: Response streaming for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
- AWS Lambda: Writing response streaming-enabled Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/config-rs-write-functions.html
- AWS CloudFormation: AWS::Lambda::Url: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-url.html
- AWS CloudFormation: AWS::Lambda::Function: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html
- AWS CloudFormation: AWS::Lambda::Permission: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- Amazon API Gateway pricing: https://aws.amazon.com/api-gateway/pricing/
- Stripe webhook signature verification: https://docs.stripe.com/webhooks/signature?lang=node

## Issues Found
- Public Function URL permissions were incomplete for current AWS behavior. AWS documentation says new function URLs require both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` permissions. Added the second AWS CLI `add-permission` command and a second `AWS::Lambda::Permission` resource with `InvokedViaFunctionUrl: true`.
- The CloudFormation Lambda function example omitted the required execution role. Added a minimal `AWS::IAM::Role` using the AWS-managed basic Lambda execution policy and wired it to the function's `Role` property.
- The response streaming section did not mention that Function URLs must use `RESPONSE_STREAM` invoke mode instead of the default `BUFFERED` mode. Added that requirement and removed an unused `pipeline` import from the example.
- The "internal microservices" recommendation could imply private networking support. AWS documents Function URLs as public Internet endpoints, so the wording now limits this use case to public HTTPS endpoints where IAM authentication is acceptable.
- The API Gateway cost comparison was too broad. Updated it to distinguish HTTP API pricing from higher-cost REST API pricing.
- The Stripe webhook verification example used a hand-rolled HMAC that did not match Stripe's documented signature scheme. Replaced it with Stripe's official `stripe.webhooks.constructEvent()` verifier using the raw request body.

## Review Notes
The remaining examples match the documented Function URL payload format, CORS configuration shape, and Node.js response streaming APIs. Function URLs still do not directly support custom domain names; use API Gateway or front the Function URL with another service when a custom domain is required.
