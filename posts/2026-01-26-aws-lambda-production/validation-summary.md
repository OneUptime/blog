# Validation Summary: How to Build Production Lambda Functions

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS Lambda
- AWS SDK for JavaScript v3
- AWS Secrets Manager
- Amazon CloudWatch metrics and alarms
- AWS SAM and CloudFormation
- DynamoDB
- API Gateway
- Node.js
- OpenTelemetry JavaScript
- Ajv JSON schema validation
- Jest
- LocalStack
- GitHub Actions

## Sources Consulted
- AWS Lambda Node.js handler and context documentation: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html and https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
- AWS Lambda best practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- AWS Lambda environment variables and secrets guidance: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Secrets Manager JavaScript SDK v3 examples and GetSecretValueCommand reference: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_secrets-manager_code_examples.html and https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-secrets-manager/Class/GetSecretValueCommand
- AWS SDK for JavaScript v3 DynamoDB and Node HTTP handler documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html and https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-node-http-handler/Interface/NodeHttpHandlerOptions/
- AWS SDK for JavaScript v3 client constructor migration notes: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-client-constructors.html
- Amazon CloudWatch PutMetricData API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricData.html
- AWS SAM AWS::Serverless::Function reference and generated resources documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html and https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-generated-resources-function.html
- AWS SAM CLI build, deploy, and GitHub Actions documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html, https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html, and https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/deploying-using-github.html
- OpenTelemetry JavaScript resources, instrumentation, and 2.x upgrade documentation: https://opentelemetry.io/docs/languages/js/resources/, https://opentelemetry.io/docs/languages/js/instrumentation/, and https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- Ajv documentation: https://ajv.js.org/options.html and https://ajv.js.org/guide/getting-started.html
- Jest mock functions documentation: https://jestjs.io/docs/mock-functions
- GitHub Actions setup-node documentation: https://github.com/actions/setup-node

## Issues Found
- The initial handler imported an unused `AppError` and called `handleError` without importing it. Updated the handler import to use `./errorHandler`.
- The handler used `validateOrderInput`, but the validation module only exported `validate`. Added a `validateOrderInput` wrapper and exported it.
- The AWS SDK v3 DynamoDB client example passed timeout options directly as a plain `requestHandler` object. Updated it to instantiate `NodeHttpHandler` from `@smithy/node-http-handler`, which is the documented shape for `connectionTimeout` and `socketTimeout`.
- Removed unused `PutCommand` imports from examples to avoid lint and correctness issues.
- The OpenTelemetry JavaScript tracing snippet used `new Resource(...)` and `provider.addSpanProcessor(...)`, which are not valid for current OpenTelemetry JS 2.x packages. Updated it to use `resourceFromAttributes(...)` and the `spanProcessors` provider configuration.
- The CloudWatch metrics helper flushed at 20 metrics. That was below the current `PutMetricData` limit and made the "reduce API calls" guidance outdated. Updated the buffer and flush size to 1000 metrics per request, matching the current API limit.
- The SAM provisioned concurrency example used a standalone `AWS::Lambda::Version` resource while presenting a SAM function. Updated the SAM function to use `AutoPublishAlias` and `ProvisionedConcurrencyConfig`, which SAM requires for alias-based provisioned concurrency.
- The SAM template lived under `infrastructure/template.yaml` but the pipeline used bare `sam build` and `sam deploy`. Updated the commands to pass the template file explicitly.
- The SAM function was missing `CodeUri`, which is required for a zip-based SAM function unless inline code is used. Added `CodeUri: ../`.
- The SAM template referenced undefined VPC resources in a short example. Removed the incomplete `VpcConfig` block so the snippet no longer contains unresolved references.
- The DynamoDB table comment described "auto-scaling" while the table used `PAY_PER_REQUEST`. Updated the wording to "on-demand capacity."

## Review Notes
- The examples remain tutorial snippets rather than a complete application. A production implementation should ensure buffered custom metrics are flushed before the Lambda invocation returns, and should pin/package dependency versions deliberately instead of relying on runtime-included SDK versions when exact SDK behavior matters.
