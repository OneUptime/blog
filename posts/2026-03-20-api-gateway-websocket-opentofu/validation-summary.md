# Validation Summary: How to Create API Gateway WebSocket APIs with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway WebSocket APIs
- AWS Lambda
- AWS IAM
- Amazon DynamoDB
- HCL
- `wscat`

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu `init` command: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_apigatewayv2_integration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- AWS provider `aws_apigatewayv2_stage` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- AWS provider `aws_apigatewayv2_api` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- AWS provider `aws_lambda_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- API Gateway WebSocket route keys documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-route-keys-connect-disconnect.html
- API Gateway WebSocket routing documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html
- API Gateway IAM authorization for WebSocket APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-control-access-iam.html
- API Gateway `@connections` backend usage: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html
- AWS Lambda `AddPermission` API reference: https://docs.aws.amazon.com/lambda/latest/api/API_AddPermission.html
- DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- `wscat` usage documentation: https://github.com/websockets/wscat

## Issues Found
- The post omitted the `aws_lambda_permission` resources required for API Gateway to invoke the Lambda functions behind the `$connect`, `$disconnect`, and `sendMessage` routes. Those permissions were added with `apigateway.amazonaws.com` as the principal, route-scoped `source_arn` values, and Lambda function ARN variables that are distinct from the API Gateway integration `invoke_arn` values.
- The IAM policy resource ARN for `execute-api:ManageConnections` was incorrect. The original snippet omitted the required `POST/@connections` path segment. It was corrected to use `${aws_apigatewayv2_stage.prod.execution_arn}/POST/@connections/*`, which matches the documented ARN format for the callback API.
- The prerequisites were technically incomplete and slightly inconsistent with the body of the tutorial. The post now correctly states that readers need Lambda functions for the WebSocket routes and AWS permissions covering API Gateway, Lambda, DynamoDB, and IAM, rather than requiring a pre-existing DynamoDB table that the tutorial itself creates.
- The introduction said connection IDs let you push messages to clients "at any time." That was narrowed to while the connection remains open, which is how the WebSocket callback API actually behaves.
- The conclusion implied DynamoDB TTL automatically cleans up stale records without qualification. It was adjusted to say TTL eventually cleans them up, which matches AWS documentation that expired items are typically removed within a few days rather than immediately.

## Review Notes
- The route selection expression `$request.body.action` and the `sendMessage` custom route are valid for API Gateway WebSocket routing.
- `aws_apigatewayv2_stage.prod.invoke_url` is a valid stage attribute for WebSocket APIs and resolves to a `wss://.../{stage}` endpoint.
- The `$disconnect` route is a best-effort event in API Gateway, so keeping TTL on the connection table remains a sensible cleanup measure even when a disconnect handler is configured.
- The tutorial does not define a `$default` route. That is acceptable for the shown happy-path example, but unmatched or non-JSON messages will error unless a `$default` route is added.
