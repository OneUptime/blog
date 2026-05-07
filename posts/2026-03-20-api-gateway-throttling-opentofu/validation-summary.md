# Validation Summary: How to Configure API Gateway Throttling with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway REST APIs
- AWS API Gateway Usage Plans and API Keys
- AWS CLI
- HCL

## Sources Consulted
- AWS API Gateway throttling for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
- AWS API Gateway quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
- AWS API Gateway usage plans and API keys: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway API key setup: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-setup-api-keys.html
- AWS API Gateway stage configuration: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-stages.html
- AWS CLI `apigateway get-usage`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-usage.html
- Terraform AWS provider `aws_api_gateway_method_settings`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Terraform AWS provider `aws_api_gateway_api_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_api_key
- Terraform AWS provider `aws_api_gateway_usage_plan`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan
- Terraform AWS provider `aws_api_gateway_usage_plan_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan_key

## Issues Found
- The introduction stated fixed account-level defaults of `10,000 RPS` and `5,000 burst`. I changed this to a region-aware description because AWS documents `10,000 RPS` as typical, `2,500 RPS` in some Regions, and notes that burst quota is determined by API Gateway.
- The introduction said throttled requests include a `Retry-After` header. I removed that claim because the REST API throttling docs clearly document `429 Too Many Requests` responses, but not that header for invoke traffic.
- The post described method API key enforcement as `authorization = "API_KEY"`. I corrected this to `api_key_required = true`, which is the documented way to require an API key on a REST API method.
- The usage-plan comments implied strict enforcement. I updated them to describe throttling and quotas as targets, matching AWS guidance that they are applied on a best-effort basis.
- The throttling test loop sent requests sequentially, which may not trigger the configured limits. I changed it to send concurrent requests and aligned the path with the example `reports/GET` method override.
- The conclusion recommended monitoring `ThrottledRequests`, which is not listed in the API Gateway REST API CloudWatch metrics documentation. I changed this to `4XXError` and `5XXError`, with `429` called out explicitly under `4XXError`.

## Review Notes
- The post correctly uses REST API resources (`aws_api_gateway_*`), not HTTP API (`apigatewayv2`) resources.
- The examples assume the REST API, deployment, and methods already exist elsewhere in the OpenTofu configuration.
- AWS notes that usage plan updates and API key associations can take a few minutes to propagate, which may affect immediate testing after `tofu apply`.
