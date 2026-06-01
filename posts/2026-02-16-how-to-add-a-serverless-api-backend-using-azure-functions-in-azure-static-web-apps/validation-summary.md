# Validation Summary: How to Add a Serverless API Backend Using Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Static Web Apps
- Azure Functions managed APIs
- Azure Functions Node.js JavaScript programming model v3
- Azure Static Web Apps CLI
- Azure CLI
- Static Web Apps authentication and authorization
- Static Web Apps application settings
- MongoDB Node.js driver

## Sources Consulted
- Azure Static Web Apps API support with Azure Functions: https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions
- Azure Static Web Apps API support overview and API constraints: https://learn.microsoft.com/en-us/azure/static-web-apps/apis-overview
- Azure Static Web Apps build configuration: https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration
- Azure Static Web Apps CLI reference: https://learn.microsoft.com/en-us/azure/static-web-apps/static-web-apps-cli
- Azure Static Web Apps route and authorization configuration: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Accessing user information in Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
- Configure application settings for Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/application-settings
- Azure CLI staticwebapp appsettings reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp/appsettings
- Azure Functions Node.js developer guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Functions host.json reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-host-json
- Azure Functions extension bundles: https://learn.microsoft.com/en-us/azure/azure-functions/extension-bundles

## Issues Found
- The deployment explanation said Azure Static Web Apps automatically detects the `api` directory. Updated it to explain that deployment uses the folder configured as `api_location`, commonly `api`.
- The architecture diagram used `/api/get-items`, but the function route is configured as `items`, so the actual endpoint is `/api/items`. Updated the diagram.
- The setup commands changed into the `api` directory and did not return to the project root, which would make the later `mkdir -p api/get-items` command create `api/api/get-items`. Added `cd ..`.
- The `host.json` snippet used extension bundle `[3.*, 4.0.0)`, while current Azure Functions documentation recommends the active v4 bundle range `[4.0.0, 5.0.0)`. Updated the snippet.
- The extension bundle explanation mentioned timer triggers and database bindings in a Static Web Apps managed API context. Managed Static Web Apps APIs only support HTTP triggers and bindings, so the explanation was corrected.
- The local development section said `swa start src --api-location api` starts a frontend dev server. For a folder argument, the SWA CLI serves static content and starts the Functions runtime. Updated the wording.

## Review Notes
The JavaScript examples use the Azure Functions Node.js v3 programming model with `function.json`, which remains generally available and supports Node.js 18. For new projects, Microsoft also documents the newer v4 Node.js programming model using the `@azure/functions` package, but the v3 examples in this post are still valid.
