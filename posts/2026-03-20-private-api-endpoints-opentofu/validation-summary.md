# Validation Summary: How to Set Up Private API Endpoints with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS API Gateway private REST APIs
- AWS PrivateLink
- AWS VPC interface endpoints
- AWS VPC endpoint services
- Azure Private Link
- Azure API Management (APIM)
- Azure Private DNS

## Sources Consulted
- AWS API Gateway private REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html
- AWS API Gateway private API creation and VPC endpoint association: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-create.html
- AWS API Gateway resource policies: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies.html
- AWS API Gateway resource policy examples: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-examples.html
- AWS PrivateLink endpoint services and consumer DNS behavior: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html
- AWS PrivateLink private DNS name management: https://docs.aws.amazon.com/vpc/latest/privatelink/manage-dns-names.html
- Terraform Registry `aws_vpc_endpoint_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint_service
- Terraform Registry `aws_api_gateway_rest_api_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api_policy
- Azure API Management private endpoint documentation: https://learn.microsoft.com/en-us/azure/api-management/private-endpoint
- Azure Private Endpoint DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Terraform Registry `azurerm_private_endpoint`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint

## Issues Found
- The description, overview, and summary overstated the behavior by implying these endpoints universally mean "within a VPC" and automatically eliminate all public access. I updated that language to describe private network paths more accurately and added the Azure API Management caveat that public network access must also be disabled for private-only access.
- The AWS PrivateLink consumer example enabled `private_dns_enabled = true` without showing a service-side private DNS name and verification flow. AWS documents that consumers can enable private DNS only when the endpoint service is configured with a verified private DNS name, so I changed the example to `false` and added an inline note.
- The Azure API Management private DNS zone was incorrect. I changed `azure-api.net` to the documented private zone `privatelink.azure-api.net`.

## Review Notes
- AWS API Gateway private APIs are supported for REST APIs, not API Gateway HTTP APIs. The post already uses the correct `aws_api_gateway_rest_api` resource.
- Enabling private DNS on the `execute-api` VPC endpoint simplifies private API invocation, but AWS notes that it also prevents access to the default public `execute-api` endpoint from inside that VPC.
- Azure API Management private endpoints support only the `Gateway` subresource. The post already uses the correct subresource name.
- Azure API Management private endpoints also have tier and networking limitations documented by Microsoft Learn, especially for classic tiers injected into internal or external VNets. The current snippet can still be valid, but those constraints are worth keeping in mind for future expansion.
