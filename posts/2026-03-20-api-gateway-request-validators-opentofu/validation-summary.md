# Validation Summary: How to Configure API Gateway Request Validators with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway REST APIs
- API Gateway request validators
- API Gateway request models
- JSON Schema draft 4
- HCL
- curl

## Sources Consulted
- AWS API Gateway Developer Guide: Request validation for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html
- AWS API Gateway Developer Guide: Set up basic request validation in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-validation-set-up.html
- AWS API Gateway Developer Guide: Data models for REST APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/models-mappings-models.html
- AWS API Gateway Developer Guide: Deploy REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-deploy-api.html
- OpenTofu documentation: Resource Blocks - https://opentofu.org/docs/language/resources/syntax/
- OpenTofu documentation: `jsonencode` function - https://opentofu.org/docs/language/functions/jsonencode/
- Terraform AWS provider docs source: `aws_api_gateway_request_validator` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_request_validator.html.markdown
- Terraform AWS provider docs source: `aws_api_gateway_method` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_method.html.markdown
- Terraform AWS provider docs source: `aws_api_gateway_model` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_model.html.markdown

## Issues Found
- The introduction described request validators as rejecting broadly "malformed" requests. AWS documents narrower behavior: request-parameter validation checks that required URI, query string, and header parameters are present and not blank, while body validation checks the request payload against the configured model schema. I updated the introduction to reflect that documented behavior.
- The `Link the Model to the Method` section repeated `resource "aws_api_gateway_method" "post_order"` as if it were a second standalone resource. OpenTofu requires each resource type and local name to be unique within a module, so I changed that section to show updating the same method resource and included both `request_parameters` and `request_models` in the final example.

## Review Notes
- The post correctly uses API Gateway REST API resources (`aws_api_gateway_*`), not API Gateway v2 (`apigatewayv2`) resources.
- The request model example correctly uses JSON Schema draft 4, which is what API Gateway REST API models support.
- The `request_models` mapping correctly uses the model `name`, and `request_validator_id` correctly references the validator resource ID.
- The `curl` examples assume the REST API has been deployed or redeployed to a stage after these method, model, and validator changes.
