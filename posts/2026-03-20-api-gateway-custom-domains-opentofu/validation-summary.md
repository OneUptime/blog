# Validation Summary: How to Set Up API Gateway Custom Domains with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS API Gateway HTTP APIs
- AWS API Gateway REST APIs
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Azure API Management
- Azure Key Vault

## Sources Consulted
- HashiCorp AWS Provider: `aws_apigatewayv2_api_mapping` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_api_mapping.html.markdown
- HashiCorp AWS Provider: `aws_apigatewayv2_domain_name` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_domain_name.html.markdown
- HashiCorp AWS Provider: `aws_api_gateway_domain_name` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_domain_name.html.markdown
- HashiCorp AWS Provider: `aws_api_gateway_base_path_mapping` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_base_path_mapping.html.markdown
- HashiCorp AWS Provider: `aws_acm_certificate_validation` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate_validation.html.markdown
- AWS API Gateway Developer Guide: Get certificates ready in AWS Certificate Manager - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-specify-certificate-for-custom-domain-name.html
- AWS API Gateway Developer Guide: Custom domain name for public REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html
- AWS API Gateway Developer Guide: Choose a security policy for your custom domain in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-custom-domain-tls-version.html
- HashiCorp AzureRM Provider: `azurerm_api_management` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management.html.markdown
- HashiCorp AzureRM Provider: `azurerm_api_management_custom_domain` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_custom_domain.html.markdown
- HashiCorp AzureRM Provider: `azurerm_key_vault_certificate` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_certificate
- Microsoft Learn: Configure custom domain name for Azure API Management instance - https://learn.microsoft.com/en-us/azure/api-management/configure-custom-domain
- Microsoft Learn: Use managed identities in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-use-managed-service-identity
- Google Cloud: Use a custom domain with API Gateway - https://cloud.google.com/api-gateway/docs/using-custom-domains

## Issues Found
- The post metadata claimed GCP coverage, but the body did not include a GCP implementation. I removed `GCP` from the tags and description to match the actual content. I verified separately that Google Cloud custom domains for API Gateway are documented as an HTTPS load-balancing flow, not a native gateway-domain resource.
- The AWS REST API custom-domain example omitted `security_policy`. I added `security_policy = "TLS_1_2"` so the example matches the post's AWS guidance and current API Gateway custom-domain documentation.
- The Azure API Management example was not valid as written. The Key Vault certificate policy omitted the required `key_usage` field, the custom-domain block used the wrong field (`key_vault_id` instead of `key_vault_certificate_id`), it passed a `principal_id` where a managed-identity client ID would be expected, and it did not grant Key Vault secret access before binding the hostname. I rewrote the example to use a system-assigned identity, a Key Vault access policy with `Get` and `List` secret permissions, `azurerm_api_management_custom_domain`, and `versionless_secret_id` for automatic certificate pickup.
- The Azure example also claimed automatic certificate rotation without configuring it. I added a `lifetime_action` block to the Key Vault certificate policy and switched the APIM binding to the versionless Key Vault secret ID so renewed certificate versions can be picked up automatically.
- The multi-environment AWS example referenced `aws_acm_certificate_validation.envs` without defining it, so the snippet would fail. I added the Route 53 validation records and the missing `aws_acm_certificate_validation` resources.
- The multi-environment AWS example also stopped at DNS alias records and never mapped the domains to API stages. I added `aws_apigatewayv2_api_mapping` so the custom domains actually route to environment-specific APIs/stages.
- The conclusion overstated `TLS_1_2` as the universal choice. I corrected it to reflect current AWS behavior: HTTP APIs require `TLS_1_2`, while REST APIs can also use newer enhanced security policies.

## Review Notes
- The Azure Key Vault certificate example still uses a self-signed certificate pattern, which is acceptable for demonstration but not appropriate for a public production endpoint unless clients explicitly trust that certificate chain.
- If this post is expanded later to cover GCP, the implementation should describe the current Google Cloud approach: custom domains for API Gateway are configured through HTTPS load balancing and documented as a Preview feature.
