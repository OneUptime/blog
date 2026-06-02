# Validation Summary: How to Fix API Gateway 504 Gateway Timeout Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- Amazon API Gateway WebSocket APIs
- AWS Lambda
- AWS Step Functions
- Amazon SQS
- Amazon DynamoDB
- Amazon CloudWatch
- AWS CLI
- Python and Boto3
- JavaScript WebSocket client API

## Sources Consulted
- Amazon API Gateway REST API quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html
- Amazon API Gateway service quotas: https://docs.aws.amazon.com/general/latest/gr/apigateway.html
- AWS announcement for REST API integration timeout increases: https://aws.amazon.com/about-aws/whats-new/2024/06/amazon-api-gateway-integration-timeout-limit-29-seconds
- AWS CLI `apigateway get-integration`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-integration.html
- AWS CLI `apigateway update-integration`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-integration.html
- AWS CLI `apigatewayv2 get-integration`: https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/get-integration.html
- AWS CLI `apigatewayv2 update-integration`: https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/update-integration.html
- AWS CLI `logs filter-log-events`: https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html
- AWS Lambda timeout documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- Boto3 Lambda `invoke`: https://docs.aws.amazon.com/boto3/latest/reference/services/lambda/client/invoke.html
- AWS Step Functions Task state documentation: https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS CLI `stepfunctions create-state-machine`: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/create-state-machine.html
- Boto3 SQS `send_message`: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/send_message.html
- API Gateway CloudWatch metrics and dimensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- API Gateway gateway response types: https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html
- API Gateway WebSocket APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html

## Issues Found
- The post incorrectly stated that API Gateway REST API integration timeouts cannot be increased beyond 29 seconds. AWS now allows quota increases above 29 seconds for Regional and private REST APIs, though not for edge-optimized REST APIs. Updated the timeout explanation, description, and summary to reflect current AWS documentation.
- The first Python Lambda example used `json.dumps()` without importing `json`, and returned undefined `partial_result` and `result` variables. Added the missing import and assigned example values from `response.json()`.
- The async job submission example used `time.time()` without importing `time`. Added the missing import.
- Several statements described 29 seconds as the universal limit. Updated those to refer to the configured API Gateway integration timeout.

## Review Notes
The AWS CLI examples and service patterns are broadly accurate. The REST API update command sets the default 29-second maximum; deployments using a higher Regional/private REST API quota would need to set the account-allowed timeout value instead. The async examples are illustrative and omit production concerns such as idempotency, retries, DLQs, authentication, and DynamoDB table/key definitions.
