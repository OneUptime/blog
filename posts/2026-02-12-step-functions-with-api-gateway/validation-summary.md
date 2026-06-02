# Validation Summary: Use Step Functions with API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- AWS SAM / CloudFormation
- IAM policies
- JavaScript AWS SDK v3
- API Gateway Velocity Template Language mapping templates

## Sources Consulted
- AWS Step Functions API Reference: StartExecution: https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html
- AWS Step Functions API Reference: StartSyncExecution: https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartSyncExecution.html
- AWS Step Functions API Reference: DescribeExecution: https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html
- AWS Step Functions Developer Guide: Choosing workflow type: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions Developer Guide: Creating a Step Functions API using API Gateway: https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-api-gateway.html
- Amazon API Gateway Developer Guide: HTTP API integration subtype reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services-reference.html
- Amazon API Gateway Developer Guide: Mapping template reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
- Amazon API Gateway Developer Guide: Override request/response parameters and status codes: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-override-request-response-parameters.html
- OpenAPI Specification 3.0.1: https://spec.openapis.org/oas/v3.0.1.html

## Issues Found
- The example Step Functions state machine ARN used a 9-digit AWS account ID. AWS account IDs are 12 digits, so it was changed to `123456789012`.
- The REST API OpenAPI snippets used `openapi: "3.0"`, which is not a valid semantic OpenAPI version string. It was changed to `3.0.1`.
- The API Gateway request mapping templates used `$input.body` without the documented JSON body selector pattern and without repairing single quotes escaped by `$util.escapeJavaScript`. The templates now use `$input.json('$')` and `.replaceAll("\\'","'")`.
- The async response mapping attempted to read `executionArn` with an invalid JSONPath expression. It now reads the value with `$input.path('$.executionArn')` before extracting the execution ID.
- The synchronous response mapping attempted to parse output with `$input.json('output')`, which is not the correct JSONPath form and can render invalid JSON. It now returns `$input.path('$.output')`.
- The error response mapping read `status`, `output`, `error`, and `cause` with incorrect or fragile JSONPath usage. It now uses `$input.path('$.status')`, `$input.path('$.output')`, and escapes string fields before returning JSON.
- The request validation section implied that defining a model and request validator alone validates requests. The wording was changed to clarify that the model and validator must be attached to the method.

## Review Notes
The article remains technically accurate as a high-level tutorial. Some CloudFormation/SAM snippets are illustrative fragments and still assume omitted resources such as IAM roles, state machines, Lambda functions, API deployments, and method attachments are defined elsewhere.
