# Validation Summary: How to Create Azure API Management APIs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Azure API Management (APIM)
- AzureRM provider
- OpenAPI
- JWT validation
- APIM policies

## Sources Consulted
- AzureRM provider docs: `azurerm_api_management_api` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_api.html.markdown
- AzureRM provider docs: `azurerm_api_management_api_operation` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_api_operation.html.markdown
- AzureRM provider docs: `azurerm_api_management_product_api` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_product_api.html.markdown
- AzureRM provider docs: `azurerm_api_management_api_policy` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_api_policy.html.markdown
- AzureRM provider docs: `azurerm_api_management_api_operation_policy` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_api_operation_policy.html.markdown
- AzureRM provider docs: `azurerm_api_management_api_version_set` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/api_management_api_version_set.html.markdown
- Microsoft Learn: `validate-jwt` policy https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: `set-backend-service` policy https://learn.microsoft.com/en-us/azure/api-management/set-backend-service-policy
- Microsoft Learn: `set-header` policy https://learn.microsoft.com/en-us/azure/api-management/set-header-policy
- Microsoft Learn: `cache-lookup` policy https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-policy
- Microsoft Learn: `cache-store` policy https://learn.microsoft.com/en-us/azure/api-management/cache-store-policy
- Microsoft Learn: APIM policy expressions https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions

## Issues Found
- The JWT validation example used `required-claims` to validate the `aud` claim. I changed it to the documented `audiences` element, which is the provider-agnostic APIM mechanism for audience validation.
- The backend-routing comment said `backend-id` was using a named value. I changed the comment to say it uses a backend entity, which matches the `set-backend-service` policy semantics in APIM.
- The operation-level caching example claimed it cached `GET /orders` responses, but it set `allow-private-response-caching="false"` while the API-level policy required an `Authorization` header. That combination prevents caching authenticated requests. I changed it to `allow-private-response-caching="true"` and added `<vary-by-header>Authorization</vary-by-header>` so caching works per access token.

## Review Notes
- The post is technically valid after the fixes above.
- The `azurerm_api_management_api` resource can drift if `display_name` or `description` are set in HCL and also imported from the OpenAPI document. Keep those values aligned if the imported spec defines them.
- Microsoft recommends pairing `cache-lookup` with `rate-limit` or `rate-limit-by-key` to reduce backend pressure if the cache is unavailable.
