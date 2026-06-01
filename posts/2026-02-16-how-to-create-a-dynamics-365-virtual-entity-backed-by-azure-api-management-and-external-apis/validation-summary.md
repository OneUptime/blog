# Validation Summary: How to Create a Dynamics 365 Virtual Entity Backed by Azure API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Dynamics 365
- Microsoft Dataverse virtual tables
- Dataverse custom virtual table data providers
- Azure API Management
- Azure CLI
- Azure API Management policies
- C# Dataverse SDK
- REST APIs

## Sources Consulted
- Microsoft Learn: Get started with virtual tables (entities) - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/virtual-entities/get-started-ve
- Microsoft Learn: Custom virtual table data providers - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/virtual-entities/custom-ve-data-providers
- Microsoft Learn: API considerations of virtual tables - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/virtual-entities/api-considerations-ve
- Microsoft Learn: Sample custom virtual table provider with CRUD operations - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/virtual-entities/sample-ve-provider-crud-operations
- Microsoft Learn: Create and edit virtual tables with Microsoft Dataverse - https://learn.microsoft.com/power-apps/maker/data-platform/create-edit-virtual-entities
- Microsoft Learn: EntityMetadata.DataProviderId property - https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.metadata.entitymetadata.dataproviderid
- Microsoft Learn: CreateEntityRequest.PrimaryAttribute property - https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.messages.createentityrequest.primaryattribute
- Microsoft Learn: Azure CLI az apim - https://learn.microsoft.com/en-us/cli/azure/apim
- Microsoft Learn: Azure CLI az apim api import - https://learn.microsoft.com/en-gb/cli/azure/apim/api
- Microsoft Learn: Import an OpenAPI specification to Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/import-api-from-oas
- Microsoft Learn: Azure API Management check-header policy - https://learn.microsoft.com/en-us/azure/api-management/check-header-policy
- Microsoft Learn: Azure API Management managed identity authentication policy - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-use-managed-service-identity
- Microsoft Learn: Set or edit Azure API Management policies - https://learn.microsoft.com/en-us/azure/api-management/set-edit-policies

## Issues Found
- The post said virtual entities can be used in charts. Current Dataverse virtual table documentation says charts and dashboards are not supported, so the claim was removed.
- The Azure CLI import example used `--path /inventory` and `--specification-format OpenAPI`. Updated the path to the relative API path `inventory` and the format to the current CLI enum value `OpenApiJson` for a JSON OpenAPI document.
- The APIM `check-header` policy omitted required attributes. Added `failed-check-error-message` and `ignore-case`, and added the standard `backend` and `on-error` policy sections with `<base />`.
- The virtual table creation snippet treated the primary attribute as a primary key string. `CreateEntityRequest.PrimaryAttribute` defines the primary name column; Dataverse creates the GUID primary ID column. Updated the snippet to use `cr_name` as the primary name column and to rely on the generated `cr_inventoryid` GUID ID column.
- The virtual table creation snippet did not link the table to a data source row. Added `DataSourceId` and updated the data source example to create the data source row, set its provider reference, and pass the returned ID into virtual table creation.
- The data provider plugin set `cr_inventoryid` to a string value. Updated the plugin snippets to parse and assign the GUID row ID and set `cr_name` for the primary name value.
- Query parameter values in the plugin were interpolated without URL encoding. Added `Uri.EscapeDataString` for filter values.

## Review Notes
The C# snippets remain illustrative and omit surrounding model classes, using directives, plugin registration steps, and production hardening such as timeout handling, async handling, and robust error responses. The Azure CLI was not available in the local environment, so CLI validation used Microsoft Learn documentation instead of local `az --help` output.
