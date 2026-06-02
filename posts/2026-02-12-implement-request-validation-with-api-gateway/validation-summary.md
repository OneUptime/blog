# Validation Summary: How to Implement Request Validation with API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS API Gateway REST APIs
- AWS API Gateway HTTP APIs
- AWS CDK v2
- AWS Lambda
- JSON Schema draft 4
- JavaScript and TypeScript
- Joi/Zod-style Lambda validation

## Sources Consulted
- AWS API Gateway Developer Guide: Request validation for REST APIs in API Gateway, https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html
- AWS API Gateway Developer Guide: Set up basic request validation in API Gateway, https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-validation-set-up.html
- AWS API Gateway Developer Guide: Data models for REST APIs, https://docs.aws.amazon.com/apigateway/latest/developerguide/models-mappings-models.html
- AWS API Gateway Developer Guide: Use OpenAPI definitions for HTTP APIs, https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-open-api.html
- AWS API Gateway Developer Guide: Amazon API Gateway important notes, https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-known-issues.html
- AWS CDK API Reference: aws_apigateway.RequestValidator, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RequestValidator.html
- AWS CDK API Reference: aws_apigateway.JsonSchema, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.JsonSchema.html
- AWS CDK API Reference: aws_apigateway.ResourceBase.addMethod, https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_apigateway/ResourceBase.html
- AWS CDK API Reference: aws_apigateway.ResponseType and GatewayResponse, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.ResponseType.html
- AWS Lambda Developer Guide: Lambda runtimes, https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CDK API Reference: aws_lambda.Runtime, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html

## Issues Found
- The post said API Gateway validates request bodies, query string parameters, and headers using JSON Schema. AWS documents JSON Schema validation for request payload models, while required URI/query/header parameter validation only checks that values are included and not blank. I changed the wording to distinguish body schema validation from parameter presence checks.
- The query/header validation section did not state the type/format limitation for request parameters. I added a sentence explaining that API Gateway does not validate query string or header parameter type or format.
- The CDK Lambda example used `lambda.Runtime.NODEJS_18_X`, which is deprecated in current AWS Lambda/CDK documentation as of June 2, 2026. I updated the example to `lambda.Runtime.NODEJS_24_X`, a currently supported Lambda runtime.

## Review Notes
The CDK request validator, request model, request parameter, and Gateway Response APIs match current AWS CDK v2 documentation. API Gateway REST API models use JSON Schema draft 4; HTTP APIs still do not support OpenAPI request validation and ignore `requestBody`/`schema` during import. Runtime validation with a live AWS deployment was not performed in this workspace.
