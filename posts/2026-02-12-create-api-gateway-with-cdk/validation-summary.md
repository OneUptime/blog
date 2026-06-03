# Validation Summary: How to Create an API Gateway with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Amazon API Gateway REST APIs
- API Gateway HTTP APIs
- AWS Lambda
- TypeScript
- CloudWatch Logs and metrics
- API Gateway request validation
- API Gateway API keys and usage plans
- API Gateway custom domains

## Sources Consulted
- AWS CDK v2 CLI `cdk init` documentation: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- AWS CDK v2 library dependency documentation: https://docs.aws.amazon.com/cdk/v2/guide/work-with.html
- AWS CDK `aws_apigateway.RestApi` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApi.html
- AWS CDK `aws_lambda.Function` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html
- AWS CDK `aws_apigateway.DomainNameProps` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.DomainNameProps.html
- Amazon API Gateway REST API vs HTTP API feature comparison: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- Amazon API Gateway CORS for REST APIs documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- Amazon API Gateway usage plans and API keys documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- Amazon API Gateway API key invocation documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-key-call.html
- Amazon API Gateway CloudWatch logging documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html

## Issues Found
- The Lambda examples used the deprecated CDK `logRetention` property. Replaced it with explicit `logs.LogGroup` resources passed through the current `logGroup` property.
- The Lambda proxy CORS setup only configured API Gateway preflight responses. Added `Access-Control-Allow-Origin` to Lambda responses because proxy integrations require the backend to return CORS headers.
- The route setup added `POST /items`, and the request validation section added `POST /items` again. Removed the earlier unvalidated `POST` method and added the `POST` route once with request validation attached.
- The create-item Lambda rejected a valid numeric price of `0` because it used a falsy check. Changed the check to reject only an undefined price.
- The usage plan section did not mention that methods must have `apiKeyRequired: true` for API keys and usage plans to apply. Added a note to set that method option.
- The custom domain example referenced ACM without showing the import and did not mention the `us-east-1` certificate requirement for edge-optimized domains or the separate DNS record step. Added those clarifications.
- The Lambda section instructed readers to create a `lambda` directory even though the examples use `lambda.Code.fromInline`. Removed that unnecessary instruction.

## Review Notes
The post is technically valid as a guided CDK example. For production, `dataTraceEnabled: true` can log request and response payloads and should be used carefully when payloads may contain sensitive data.
