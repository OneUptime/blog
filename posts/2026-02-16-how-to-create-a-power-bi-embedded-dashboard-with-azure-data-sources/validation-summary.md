# Validation Summary: How to Create a Power BI Embedded Dashboard with Azure Data Sources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Power BI Embedded
- Microsoft Entra ID service principals
- Power BI REST API
- Power BI JavaScript SDK
- Azure SQL Database
- Azure Synapse Analytics
- Node.js and Express
- Python requests
- Row-Level Security (RLS)

## Sources Consulted
- Microsoft Learn: Register a Power BI Embedded app - https://learn.microsoft.com/en-us/power-bi/developer/embedded/register-app
- Microsoft Learn: Embed Power BI content with service principal and an application secret - https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-service-principal
- Microsoft Learn: Capacity and SKUs in Power BI embedded analytics - https://learn.microsoft.com/en-us/power-bi/developer/embedded/embedded-capacity
- Microsoft Learn: Reports GenerateTokenInGroup REST API - https://learn.microsoft.com/en-us/rest/api/power-bi/embed-token/reports-generate-token-in-group
- Microsoft Learn: Generate Token REST API - https://learn.microsoft.com/en-us/rest/api/power-bi/embed-token/generate-token
- Microsoft Learn: Datasets Get Datasources In Group REST API - https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-datasources-in-group
- Microsoft Learn: Gateways Update Datasource REST API - https://learn.microsoft.com/en-us/rest/api/power-bi/gateways/update-datasource
- Microsoft Learn: Refresh the access token in Power BI embedded analytics - https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/refresh-token
- Microsoft Learn: Using cloud-based row-level security with embedded content - https://learn.microsoft.com/en-us/power-bi/developer/embedded/cloud-rls

## Issues Found
- The post used the former Azure AD name and directed readers to configure Power BI API permissions for a service-principal client-credentials flow. Updated the guidance to Microsoft Entra ID and corrected the service-principal setup: enable the Power BI tenant settings and add the service principal or security group to the workspace. Microsoft documentation recommends avoiding Azure portal delegated or application permissions for this service-principal flow.
- The data-source credentials section said it configured credentials programmatically, but the sample only retrieved and printed data sources. Updated the Python sample to retrieve `gatewayId` and `datasourceId`, then call the Power BI `Update Datasource` REST API with a valid SQL Basic credential payload.
- The Python token URL used a literal `{tenant_id}` placeholder that would not be substituted. Replaced it with an explicit placeholder value in the URL.
- The RLS sample referenced an undefined `datasetId`. Added `PBI_DATASET_ID` to the Node.js config and updated the RLS sample to use `config.datasetId`.
- The troubleshooting section described CORS errors as a frontend domain whitelist issue. Updated it to the more accurate case where the frontend calls the backend from a different origin without CORS configured.
- The production token refresh note implied the JavaScript SDK provides pre-expiration events for embed-token refresh. Updated it to recommend manual refresh with `report.setAccessToken(newToken)` for embed-for-your-customers scenarios and noted that automatic `accessTokenProvider` refresh is only supported for embed-for-your-organization scenarios using Microsoft Entra tokens.

## Review Notes
The post embeds a Power BI report even though the title and some prose use "dashboard" in the broader business sense. The API and JavaScript SDK examples are report-specific and now accurately describe that flow where precision matters.
