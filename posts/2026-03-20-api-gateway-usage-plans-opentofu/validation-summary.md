# Validation Summary: How to Configure API Gateway Usage Plans with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS API Gateway REST APIs
- API Gateway usage plans
- API Gateway API keys
- Amazon CloudWatch
- AWS CLI
- HashiCorp AWS provider

## Sources Consulted
- AWS API Gateway Developer Guide: Usage plans and API keys for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway Developer Guide: Set up API keys for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-setup-api-keys.html
- AWS API Gateway Developer Guide: Amazon API Gateway dimensions and metrics - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- AWS CLI Command Reference: `get-api-key` - https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-api-key.html
- AWS CLI Command Reference: `get-usage` - https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-usage.html
- Terraform Registry: `aws_api_gateway_usage_plan` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan
- Terraform Registry: `aws_api_gateway_api_key` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_api_key.html
- Terraform Registry: `aws_api_gateway_usage_plan_key` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_usage_plan_key
- Terraform Registry: `aws_api_gateway_method` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method.html
- Terraform Registry: `aws_api_gateway_deployment` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment.html
- OpenTofu documentation: Getting started - https://opentofu.org/docs/intro/

## Issues Found
- The post set `api_key_required = true` on a REST API method without noting that the API must be redeployed for the change to take effect. I added that requirement after the method example because AWS documents that method changes need a new deployment before callers see them.
- The CloudWatch alarm used `statistic = "Sum"` for the API Gateway `Count` metric and described the alarm as tracking usage-plan quota consumption. I changed the statistic to `SampleCount`, renamed the example to reflect stage-level traffic monitoring, and clarified that the `Count` metric tracks total request volume for the API stage rather than per-API-key or per-usage-plan usage.
- The conclusion described usage-plan throttling and quotas as if they were hard-enforced limits. I updated the wording to reflect AWS guidance that usage-plan throttling and quotas are applied on a best-effort basis rather than as guaranteed hard limits.

## Review Notes
- The HCL resource names and arguments used for `aws_api_gateway_usage_plan`, `aws_api_gateway_api_key`, `aws_api_gateway_usage_plan_key`, and `aws_api_gateway_method` are consistent with current AWS provider documentation.
- The AWS CLI example for `aws apigateway get-api-key --api-key <key-id> --include-value --query 'value' --output text` is valid according to the current AWS CLI v2 reference.
- Usage plans in API Gateway apply to REST APIs, which matches the post's stated prerequisite of an existing REST API and deployed stage.
- `tofu` and `aws` CLIs were not installed in the local review environment, so command validation was performed against official documentation rather than local `--help` output.
