# Validation Summary: How to Configure Azure Application Insights for a Node.js Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Application Insights
- Azure Monitor
- Azure CLI
- Node.js
- JavaScript
- TypeScript
- Express
- KQL

## Sources Consulted
- Microsoft Learn: Azure CLI `az monitor app-insights component create` documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Microsoft Learn: Create and configure Application Insights resources: https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource
- Microsoft Learn: Monitor .NET and Node.js applications with Application Insights Classic API: https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs
- Microsoft Learn: Application Insights connection strings: https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings
- Microsoft Application Insights Node.js SDK README and package metadata: https://github.com/microsoft/ApplicationInsights-node.js
- NPM package metadata for `applicationinsights` version 3.15.0: https://www.npmjs.com/package/applicationinsights

## Issues Found
- The Azure CLI example used `--application-type Node.JS`, but current Azure CLI documentation lists `web` and `other` as valid values. Changed it to `--application-type web`.
- The initialization example used `.setAutoCollectConsole(true)` while claiming it tracks `console.log` and `console.error`. Current SDK behavior excludes console methods unless the second argument is set. Changed it to `.setAutoCollectConsole(true, true)`.
- The dependency auto-collection comment implied generic SQL coverage. Current SDK documentation lists supported package instrumentation such as MySQL, PostgreSQL, MongoDB, Redis, Azure SDKs, and HTTP dependencies. Updated the comment to name supported package categories.
- The sampling examples set `appInsights.defaultClient.config.samplingPercentage` after `start()`. Current Application Insights Node.js SDK 3.x documentation states configuration must be complete before `start()`. Moved sampling configuration before `start()` in both examples.
- The sampling section claimed adaptive sampling support for Node.js and said exceptions and custom metrics are not sampled by default. Current Node.js SDK documentation documents fixed-rate `samplingPercentage`, and Microsoft Learn shows exceptions can be affected by sampling and should be counted with `itemCount`. Reworded this section accordingly.
- The firewall troubleshooting note named only `dc.services.visualstudio.com`. Current connection-string documentation supports explicit or assembled ingestion endpoints such as `dc.applicationinsights.azure.com` and region-specific endpoints. Updated the note to refer to the ingestion endpoint in the connection string.

## Review Notes
- Microsoft currently recommends the Azure Monitor OpenTelemetry Distro for new applications, while the post uses the Application Insights Classic API SDK. The SDK remains usable, but a future update could compare the Classic API SDK with the OpenTelemetry distro.
