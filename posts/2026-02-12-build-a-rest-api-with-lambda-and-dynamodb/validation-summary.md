# Validation Summary: How to Build a REST API with Lambda and DynamoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon DynamoDB
- Amazon API Gateway HTTP APIs
- AWS SDK for JavaScript v3
- AWS CLI
- AWS CloudFormation
- IAM
- HTTP REST API patterns

## Sources Consulted
- AWS CLI Command Reference: `aws dynamodb create-table` - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- AWS CloudFormation: `AWS::ApiGatewayV2::Integration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-integration.html
- Amazon API Gateway Developer Guide: Lambda proxy integrations for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS CloudFormation: `AWS::Lambda::Permission` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-permission.html
- AWS SDK for JavaScript v3: `@aws-sdk/lib-dynamodb` - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- RFC 9110: HTTP Semantics - https://www.rfc-editor.org/rfc/rfc9110.html

## Issues Found
- The API Gateway HTTP API CloudFormation integration used `!GetAtt TasksFunction.Arn` directly as `IntegrationUri` and omitted `IntegrationMethod`. AWS's CloudFormation example for Lambda proxy integrations uses the API Gateway Lambda invocation URI format, `arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/.../invocations`, with `IntegrationMethod: POST`. Updated the snippet accordingly so it deploys as a Lambda proxy integration.
- The response helper serialized `null` into the body for `response(204, null)`. RFC 9110 states that `204 No Content` responses do not include content. Updated the helper to omit the `body` property when the response body is `null` or `undefined`.

## Review Notes
- The JavaScript snippets were concatenated and passed `node --check` using Node.js 22.22.0.
- The local AWS CLI was not installed in the review environment, so AWS CLI command validation was performed against the official AWS CLI reference.
- The main CRUD examples include basic validation, while the later `validateTask` helper provides stricter production validation. A future revision could show that helper wired directly into `createTask` and `updateTask`, but the current post is technically valid after the fixes above.
