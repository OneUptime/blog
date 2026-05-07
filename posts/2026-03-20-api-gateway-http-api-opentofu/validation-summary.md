# Validation Summary: How to Create API Gateway HTTP API with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS API Gateway HTTP APIs
- AWS Lambda
- Amazon Cognito JWT authorizers
- Amazon CloudWatch Logs
- HCL / AWS provider resources

## Sources Consulted
- AWS API Gateway: Choose between REST APIs and HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- AWS API Gateway: API Gateway HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html
- AWS API Gateway: Control access to HTTP APIs with JWT authorizers - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS API Gateway: Create AWS Lambda proxy integrations for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS API Gateway: Configure logging for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- AWS API Gateway: Customize HTTP API access logs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- OpenTofu CLI: `tofu output` - https://opentofu.org/docs/cli/commands/output/
- AWS provider docs: `aws_apigatewayv2_api` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_api.html.markdown
- AWS provider docs: `aws_apigatewayv2_integration` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_integration.html.markdown
- AWS provider docs: `aws_apigatewayv2_route` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_route.html.markdown
- AWS provider docs: `aws_apigatewayv2_authorizer` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_authorizer.html.markdown
- AWS provider docs: `aws_apigatewayv2_stage` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_stage.html.markdown
- AWS provider docs: `aws_lambda_permission` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- AWS Compute Blog: Building faster, lower cost, better APIs - HTTP APIs now generally available - https://aws.amazon.com/blogs/compute/building-better-apis-http-apis-now-generally-available/

## Issues Found
- The introduction said HTTP APIs have "up to 71% lower cost and 60% lower latency." AWS's published comparison states HTTP APIs are at least 71% lower cost and offer up to 60% lower latency, so the wording was corrected to match the source more closely.
- The feature comparison incorrectly listed request/response transformations as a REST-only capability in a blanket way. AWS documents that HTTP APIs support request parameter transformation, so the sentence was corrected to use features AWS explicitly calls out as REST-only or missing from HTTP APIs: API keys, usage plans and per-client throttling, request validation, private API endpoints, and caching.
- The prerequisites omitted CloudWatch Logs permissions even though the post configures access logging on the stage. The prerequisites were updated to include CloudWatch Logs permissions.
- The Lambda integration example included commented VPC link settings directly under a Lambda integration. VPC links apply to private HTTP integrations, not Lambda proxy integrations, so the misleading commented lines were removed.
- The test `curl` command hardcoded a `us-east-1` execute-api hostname even though the post otherwise parameterizes region and already defines an output for the stage invoke URL. The command was updated to use `tofu output -raw api_endpoint` so it matches the actual deployed endpoint.
- The conclusion's `auto_deploy` recommendation was stricter than the example configuration. The wording was softened to "consider disabling it for production" so it aligns with the sample while preserving the deployment-timing caveat.

## Review Notes
- The `$default` route in the example remains unauthenticated. That is valid configuration, but if the intent is to require JWTs on every unmatched route as well, the same `authorization_type` and `authorizer_id` should be added to the `$default` route.
- The post assumes you already have a CloudWatch Logs log group ARN available in `var.cloudwatch_log_group_arn`; it does not include the log group resource itself.
