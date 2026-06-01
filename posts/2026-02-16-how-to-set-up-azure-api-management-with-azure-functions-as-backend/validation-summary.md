# Validation Summary: How to Set Up Azure API Management with Azure Functions as Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure API Management
- Azure Functions
- Azure CLI
- API Management policies
- Microsoft Entra ID / JWT authentication
- Managed identities
- API products and subscriptions

## Sources Consulted
- Microsoft Learn: `az apim` CLI reference: https://learn.microsoft.com/en-us/cli/azure/apim
- Microsoft Learn: `az apim api` CLI reference: https://learn.microsoft.com/en-us/cli/azure/apim/api
- Microsoft Learn: `az apim api operation` CLI reference: https://learn.microsoft.com/en-us/cli/azure/apim/api/operation
- Microsoft Learn: `az apim product` CLI reference: https://learn.microsoft.com/en-us/cli/azure/apim/product
- Microsoft Learn: `az apim product api` CLI reference: https://learn.microsoft.com/en-us/cli/azure/apim/product/api
- Microsoft Learn: Import an Azure function app as an API: https://learn.microsoft.com/en-us/azure/api-management/import-function-app-as-api
- Microsoft Learn: API Management `authentication-managed-identity` policy: https://learn.microsoft.com/en-us/azure/api-management/authentication-managed-identity-policy
- Microsoft Learn: API Management `rate-limit` policy: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn: API Management `validate-jwt` policy: https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: API Management `cache-lookup` policy: https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-policy

## Issues Found
- The managed identity policy used the Function App URL as the `resource`. The policy expects the target secured resource/application identifier in Microsoft Entra ID, so the example was changed to use a Function App application ID placeholder and the explanation now mentions Microsoft Entra authentication.
- The cache policy used `page,limit` inside `vary-by-query-parameter`. API Management expects multiple query parameters in that element to be separated with semicolons, so this was changed to `page;limit`.
- The product creation command used `--display-name`, which is not a valid option for `az apim product create`. It was changed to the documented `--product-name` option.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn CLI reference pages. The Function App import flow in the Azure portal can automatically create a Function App host key and APIM named value; manually created APIs may need equivalent backend authentication configuration.
