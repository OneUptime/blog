# Validation Summary: How to Fix API Gateway 403 Forbidden Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon API Gateway REST APIs
- AWS IAM and Signature Version 4
- API Gateway API keys and usage plans
- API Gateway resource policies
- AWS WAF
- Lambda authorizers
- CloudWatch Logs
- AWS CloudTrail
- AWS CLI
- Python boto3, botocore, and requests

## Sources Consulted
- AWS re:Post Knowledge Center, Troubleshoot HTTP 403 errors from API Gateway: https://repost.aws/knowledge-center/api-gateway-troubleshoot-403-forbidden
- AWS re:Post Knowledge Center, Resolve API Gateway REST API 403 "Missing Authentication Token" errors: https://repost.aws/knowledge-center/api-gateway-authentication-token-errors
- Amazon API Gateway Developer Guide, Choose an API key source in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-key-source.html
- Amazon API Gateway Developer Guide, Usage plans and API keys for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- Amazon API Gateway Developer Guide, Control access for invoking an API: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
- Amazon API Gateway Developer Guide, How API Gateway resource policies affect authorization workflow: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-authorization-flow.html
- Amazon API Gateway Developer Guide, Private REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html
- Amazon API Gateway Developer Guide, Set up CloudWatch logging for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- Amazon API Gateway Developer Guide, Logging Amazon API Gateway API calls using AWS CloudTrail: https://docs.aws.amazon.com/apigateway/latest/developerguide/cloudtrail.html
- Amazon API Gateway Developer Guide, Invoke REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-call-api.html
- AWS WAFV2 CLI Command Reference, get-web-acl-for-resource: https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-web-acl-for-resource.html
- Amazon API Gateway CLI Command Reference, get-usage: https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-usage.html
- Amazon API Gateway Developer Guide, Throttle requests to your REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html

## Issues Found
- The description and "Usage Plan Throttling" section implied usage-plan throttling can cause API Gateway 403 responses. AWS documents throttling as returning 429 Too Many Requests. I changed the section to clarify that throttling and quota exhaustion return 429, while disabled, invalid, missing, or improperly associated API keys can return 403.
- The debugging checklist said to check CloudTrail for execute-api events. CloudTrail documents API Gateway management events and service API calls, not normal client invocation logs for troubleshooting each request. I changed this to checking CloudTrail for API Gateway configuration changes, IAM policy changes, and resource policy changes.

## Review Notes
The post focuses on REST APIs, which matches the `aws apigateway` commands and execution logging examples. HTTP APIs use `apigatewayv2` commands and don't support REST API execution logging, so a future revision could call out the REST API scope explicitly.
