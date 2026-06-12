# Validation Summary: How to Create Azure Functions Durable

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Functions
- Azure Durable Functions
- Durable Functions for Node.js / TypeScript
- Azure Functions Core Tools
- Azure CLI
- Azure Functions host.json and local.settings.json
- Bicep
- .NET Azure Functions Durable extension

## Sources Consulted
- Microsoft Learn: Durable Functions overview: https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/durable-functions-overview
- Microsoft Learn: Migrate Durable Functions to Node.js programming model v4: https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/durable-functions-node-model-upgrade
- Microsoft Learn: Quickstart: Create a TypeScript Durable Functions app: https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/quickstart-ts-vscode
- Microsoft Learn: Durable Functions triggers and bindings: https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/durable-functions-bindings
- Microsoft Learn: Durable Functions host.json settings: https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/durable-functions-host-json-settings
- Microsoft Learn: Durable Functions packages, extensions, and SDKs overview: https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/durable-functions-packages
- Microsoft Learn: Azure Functions Core Tools reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-core-tools-reference
- Microsoft Learn: Azure Functions supported languages: https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages
- Microsoft Learn: Azure Functions scale and hosting: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- Microsoft Learn: Azure Functions app settings reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings
- Microsoft Learn: Azure CLI az functionapp reference: https://learn.microsoft.com/en-us/cli/azure/functionapp
- npm package metadata and TypeScript declarations for durable-functions 3.3.1 and @azure/functions 4.16.0

## Issues Found
- Updated the Node.js prerequisite from Node.js 18+ to Node.js 20+, because current @azure/functions v4 requires Node.js 20+ and current Azure Functions hosted Node versions are Node.js 22 and 24.
- Updated the Azure CLI deployment example from `--runtime-version 18` to `--runtime-version 22`, because Node.js 18 is no longer listed as a supported Azure Functions Node.js runtime.
- Fixed the Durable Functions retry option property names from `maxRetryInterval` and `retryTimeout` to `maxRetryIntervalInMilliseconds` and `retryTimeoutInMilliseconds`, matching the current `durable-functions` TypeScript declarations.
- Removed the unsupported generic type argument from `context.df.waitForExternalEvent<ApprovalEvent>()` and cast `approvalTask.result` instead, matching the current `waitForExternalEvent(name: string): Task` signature.
- Fixed the purge API call from `client.purgeInstancesBy(...)` to `client.purgeInstanceHistoryBy(...)`, matching the current DurableClient API.
- Added `extensionBundle` to the `host.json` example, because non-.NET Durable Functions apps use extension bundles to manage the Durable Functions extension.
- Added `WEBSITE_NODE_DEFAULT_VERSION` to the Bicep app settings for the Windows Function App example so the deployed Node runtime major version is explicit.
- Clarified that standard Azure Functions and activity functions are subject to hosting-plan timeout limits, rather than implying all ordinary functions are simply short-lived or that activities can run without timeout constraints.
- Clarified that the `Microsoft.Azure.WebJobs.Extensions.DurableTask` NuGet package example is for in-process C# projects.
- Updated the retry comment to use the current `maxRetryIntervalInMilliseconds` property name.

## Review Notes
The tutorial is technically relevant and uses the current Durable Functions Node.js v4 programming model. The C# snippet is accurate for in-process C# projects, but the in-process model reaches end of support on November 10, 2026; future updates should consider showing the isolated worker package and runtime instead.
