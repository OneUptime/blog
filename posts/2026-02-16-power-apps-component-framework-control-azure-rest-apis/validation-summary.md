# Validation Summary: How to Build a Power Apps Component Framework Control That Calls Azure REST APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Power Apps Component Framework (PCF)
- Microsoft Power Platform CLI
- TypeScript
- React controls and PCF platform libraries
- Azure Monitor Metrics REST API
- Azure Functions
- Microsoft Entra ID / Azure managed identity authentication

## Sources Consulted
- Microsoft Power Platform CLI overview and installation: https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction
- Install Power Platform CLI with .NET Tool: https://learn.microsoft.com/en-us/power-platform/developer/howto/install-cli-net-tool
- Power Platform CLI `pac pcf` command reference: https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/pcf
- Power Platform CLI `pac solution` command reference: https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/solution
- Power Apps Component Framework overview: https://learn.microsoft.com/en-us/power-apps/developer/component-framework/overview
- PCF ReactControl API reference: https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/react-control
- PCF React controls and platform libraries: https://learn.microsoft.com/en-us/power-apps/developer/component-framework/react-controls-platform-libraries
- PCF manifest `external-service-usage` element: https://learn.microsoft.com/en-us/power-apps/developer/component-framework/manifest-schema-reference/external-service-usage
- PCF manifest `property` element: https://learn.microsoft.com/en-us/power-apps/developer/component-framework/manifest-schema-reference/property
- Azure Monitor Metrics List REST API 2023-10-01: https://learn.microsoft.com/en-us/rest/api/monitor/metrics/list?view=rest-monitor-2023-10-01
- Azure Monitor REST API walkthrough: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/rest-api-walkthrough

## Issues Found
- The post installed Power Platform CLI with `npm install -g pac`, which is not the documented installation method. Changed it to `dotnet tool install --global Microsoft.PowerApps.CLI.Tool`.
- The manifest used React platform library version `18.2.0`, but the PCF platform-library documentation lists `16.14.0` as the supported React manifest version. Updated the manifest accordingly.
- The manifest omitted `<external-service-usage>` even though the control calls an external service from the browser in a canvas app. Added the external service declaration with the Azure Functions proxy domain.
- The entry-point code attempted to add an Azure bearer token returned by a placeholder `getAccessToken()` method that always returned an empty string. Reworked the sample to call an Azure Functions proxy and removed the non-working token method.
- The Azure Monitor URL construction did not encode query values and relied on a direct Management API call from the browser. Reworked the React component to pass encoded query values to the proxy and added basic empty-result handling.
- The Azure Monitor metric value mapping used `||`, which would incorrectly replace valid zero values. Changed it to nullish coalescing with `??`.
- The canvas app example set `apiEndpoint` to an Azure resource URL instead of the proxy endpoint and omitted `resourceId`. Updated the example formulas.
- The Azure Function proxy accepted a full target URL from the query string, creating an unsafe open proxy pattern. Changed it to accept a resource URI, validate that it starts with `/subscriptions/`, and construct the Azure Monitor Metrics API URL server-side.
- The solution packaging commands initialized the solution in the control directory and then referenced `./`, which is ambiguous for a generated PCF project. Adjusted the commands to create a solution subdirectory and reference the PCF project parent path.
- The XML snippet placed a filename comment before the XML declaration. Removed the comment so the snippet can be copied as valid XML.

## Review Notes
The revised sample uses Azure Functions as the concrete authentication path because PCF controls do not automatically receive Azure Management API tokens. A custom connector can still be used by the surrounding app, but the PCF control should consume the connector output as app data rather than directly calling the connector through a PCF context API.
