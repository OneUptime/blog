# Validation Summary: How to Fix 'Cold Start' Serverless Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- AWS Lambda provisioned concurrency
- Application Auto Scaling
- Amazon CloudWatch Logs Insights
- Amazon CloudWatch custom metrics and alarms
- Serverless Framework
- Node.js on AWS Lambda
- AWS SDK for JavaScript v3
- PostgreSQL connection pooling with `pg`
- Java Lambda functions and AWS SDK for Java v2
- Lambda SnapStart
- esbuild

## Sources Consulted
- AWS Lambda execution environment lifecycle: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- AWS Lambda provisioned concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS Lambda runtimes and deprecation dates: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime and runtime-included SDK details: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda best practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- Application Auto Scaling for Lambda: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-lambda.html
- CloudFormation `AWS::ApplicationAutoScaling::ScalableTarget`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationautoscaling-scalabletarget.html
- CloudFormation target tracking scaling policy configuration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-applicationautoscaling-scalingpolicy-targettrackingscalingpolicyconfiguration.html
- CloudFormation predefined metric specification: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-applicationautoscaling-scalingpolicy-predefinedmetricspecification.html
- Serverless Framework AWS Lambda functions: https://www.serverless.com/framework/docs/providers/aws/guide/functions
- Serverless Framework scheduled events: https://www.serverless.com/framework/docs/providers/aws/events/schedule
- AWS SDK for JavaScript v3 DynamoDB document client: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v3 CloudWatch examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_cloudwatch_code_examples.html
- AWS SDK for JavaScript v3 Smithy Node HTTP handler docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-node-http-handler/
- AWS Lambda SnapStart: https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/

## Issues Found
- Replaced AWS SDK for JavaScript v2 examples with AWS SDK for JavaScript v3 examples because SDK v2 reached end-of-support on September 8, 2025.
- Corrected the DynamoDB document client lazy-loading example to use `DynamoDBDocumentClient.from(new DynamoDBClient({}))`, matching the AWS SDK v3 documented API.
- Changed the lazy-loading snippet export from ES module syntax to CommonJS `exports.handler` because the snippet uses `require`.
- Updated Lambda Node.js examples from `nodejs18.x` / `node18` to `nodejs22.x` / `node22` because `nodejs18.x` is deprecated in AWS Lambda as of the current review date.
- Clarified the esbuild `external` comment because Lambda includes a runtime SDK version, but AWS recommends packaging SDK modules when dependency control matters.
- Corrected the Application Auto Scaling `ResourceId` example to use a function alias suffix rather than an invalid function version attribute, and used the documented Lambda Application Auto Scaling service-linked role ARN form.
- Clarified scheduled warming behavior because scheduled invocations can reduce occasional cold starts but do not guarantee warm capacity during scale-out.
- Updated deprecated runtime labels in the runtime comparison from Node.js 18, Go 1.x, and .NET 6 to current Lambda-supported/runtime-appropriate examples.
- Reworded the Java cold start claim from an absolute statement to a qualified one.
- Replaced deprecated `@aws-sdk/node-http-handler` usage with `@smithy/node-http-handler`.
- Updated the CloudWatch custom metric example to use `CloudWatchClient` and `PutMetricDataCommand`, matching current AWS SDK v3 documented examples.
- Updated the best-practices runtime recommendation to avoid naming deprecated Go 1.x as a current Lambda runtime.

## Review Notes
The runtime cold-start duration chart remains illustrative rather than a guaranteed benchmark; actual cold start latency depends on package size, initialization code, runtime version, architecture, VPC/network configuration, extensions, and traffic pattern.
