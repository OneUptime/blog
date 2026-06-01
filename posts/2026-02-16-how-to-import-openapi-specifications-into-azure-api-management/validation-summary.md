# Validation Summary: How to Import OpenAPI Specifications into Azure API Management

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Azure API Management
- OpenAPI 2.0 / Swagger
- OpenAPI 3.x
- Azure CLI
- ARM templates / Bicep resource model
- Azure DevOps pipelines

## Sources Consulted
- Microsoft Learn: Import an OpenAPI specification to Azure API Management: https://learn.microsoft.com/en-gb/azure/api-management/import-api-from-oas
- Microsoft Learn: API import restrictions and known issues in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions
- Microsoft Learn: Azure CLI `az apim api` reference: https://learn.microsoft.com/en-us/cli/azure/apim/api
- Microsoft Learn: `Microsoft.ApiManagement/service/apis` ARM/Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.apimanagement/service/apis
- OpenAPI Specification v3.0.3: https://spec.openapis.org/oas/v3.0.3

## Issues Found
- Corrected the statement that all custom `x-` extensions are ignored. Azure API Management supports `x-ms-paths` and `x-servers`; other custom extensions are ignored.
- Corrected server URL behavior. APIM uses the first HTTPS server URL it finds for OpenAPI 3.x imports, rather than simply the first server URL.
- Corrected the ARM template note about URL-based OpenAPI imports by specifying that a link format such as `openapi+json-link` is needed when referencing a URL.
- Corrected re-import behavior. Current Microsoft documentation states that unmatched existing operations are deleted and that matching is based on `operationId` versus the Azure resource name, rather than a default merge that preserves missing operations.
- Corrected the Azure CLI export example. `openapi+json-link` is an ARM import/export format value, not a valid `az apim api export --export-format` value; the CLI uses values such as `OpenApiJsonUrl`.
- Reworded the duplicate `operationId` warning to align with the OpenAPI requirement that operation IDs be unique, without overclaiming APIM always fails import for duplicate IDs.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was verified against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
