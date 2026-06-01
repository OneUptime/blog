# Validation Summary: How to Build Serverless API with Azure Functions and Azure API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Functions Node.js programming model v4
- Node.js
- Azure API Management
- Azure Cosmos DB for NoSQL JavaScript SDK
- OpenAPI 3.0.1
- Azure CLI
- REST APIs

## Sources Consulted
- Azure Functions runtime versions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Azure Functions Node.js programming model v4 migration guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4
- Azure Functions HTTP trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Azure Cosmos DB JavaScript item operations: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-javascript-create-item
- Azure API Management rate-limit policy: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Azure API Management quota policy: https://learn.microsoft.com/en-us/azure/api-management/quota-policy
- Azure CLI `az functionapp create` reference: https://learn.microsoft.com/en-us/cli/azure/functionapp
- Azure CLI `az apim create` reference: https://learn.microsoft.com/en-us/cli/azure/apim
- Azure CLI `az apim api create` reference: https://learn.microsoft.com/en-us/cli/azure/apim/api

## Issues Found
- The Function App creation command used Node.js 18, which is no longer a supported Azure Functions Node.js version as of the review date. Updated the command to Node.js 22 and explicitly set Linux hosting.
- The JavaScript examples used the older Node.js programming model style without showing the required `function.json` trigger files. Updated the examples to use the Azure Functions Node.js programming model v4 with `app.http()` route registration.
- The code snippets for `get-task.js`, `update-task.js`, and `delete-task.js` referenced `container` without defining the Cosmos DB client and container in those separate files. Added the missing imports and container setup to each snippet.
- The examples used `context.bindingData`, `context.res`, and `context.log.error` patterns from the older programming model. Updated request parameter access, response returns, and logging for the v4 programming model.
- The request body handling assumed `req.body` was always present and that `title` was always a string. Updated JSON parsing and title validation to avoid runtime errors on missing or invalid JSON bodies.
- The APIM policy used `<rate-limit calls="1000" renewal-period="3600" />`, but the `rate-limit` policy has a maximum `renewal-period` of 300 seconds. Replaced it with a valid short-window rate limit.
- The OpenAPI document referenced `#/components/schemas/CreateTask` without defining `components.schemas`. Added `CreateTask` and `UpdateTask` schemas.
- The OpenAPI document described only part of the API despite the tutorial defining `PUT` and `DELETE` endpoints. Added those operations to keep the specification consistent with the API.
- The Cosmos DB item access examples used `container.item(taskId, taskId)`, which only works when the item ID is also the partition key. Added an explicit note that the container is assumed to use `/id` as the partition key.
- The wrap-up said the architecture is cost-effective for APIs of any size. Adjusted this to "many APIs" to avoid an overbroad cost claim.

## Review Notes
- The post remains a high-level tutorial and still assumes prerequisite Azure resources such as the resource group, storage account, Cosmos DB account, database, container, APIM named value, JWT tenant/audience configuration, and APIM operation import/setup exist or are created elsewhere.
- The Linux Consumption plan is scheduled for retirement on September 30, 2028, and Node.js 22 is documented as the last Node.js version supported on Linux Consumption. A future update should consider Flex Consumption for new production deployments.
