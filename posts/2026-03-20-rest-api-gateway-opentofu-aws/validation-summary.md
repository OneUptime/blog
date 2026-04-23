# Validation Summary: REST API Gateway with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS API Gateway REST API
- AWS Lambda proxy integrations
- AWS Lambda authorizers
- AWS Lambda permissions
- API Gateway CORS configuration
- API Gateway deployments and stages
- API Gateway custom domains
- CloudWatch access logging
- OpenTofu / Terraform HCL
- HashiCorp AWS provider

## Sources Consulted
- OpenTofu strings and templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `jsonencode` function documentation: https://opentofu.org/docs/language/functions/jsonencode/
- HashiCorp AWS provider `aws_api_gateway_rest_api` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_rest_api.html.markdown
- HashiCorp AWS provider `aws_api_gateway_method` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_method.html.markdown
- HashiCorp AWS provider `aws_api_gateway_integration` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_integration.html.markdown
- HashiCorp AWS provider `aws_api_gateway_method_response` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_method_response.html.markdown
- HashiCorp AWS provider `aws_api_gateway_integration_response` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_integration_response.html.markdown
- HashiCorp AWS provider `aws_api_gateway_deployment` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_deployment.html.markdown
- HashiCorp AWS provider `aws_api_gateway_stage` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_stage.html.markdown
- HashiCorp AWS provider `aws_api_gateway_authorizer` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_authorizer.html.markdown
- HashiCorp AWS provider `aws_api_gateway_domain_name` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_domain_name.html.markdown
- HashiCorp AWS provider `aws_api_gateway_base_path_mapping` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_base_path_mapping.html.markdown
- HashiCorp AWS provider `aws_lambda_permission` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- HashiCorp AWS provider `aws_lambda_function` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- AWS API Gateway CORS for REST APIs documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- AWS API Gateway mock integrations documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html
- AWS API Gateway CloudWatch logging documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- AWS API Gateway REST API vs HTTP API documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html

## Issues Found
- The CORS mock integration used `request_templates` without `passthrough_behavior`, which the AWS provider documentation marks as required when request templates are used. I added `passthrough_behavior = "NEVER"`, matching AWS REST API CORS guidance.
- The CORS section declared method response headers but did not configure an integration response to return actual `Access-Control-Allow-*` header values. I added an `aws_api_gateway_integration_response` with static header mappings and an explicit dependency on the mock integration.
- The CORS section did not mention that Lambda proxy integrations must return CORS headers on actual responses. I added a short note after the snippet.
- The deployment trigger hash covered only the GET `/users` resources, so CORS changes would not force an API redeployment. I added the OPTIONS method, integration, method response, and integration response to the trigger hash.
- The stage access log configuration omitted the required `format` field. I added a JSON access log format containing `$context.requestId` and `$context.extendedRequestId`, consistent with AWS logging guidance.
- The stage logging example did not call out that API Gateway needs a CloudWatch role configured for the account and Region. I added a short note after the stage snippet.
- The `api_endpoint` output used interpolation-only syntax. I updated it to the current direct expression form.

## Review Notes
- The snippets still assume supporting resources such as Lambda functions, IAM roles, ACM certificates, and CloudWatch log groups exist elsewhere in the configuration.
- `tofu` and `terraform` were not installed locally, so validation was performed against official documentation rather than by running a local formatter or plan.
