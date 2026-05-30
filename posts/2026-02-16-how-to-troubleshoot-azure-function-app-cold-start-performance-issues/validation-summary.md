# Validation Summary: How to Troubleshoot Azure Function App Cold Start Performance Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Functions
- Azure Functions hosting plans: Consumption, Flex Consumption, Premium, Dedicated/App Service
- Azure CLI
- Application Insights and Kusto Query Language
- .NET isolated Azure Functions
- Node.js Azure Functions
- esbuild
- npm
- .NET ReadyToRun publishing

## Sources Consulted
- Azure Functions hosting options: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- Azure Functions Premium plan: https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan
- Azure Functions Dedicated hosting: https://learn.microsoft.com/en-us/azure/azure-functions/dedicated-plan
- Azure Functions warmup trigger: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-warmup
- Azure Functions runtime versions and .NET support: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Azure Functions .NET dependency injection: https://learn.microsoft.com/en-us/azure/azure-functions/functions-dotnet-dependency-injection
- Azure Functions Node.js developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Run Azure Functions from a package file: https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package
- Azure CLI function app plan commands: https://learn.microsoft.com/en-us/cli/azure/functionapp/plan
- .NET ReadyToRun deployment: https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run
- npm install documentation: https://docs.npmjs.com/cli-documentation/install
- npm configuration documentation: https://docs.npmjs.com/cli/v9/using-npm/config/

## Issues Found
- The post treated the legacy Consumption plan as the default serverless choice and omitted Flex Consumption. Added Flex Consumption guidance and noted that Microsoft now recommends Flex Consumption for new serverless function apps.
- The Dedicated plan section claimed there are no cold starts without qualification. Updated it to explain that Always On should be enabled on App Service plans so the Functions runtime does not go idle.
- The Azure CLI example queried `sku` directly from `az functionapp show`, which is not the reliable place to inspect the hosting plan SKU. Changed it to query `serverFarmId` from the function app and then use `az functionapp plan show --query "sku"`.
- Premium plan terminology mixed always-ready and prewarmed instances. Updated the explanation and commands to distinguish always-ready instances from prewarmed scale-out buffers, and replaced generic `az resource update` examples with documented `az functionapp update --set siteConfig...` examples.
- The startup telemetry sample used the in-process `FunctionsStartup` model and manually created a `TelemetryClient`, which conflicts with current Microsoft guidance and the post's later isolated-worker examples. Replaced it with a .NET isolated worker sample that logs the first invocation per host instance.
- The Node.js packaging section used `npm install --production` and stated that `@azure/functions` is provided by the runtime. Updated the production install command to `npm ci --omit=dev` and removed the incorrect esbuild externalization for the Node.js v4 programming model.
- The runtime-language section gave precise cold start timings without a stable official basis and recommended .NET in-process without noting its support end date. Replaced the hard-coded timings with qualitative guidance and noted that .NET in-process support ends on November 10, 2026.
- The Java section suggested GraalVM native image as if it were a drop-in Azure Functions Java worker optimization. Clarified that it is not a drop-in replacement for a standard Azure Functions Java worker app.
- The timer trigger sample mixed isolated-worker attributes with an in-process `ILogger` parameter pattern. Rewrote it as a current .NET isolated worker class using constructor-injected `ILogger<T>`.
- The ReadyToRun snippet omitted the target runtime identifier and overstated that ReadyToRun eliminates JIT overhead. Added `RuntimeIdentifier` and changed the wording to say ReadyToRun can reduce JIT compilation overhead.

## Review Notes
The KQL examples are reasonable for identifying latency outliers, but they infer cold starts from duration and role name rather than using a built-in cold-start signal. The post now notes explicit per-instance logging as a supplemental technique.
