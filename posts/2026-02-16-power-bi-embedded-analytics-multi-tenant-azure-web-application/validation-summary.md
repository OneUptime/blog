# Validation Summary: How to Create a Power BI Embedded Analytics Solution in a Multi-Tenant Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Power BI Embedded analytics
- Microsoft Entra ID service principals
- Azure Power BI Embedded capacity
- Azure CLI
- Power BI REST APIs
- Power BI row-level security
- Power BI JavaScript client SDK
- Azure Functions for Node.js
- MSAL for Node.js

## Sources Consulted
- Microsoft Learn: Create Power BI Embedded capacity in Azure, https://learn.microsoft.com/en-us/power-bi/developer/embedded/azure-pbie-create-capacity
- Microsoft Learn: Azure CLI `az powerbi embedded-capacity`, https://learn.microsoft.com/en-us/cli/azure/powerbi/embedded-capacity
- Microsoft Learn: Register a Power BI Embedded app, https://learn.microsoft.com/en-us/power-bi/developer/embedded/register-app
- Microsoft Learn: Embed Power BI content with service principal and application secret, https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-service-principal
- Microsoft Learn: Generate an embed token, https://learn.microsoft.com/en-us/power-bi/developer/embedded/generate-embed-token
- Microsoft Learn: Reports GenerateTokenInGroup REST API, https://learn.microsoft.com/en-us/rest/api/power-bi/embed-token/reports-generate-token-in-group
- Microsoft Learn: Row-level security with Power BI, https://learn.microsoft.com/en-us/power-bi/enterprise/service-admin-rls
- Microsoft Learn: Embed a report with the Power BI JavaScript SDK, https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/embed-report
- Microsoft Learn: Refresh the access token in Power BI embedded analytics, https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/refresh-token
- Microsoft Learn: Apply report themes in Power BI embedded analytics, https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/apply-report-themes
- Microsoft Learn: Use filters in a Power BI embedded analytics report, https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/control-report-filters
- Microsoft Learn: Pause and start your Power BI Embedded A SKU capacity, https://learn.microsoft.com/en-us/power-bi/developer/embedded/azure-pbie-pause-start

## Issues Found
- The Power BI Embedded capacity CLI example omitted `--sku-tier PBIE_Azure`, which Microsoft documents in the Azure CLI example for creating A-SKU embedded capacity. Added the flag.
- The Microsoft Entra app registration command added delegated Power BI API permissions. Microsoft documentation recommends avoiding delegated or application permissions for service-principal Power BI REST API access because service principal access is governed through Power BI tenant settings and workspace roles. Removed the delegated permissions from the command and clarified the required tenant settings and workspace role.
- The setup text only mentioned "Service principals can use Power BI APIs." Added "Embed content in apps" and the requirement to add the service principal or its security group to the workspace as Member or Admin.
- The token lifetime comment said the maximum was 60 minutes. Microsoft documents `lifetimeInMinutes` as a way to shorten expiration and notes the generated token lifetime is limited by the remaining Microsoft Entra token lifetime. Updated the wording.
- The frontend sample used `pbi.models`, but the CDN script exposes models through `window['powerbi-client'].models`; Microsoft examples initialize `models` that way. Added `const models = window['powerbi-client'].models` and replaced `pbi.models` usages.
- The original token API trusted client-supplied tenant and user headers, and the frontend read those values from cookies. That would let a caller request another tenant's embed token. Updated the sample so tenant context is derived from authenticated server-side session state and removed browser-supplied tenant/user headers.
- The cost section referred to an "auto-pause feature." Microsoft documents pausing/starting A-SKU capacity and scheduling such operations through automation rather than a built-in auto-pause feature. Reworded it to scheduled pause/start operations.

## Review Notes
The token generation sample uses the report-specific GenerateTokenInGroup REST API, which remains documented for embed-for-your-customers scenarios. Microsoft recommends the newer V2 Generate Token API for multi-item and newer scenarios, so future revisions could update the sample to the V2 endpoint if the article expands beyond one report and one dataset. The session lookup helper is intentionally application-specific and must be implemented against the hosting app's real identity/session system.
