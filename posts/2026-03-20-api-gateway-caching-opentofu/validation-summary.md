# Validation Summary: How to Configure API Gateway Caching with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- AWS API Gateway REST APIs
- AWS API Gateway stage and method caching
- AWS API Gateway integration cache keys
- AWS CLI
- Amazon CloudWatch Logs and CloudWatch metrics

## Sources Consulted
- OpenTofu CLI commands overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/cli/commands/apply/
- Terraform Registry `aws_api_gateway_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform Registry `aws_api_gateway_method_settings`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Terraform Registry `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- API Gateway caching for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html
- API Gateway `MethodSetting` API reference: https://docs.aws.amazon.com/apigateway/latest/api/API_MethodSetting.html
- API Gateway CloudWatch logging for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- AWS CLI `flush-stage-cache`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/flush-stage-cache.html
- API Gateway metrics and dimensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html

## Issues Found
- The `access_log_settings` block in the `aws_api_gateway_stage` example omitted the required `format` field. I added a valid JSON log format that includes request IDs so the resource configuration is complete.
- The post used `require_authorization_caching`, which is not a valid `aws_api_gateway_method_settings` argument. I replaced it with `require_authorization_for_cache_control`, which is the documented setting for cache invalidation authorization.
- The `method_path` example for `users/{userId}` used `users~1{userId}/GET`, which matches AWS patch path escaping rather than the Terraform/OpenTofu provider’s documented `{resource_path}/{http_method}` format. I corrected it to `users/{userId}/GET`.
- The AWS CLI note said `flush-stage-cache` invalidates cache for a specific method. The command actually flushes the entire stage cache, so I corrected the description.
- The conclusion referenced “cache eviction metrics,” but the AWS documentation points users to `CacheHitCount` and `CacheMissCount` for cache tuning. I updated the guidance to use the documented metrics.
- The introduction claimed a specific latency reduction range that AWS documentation does not guarantee. I softened that statement to a general latency improvement claim.

## Review Notes
- API Gateway caching in this post applies to REST APIs, not HTTP APIs.
- Stage-level caching must be provisioned before method-level caching becomes active, and only `GET` methods are cached by default unless you add method overrides.
- API Gateway caching is best-effort, and the maximum cacheable response size is 1,048,576 bytes.
- The `tofu` and `aws` CLIs were not installed in the workspace, so command validation was done against official documentation rather than local `--help` output.
