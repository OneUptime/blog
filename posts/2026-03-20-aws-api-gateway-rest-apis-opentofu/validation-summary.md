# Validation Summary: How to Create AWS API Gateway REST APIs with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway REST APIs
- AWS Lambda
- Amazon Cognito User Pools
- Amazon CloudWatch Logs
- JSON Schema

## Sources Consulted
- HashiCorp AWS provider docs for `aws_api_gateway_rest_api`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_rest_api.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_integration`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_integration.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_authorizer`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_authorizer.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_method`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_method.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_request_validator`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_request_validator.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_model`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_model.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_deployment`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_deployment.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_stage`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_stage.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_method_settings`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_method_settings.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_usage_plan`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_usage_plan.html.markdown
- HashiCorp AWS provider docs for `aws_api_gateway_account`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_account.html.markdown
- AWS API Gateway docs on request validation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html
- AWS API Gateway docs on access log variables: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-variables-for-access-logging.html
- AWS API Gateway docs on CloudWatch logging setup: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- AWS API Gateway docs on payload compression: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-gzip-compression-decompression.html
- AWS API Gateway docs on usage plans and API keys: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway docs on API key sources: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-key-source.html

## Issues Found
- The `minimum_compression_size` comment was incorrect. It described a request body size limit, but the setting controls the minimum response size that API Gateway compresses. I updated the comment to match the AWS and provider documentation.
- The Lambda integration example was incomplete because API Gateway also needs permission to invoke the Lambda function. I added an `aws_lambda_permission` resource so the example matches the documented Lambda integration pattern.
- The `POST /users` method had request validation configured but no integration, so it would not work as shown. I added a matching `aws_api_gateway_integration` for the `POST` method.
- The request validator was labeled and configured as validating both body and parameters, but the method did not declare any request parameters to validate. I changed the validator to body-only validation so the example reflects actual API Gateway behavior.
- The usage plan and API key example was disconnected from the API methods because no method required an API key. I set `api_key_required = true` on the `POST /users` method so the usage plan example is functionally relevant.
- The deployment trigger hash only covered the GET route resources. That would miss changes to the Cognito authorizer, request validator, model, and POST method/integration. I expanded the trigger inputs so the deployment example better reflects the resources being configured.
- The access log example used `$context.routeKey`, which is not a REST API access log variable. I replaced it with `$context.resourcePath`, which is documented for REST APIs.
- The usage plan comment described `burst_limit` as concurrent requests, which is not how API Gateway defines it. I updated the comments to describe short-term burst capacity and steady-state rate correctly.
- The conclusion said `create_before_destroy` avoids downtime. The provider documentation is more precise: it ensures API Gateway redeployments are ordered correctly and avoids active-stage replacement errors. I corrected that wording.

## Review Notes
- Access logging for REST APIs also requires an account-level CloudWatch role in the target Region, typically configured with `aws_api_gateway_account`. I noted that prerequisite in the stage snippet.
- API Gateway request parameter validation only checks that required headers, query parameters, or path parameters are present and non-blank; it does not validate their type or format.
- Usage plan throttling and quota limits are best-effort controls, not strict cost-control or security boundaries.
