# Validation Summary: How to Configure API Gateway CORS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- HCL / OpenTofu configuration
- AWS API Gateway REST API (v1)
- AWS API Gateway HTTP API (v2)
- CORS (Cross-Origin Resource Sharing)

## Sources Consulted
- AWS API Gateway HTTP API CORS documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- AWS API Gateway REST API CORS documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- HashiCorp AWS provider docs for `aws_apigatewayv2_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- HashiCorp AWS provider docs for `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- HashiCorp AWS provider docs for `aws_api_gateway_method_response`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_response
- HashiCorp AWS provider docs for `aws_api_gateway_integration_response`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration_response
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The REST API `aws_api_gateway_integration` example used `request_templates` without `passthrough_behavior`. I added `passthrough_behavior = "NEVER"` because the provider requires a passthrough behavior when request templates are set, and AWS recommends `NEVER` for REST API CORS preflight handling.
- The REST API `aws_api_gateway_integration_response` example did not explicitly depend on the integration resource. I added `depends_on = [aws_api_gateway_integration.options]` to make the example apply reliably, matching the provider documentation note that the integration response depends on the integration existing first.
- The post could be read as if configuring `OPTIONS` alone fully completes REST API CORS, and it stated that HTTP API handles `OPTIONS` automatically without qualification. I clarified that the REST API snippet only handles the preflight request, that actual method responses must also return `Access-Control-Allow-Origin`, and that HTTP API automatic `OPTIONS` handling is true in most cases rather than every routing setup.

## Review Notes
- HTTP APIs with an authorized `$default` route still require an unauthenticated `OPTIONS /{proxy+}` route even when CORS is configured.
- REST APIs that use binary media types such as `*/*` may also need `content_handling = "CONVERT_TO_TEXT"` on the `OPTIONS` integration and integration response.
