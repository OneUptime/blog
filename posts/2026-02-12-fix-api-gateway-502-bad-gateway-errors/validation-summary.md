# Validation Summary: How to Fix API Gateway 502 Bad Gateway Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- Amazon API Gateway WebSocket APIs
- AWS Lambda proxy integrations
- AWS CLI
- Amazon CloudWatch Logs
- Python
- Node.js

## Sources Consulted
- AWS Lambda documentation: Handling Lambda errors with an API Gateway API - https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-errors.html
- Amazon API Gateway documentation: Lambda proxy integrations in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- Amazon API Gateway documentation: Create AWS Lambda proxy integrations for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- Amazon API Gateway documentation: Quotas for configuring and running an HTTP API - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html
- Amazon API Gateway documentation: Quotas for configuring and running a WebSocket API - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html
- AWS General Reference: Amazon API Gateway endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/apigateway.html
- AWS Lambda API Reference: Invoke - https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
- Amazon API Gateway documentation: Set up CloudWatch logging for REST APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- Amazon API Gateway REST API Reference: Patch Operations - https://docs.aws.amazon.com/apigateway/latest/api/patch-operations.html
- AWS CLI Command Reference: apigateway get-integration - https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-integration.html
- AWS CLI Command Reference: apigatewayv2 get-integration - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/get-integration.html
- AWS announcement: Amazon API Gateway integration timeout limit increase beyond 29 seconds - https://aws.amazon.com/about-aws/whats-new/2024/06/amazon-api-gateway-integration-timeout-limit-29-seconds/

## Issues Found
- The Lambda proxy response format was presented as universally required for all API Gateway Lambda proxy integrations. Updated it to specify REST APIs and HTTP APIs using payload format version 1.0, and added the HTTP API payload format version 2.0 nuance that API Gateway can infer responses from valid JSON.
- The timeout section said API Gateway returns a 502 when Lambda exceeds the API Gateway timeout and that the 29-second REST API limit cannot be increased. Updated it to explain that integration timeouts usually return 504, HTTP APIs have a 30-second maximum, and Regional/private REST APIs can request a timeout increase beyond 29 seconds with possible throttle quota tradeoffs.
- The response size section listed WebSocket API as 128 KB per frame. Updated it to 128 KB per message with a 32 KB frame size.
- The response size section only mentioned API Gateway's 10 MB payload limit. Added the Lambda synchronous invocation response limit of 6 MB for Lambda proxy integrations and adjusted the sample threshold accordingly.
- The Python size-checking example used `sys.getsizeof`, which is not an accurate wire-size check for the JSON response body. Replaced it with `len(response_body.encode('utf-8'))` and removed the unused `sys` import.
- The REST API stage logging command used `/accessLogSetting/destinationArn`, but the supported patch path is `/accessLogSettings/destinationArn`. Corrected the path and added an access log format, which API Gateway requires for access logging.
- The CloudWatch Logs search example used a nonstandard execution log group path. Updated it to the documented REST API execution log group naming pattern.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI commands were verified against the current official AWS CLI command reference instead of local `--help` output.
- API Gateway execution logging requires the account-level CloudWatch Logs role to be configured; the post's command focuses on stage settings.
