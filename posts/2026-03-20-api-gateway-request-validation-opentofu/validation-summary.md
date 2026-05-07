# Validation Summary: How to Configure API Gateway Request Validation with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway REST APIs
- JSON Schema Draft 4
- HCL
- cURL

## Sources Consulted
- OpenTofu CLI `init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply`: https://opentofu.org/docs/cli/commands/apply/
- API Gateway request validation for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html
- API Gateway request-validation setup guide: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-validation-set-up.html
- API Gateway method requests and request models: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html
- API Gateway data models for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/models-mappings-models.html
- API Gateway gateway responses: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-gatewayResponse-definition.html
- API Gateway gateway response types: https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html
- API Gateway mapping template variable reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
- API Gateway deployment requirements for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-deploy-api.html
- API Gateway update types that require redeployment: https://docs.aws.amazon.com/apigateway/latest/developerguide/updating-api.html
- Terraform AWS provider `aws_api_gateway_request_validator`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_request_validator.html.markdown
- Terraform AWS provider `aws_api_gateway_model`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_model.html.markdown
- Terraform AWS provider `aws_api_gateway_method`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_method.html.markdown
- Terraform AWS provider `aws_api_gateway_gateway_response`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_gateway_response.html.markdown
- Terraform AWS provider `aws_api_gateway_deployment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_deployment.html.markdown
- Terraform AWS provider `aws_api_gateway_stage`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_stage.html.markdown

## Issues Found
- The original deployment step implied that `tofu apply` was enough before invoking the endpoint. For API Gateway REST APIs, AWS requires redeployment after updates to resources such as `Method`, `Model`, `RequestValidator`, and `GatewayResponse`. I added `aws_api_gateway_deployment` and `aws_api_gateway_stage` examples plus a note for users who manage stages elsewhere.
- The original request-body validation explanation omitted that API Gateway validates a body only when the request `Content-Type` matches a configured request model. I added that caveat and noted that `$default` can be used to validate regardless of content type.

## Review Notes
- No other technical issues were found in the HCL resources, JSON Schema keywords, gateway response types, or `curl` examples after the deployment clarification was added.
- The post correctly targets API Gateway REST APIs by using `aws_api_gateway_*` resources rather than `aws_apigatewayv2_*` resources.
- The local workspace did not have the `tofu` CLI installed, so command verification was done against the official OpenTofu CLI documentation rather than local `--help` output.
