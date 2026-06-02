# Validation Summary: How to Fix API Gateway 'Missing Authentication Token' Error

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- AWS IAM authorization and SigV4 signing
- AWS CLI for API Gateway
- CORS preflight configuration
- API Gateway custom domain mappings
- Python boto3/botocore request signing

## Sources Consulted
- AWS API Gateway Developer Guide: Invoke REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-call-api.html
- AWS API Gateway Developer Guide: Deploy REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-deploy-api.html
- AWS API Gateway Developer Guide: CORS for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- AWS API Gateway Developer Guide: Control access to a REST API with IAM permissions - https://docs.aws.amazon.com/apigateway/latest/developerguide/permissions.html
- AWS IAM User Guide: AWS Signature Version 4 for API requests - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
- AWS API Gateway Developer Guide: Stages for HTTP APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html
- AWS API Gateway Developer Guide: Use API mappings to connect API stages to a custom domain name for REST APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-mappings.html
- AWS CLI Command Reference: apigateway get-resources - https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-resources.html
- AWS CLI Command Reference: apigateway get-base-path-mappings - https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-base-path-mappings.html
- AWS CLI Command Reference: apigateway put-integration - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- AWS CLI Command Reference: apigateway put-method-response - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-method-response.html
- AWS CLI Command Reference: apigateway put-integration-response - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration-response.html
- AWS CLI Command Reference: apigateway put-gateway-response - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-gateway-response.html
- AWS CLI Command Reference: apigateway update-stage - https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-stage.html
- AWS re:Post Knowledge Center: Resolve API Gateway REST API 403 "Missing Authentication Token" errors - https://repost.aws/knowledge-center/api-gateway-authentication-token-errors

## Issues Found
- The opening explanation was too narrow because the error can also occur when IAM authorization is enabled and the request is unsigned. Updated the wording to include that case while keeping route mismatch as the common explanation.
- The signed request section said "Using the AWS CLI" before showing `awscurl`, which is a third-party command-line tool, not the AWS CLI. Changed the wording to "From the command line."
- The CORS mock `OPTIONS` integration omitted `--passthrough-behavior NEVER`, which AWS documents as part of REST API non-proxy CORS preflight setup. Added the option.
- The CORS response header example used a minimal `Access-Control-Allow-Headers` and method list. Updated it to the common header and method values from AWS's REST API CORS documentation.
- The `put-gateway-response DEFAULT_4XX` example was described as an easier replacement for configuring `OPTIONS`. Gateway responses only add headers to API Gateway-generated errors; they do not create a preflight route. Reworded the paragraph to make its purpose clear.

## Review Notes
The post focuses on REST API commands under `aws apigateway`. HTTP APIs use the `apigatewayv2` command namespace for management operations, and HTTP API deployment behavior can differ when automatic deployments are enabled. The post's HTTP API URL note is correct for a `$default` stage, but future revisions could make named HTTP stages more explicit.
