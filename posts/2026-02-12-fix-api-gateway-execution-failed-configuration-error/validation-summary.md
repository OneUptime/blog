# Validation Summary: How to Fix API Gateway 'Execution failed due to configuration error'

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon API Gateway REST APIs
- AWS Lambda
- AWS CLI
- CloudWatch Logs
- Velocity Template Language mapping templates

## Sources Consulted
- AWS API Gateway documentation: Lambda proxy integrations and required output format: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- AWS CLI documentation: `aws apigateway put-integration`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- AWS CLI documentation: `aws lambda add-permission`: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS API Gateway documentation: stage variables for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html
- AWS CLI documentation: `aws apigateway update-stage`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-stage.html
- AWS API Gateway documentation: CloudWatch logging for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html

## Issues Found
- The introduction said the error always meant an integration misconfiguration and not application code. This was inaccurate for `Malformed Lambda proxy response`, which AWS documents as a Lambda proxy output-format problem that returns `502 Bad Gateway` when the response shape is wrong. Updated the wording to distinguish integration misconfiguration from a Lambda response-contract failure and changed the endpoint error wording from only `500` to `500 or 502`.
- The broken mapping template example said it was missing a closing brace, but the actual syntax issue shown was a missing comma between JSON properties. Updated the comment to match the example.
- The stage variable fix used a JSON Patch `replace` operation while describing a missing variable. Changed it to `add`, which is the correct operation for adding a missing stage variable with `update-stage`.
- The debugging section omitted the CloudWatch Logs role prerequisite for REST API execution logging. Added a short note that the API Gateway account must have a CloudWatch Logs role configured in the Region.
- The checklist said to always redeploy after making changes. AWS notes that stage settings and stage variables do not require redeployment, while integration/resource/method changes do. Updated the checklist item to make that distinction.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI command validation was performed against the current official AWS CLI documentation rather than local `--help` output.
