# Validation Summary: How to Configure API Gateway VPC Link with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway
- API Gateway VPC Link
- Amazon VPC
- Elastic Load Balancing
- Network Load Balancer

## Sources Consulted
- AWS API Gateway: Create private integrations for HTTP APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html
- AWS API Gateway: Set up VPC links V2 in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-vpc-links-v2.html
- AWS API Gateway: Private integrations for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/private-integration.html
- AWS API Gateway: Transform API requests and responses for HTTP APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-parameter-mapping.html
- OpenTofu CLI overview - https://opentofu.org/docs/cli/commands/
- OpenTofu init command - https://opentofu.org/docs/cli/init/
- OpenTofu plan command - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command - https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform AWS provider docs source for `aws_api_gateway_vpc_link` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_vpc_link.html.markdown
- Terraform AWS provider docs source for `aws_apigatewayv2_vpc_link` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_vpc_link.html.markdown
- Terraform AWS provider docs source for `aws_apigatewayv2_integration` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_integration.html.markdown
- Terraform AWS provider docs source for `aws_api_gateway_integration` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_integration.html.markdown

## Issues Found
- The introduction stated that HTTP API VPC Links use AWS PrivateLink. AWS currently documents HTTP API VPC links as VPC link V2 connections that create and manage elastic network interfaces in the selected subnets, so the introduction and Step 3 comment were corrected.
- The introduction stated that REST API VPC Links connect only to NLBs. That is no longer true as a general AWS statement because REST APIs now support VPC links V2 for newer private integrations. The post was corrected to clarify that the specific `aws_api_gateway_vpc_link` resource shown is the legacy NLB-based option.
- The Step 4 integration comment said the integration URI should be the private NLB URL. For HTTP API private integrations, the provider and AWS docs require the load balancer listener ARN, so the comment was corrected to match the code.
- The HTTP API example did not account for API Gateway including the stage name in the backend request path for private integrations. Added `request_parameters = { "overwrite:path" = "$request.path" }` so requests such as `/prod/health` are forwarded as `/health`.
- The conclusion repeated the outdated PrivateLink claim and incomplete REST API limitation, so it was updated to reflect current AWS behavior.

## Review Notes
- The post remains focused on the legacy `aws_api_gateway_vpc_link` resource for the REST API example. That is still valid OpenTofu configuration for NLB-backed REST private integrations, but AWS now also documents VPC link V2 support for newer REST private integrations.
- The `tofu` binary was not installed in this workspace, so CLI commands were validated against official OpenTofu documentation rather than local `--help` output.
