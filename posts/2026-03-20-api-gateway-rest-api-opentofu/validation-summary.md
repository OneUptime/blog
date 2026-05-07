# Validation Summary: How to Create REST API Gateway with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS API Gateway REST API
- AWS Lambda
- Amazon CloudWatch Logs
- AWS X-Ray

## Sources Consulted
- OpenTofu CLI `init`: https://opentofu.org/docs/cli/init/
- OpenTofu CLI `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply`: https://opentofu.org/docs/cli/commands/apply/
- Terraform AWS provider `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- Terraform AWS provider `aws_api_gateway_deployment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment
- Terraform AWS provider `aws_api_gateway_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS API Gateway CORS for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- AWS API Gateway ARN format reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/arn-format-reference.html
- AWS API Gateway CloudWatch logging for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- AWS API `AccessLogSettings` reference: https://docs.aws.amazon.com/apigateway/latest/api/API_AccessLogSettings.html

## Issues Found
- The Lambda permission `source_arn` was incomplete: it ended at `/*/*`, but API Gateway execute-api ARNs include `stage/http-method/resource-path`. I updated it to include the `/users` resource path and GET method so the permission matches the actual invocation ARN shape.
- The mock `OPTIONS` integration used `request_templates` without `passthrough_behavior`. The AWS provider documents `passthrough_behavior` as required when `request_templates` is set, and AWS CORS guidance for REST APIs recommends `NEVER` for the preflight mock integration. I added `passthrough_behavior = "NEVER"`.
- The CORS section implied that creating the `OPTIONS` method alone was sufficient. For Lambda proxy integrations, AWS documents that the backend must also return `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`. I added that note directly in the code example comments.
- The deployment trigger only referenced the GET path resources, so the deployment did not reliably capture the CORS resources. I updated the trigger hash to include the OPTIONS method, mock integration, method response, and integration response resources as well.
- The stage `access_log_settings` block omitted the required `format` field. I added a valid JSON log format that includes `$context.requestId`, which AWS requires in access logs.
- The prerequisites omitted the account-level API Gateway CloudWatch Logs role requirement needed when enabling access logging. I added that prerequisite.

## Review Notes
- The deployment trigger now hashes full resource objects instead of only resource IDs. This is a known pattern from the provider documentation to better capture API configuration changes; it can cause a one-time diff after the initial apply and then stabilizes.
- The `curl` example uses `us-east-1` as an example region. Readers still need to substitute their actual API ID and deployed AWS Region.
