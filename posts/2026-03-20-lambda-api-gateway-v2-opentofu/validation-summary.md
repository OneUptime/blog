# Validation Summary: How to Deploy Lambda with API Gateway v2 Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon API Gateway v2 (HTTP APIs)
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch Logs
- HCL

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- AWS provider docs for `aws_apigatewayv2_api`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v6.39.0/website/docs/r/apigatewayv2_api.html.markdown
- AWS provider docs for `aws_apigatewayv2_integration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v6.39.0/website/docs/r/apigatewayv2_integration.html.markdown
- AWS provider docs for `aws_apigatewayv2_stage`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v6.39.0/website/docs/r/apigatewayv2_stage.html.markdown
- AWS provider docs for `aws_lambda_permission`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v6.39.0/website/docs/r/lambda_permission.html.markdown
- Create AWS Lambda proxy integrations for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- Stages for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html
- Configure logging for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- Quotas for configuring and running an HTTP API in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html
- Troubleshooting issues with HTTP API Lambda integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-troubleshooting-lambda.html
- Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Configure Lambda function timeout: https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html

## Issues Found
- The `aws_apigatewayv2_integration` example was missing `integration_method`. The AWS provider requires `integration_method` for non-`MOCK` integrations, so I added `integration_method = "POST"` for the Lambda proxy integration.
- The `aws_apigatewayv2_stage.access_log_settings` block was incomplete. Access logging requires both `destination_arn` and `format`, and the format must include `$context.requestId`. I added a valid JSON-encoded access log format.
- The inline comment on the `$default` stage was misleading. `$default` serves traffic from the API root URL, while `auto_deploy = true` is what enables automatic deployments. I corrected the comment.
- The best-practices section used the wrong timeout limit for HTTP APIs. API Gateway HTTP APIs have a 30-second maximum integration timeout, not 29 seconds. I corrected the guidance and set the example Lambda timeout to 29 seconds so the function times out before the HTTP API limit.

## Review Notes
- `nodejs20.x` is still supported as of 2026-04-29, but AWS lists its deprecation date as 2026-04-30. The post is technically valid today, but this runtime should be updated soon to avoid near-term staleness.
- The post pins `hashicorp/aws` to `~> 5.30`. The reviewed arguments are still valid in the latest provider documentation I checked, but the version constraint is older than the current provider release.
