# Validation Summary: How to Use Offline-Capable Power Apps with Azure API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Power Apps canvas apps
- Power Fx SaveData, LoadData, collections, Patch, ForAll, and Connection.Connected
- Azure API Management
- Azure CLI for API Management
- Azure API Management policies
- Azure Functions for Node.js
- Node.js mssql package with Azure SQL Database
- Offline data synchronization and conflict handling

## Sources Consulted
- Microsoft Learn: Develop offline-capable canvas apps - https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/offline-apps
- Microsoft Learn: SaveData, LoadData, and ClearData functions - https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-savedata-loaddata
- Microsoft Learn: Patch function - https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-patch
- Microsoft Learn: Operators and Identifiers in Power Apps - https://learn.microsoft.com/en-us/power-platform/power-fx/reference/operators
- Microsoft Learn: Azure CLI az apim - https://learn.microsoft.com/en-us/cli/azure/apim
- Microsoft Learn: Azure CLI az apim api import - https://learn.microsoft.com/en-us/cli/azure/apim/api
- Microsoft Learn: Azure Functions Node.js developer guide - https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Microsoft Learn: Migrate to v4 of the Node.js model for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4
- Microsoft Learn: Azure API Management validate-jwt policy - https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: Azure API Management retry policy - https://learn.microsoft.com/en-us/azure/api-management/retry-policy
- Microsoft Learn: Azure API Management rate-limit policy - https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn: Azure API Management set-header policy - https://learn.microsoft.com/en-us/azure/api-management/set-header-policy
- Microsoft Learn: Azure API Management policy expressions - https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions

## Issues Found
- The sync-pull endpoint interpolated the client-provided `table` query parameter directly into a SQL query. Parameters cannot be used for SQL object names, so this created a SQL injection risk. I added an allowlist map for supported sync tables and return a 400 response for invalid table names.
- The Power Fx startup sample read `colSyncState` without loading, initializing, or saving it. This would cause repeated full syncs or failed timestamp updates depending on app state. I added `LoadData` for sync state, initialized the inspections timestamp on first run, and persisted the updated sync state with `SaveData`.
- The backend trusted `x-user-id`, but the APIM policy only validated the JWT and did not set that header from a validated claim. I updated the APIM policy to require the Bearer scheme, capture the validated JWT, use the Microsoft Entra v2 OpenID configuration URL, and overwrite `x-user-id` from the validated token's `oid` claim.
- The APIM retry condition accessed `context.Response.StatusCode` without a null guard. I added a `context.Response != null` check consistent with APIM retry examples that account for missing responses.

## Review Notes
The Azure CLI examples use current `az apim create` and `az apim api import` parameters. The Azure Functions code uses the current Node.js v4 programming model shape with `app.http`, `request.query.get`, `request.headers.get`, `request.json()`, and `jsonBody`. Power Apps `SaveData` and `LoadData` are appropriate for collection-backed offline storage; note that Microsoft documents practical storage limits, including a 1 MB limit when running in Teams or a web browser.
