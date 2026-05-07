# Validation Summary: How to Create API Gateway Stages with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway REST API
- AWS API Gateway stages
- AWS CloudWatch Logs
- AWS IAM
- HCL

## Sources Consulted
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu lifecycle meta-arguments: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- Terraform AWS provider `aws_api_gateway_deployment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment
- Terraform AWS provider `aws_api_gateway_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform AWS provider `aws_api_gateway_method_settings`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Terraform AWS provider `aws_api_gateway_account`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_account
- Terraform AWS provider `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Amazon API Gateway stage documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-stages.html
- Amazon API Gateway canary deployments: https://docs.aws.amazon.com/apigateway/latest/developerguide/canary-release.html
- Amazon API Gateway create canary deployment: https://docs.aws.amazon.com/apigateway/latest/developerguide/create-canary-deployment.html
- Amazon API Gateway CloudWatch logging: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- Amazon API Gateway access log settings: https://docs.aws.amazon.com/apigateway/latest/api/API_AccessLogSettings.html
- Amazon API Gateway caching: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html
- Amazon API Gateway throttling: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html

## Issues Found
- The prerequisites said the post applied to an existing REST API or HTTP API, but the resources used throughout the article are the REST API v1 resources (`aws_api_gateway_*`), not the HTTP API v2 resources (`aws_apigatewayv2_*`). I changed the prerequisite to REST API only.
- The deployment example created `aws_api_gateway_deployment` without defining any API resource, method, or integration in the snippet. I added a minimal `health` resource, `GET` method, and `MOCK` integration so the deployment example matches the provider's supported pattern.
- The stage example enabled `access_log_settings` but omitted the required log `format` and referenced an undefined CloudWatch log group. I added a log group and a valid JSON log format including `$context.requestId`, which AWS requires in access log formats.
- The `default_route_settings` block was invalid for `aws_api_gateway_stage`; that argument belongs to API Gateway v2 stage resources. I removed it and added `cache_cluster_enabled` and `cache_cluster_size`, which are the relevant REST API stage settings for method caching.
- The method settings example enabled execution logging, but the article did not configure the account-level CloudWatch role required by API Gateway. I added `aws_api_gateway_account`, an IAM role, and the AWS-managed CloudWatch logging policy attachment, and made the dependent resources wait for that configuration.
- The canary example tried to create a second stage with `stage_name = "prod"`, which would conflict with the existing production stage. I changed the example to create a separate canary deployment and update the existing `prod` stage with `canary_settings`.
- The throttling burst limit comment described the value as "max concurrent requests". I adjusted that wording to "burst capacity" to align with AWS throttling terminology.
- The deployment trigger comment overstated what the ID-based hash detects. I narrowed the wording so it no longer implies that this pattern catches every possible API change.

## Review Notes
- The post is now technically aligned with API Gateway REST API stage resources. Readers should not reuse these examples for HTTP APIs; those use the separate `aws_apigatewayv2_*` resource family and different arguments such as `default_route_settings`.
- The `triggers` pattern used for deployments matches the provider documentation's Terraform-resources example, but the provider docs note that ID-based hashes do not detect every future in-place API change. Hashing an OpenAPI `body` or broader resource content is a stronger pattern when applicable.
- I could not run `tofu validate` locally because the `tofu` binary is not installed in this environment. The review and fixes were verified against the official OpenTofu, AWS, and AWS provider documentation instead.
