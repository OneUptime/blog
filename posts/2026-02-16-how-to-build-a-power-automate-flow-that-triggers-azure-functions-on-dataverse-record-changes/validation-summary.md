# Validation Summary: How to Build a Power Automate Flow That Triggers Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Power Automate
- Microsoft Dataverse
- Azure Functions
- C# Azure Functions isolated worker model
- HTTP triggers and function keys
- Microsoft Entra ID authentication
- Power Automate HTTP and HTTP with Microsoft Entra ID connectors
- Power Automate custom connectors
- Azure App Service access restrictions
- Azure Service Bus
- Application Insights

## Sources Consulted
- Azure Functions HTTP trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Azure Functions .NET isolated worker guide: https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Azure Functions security concepts: https://learn.microsoft.com/en-us/azure/azure-functions/security-concepts
- Configure Microsoft Entra authentication for Azure App Service or Azure Functions: https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad
- Power Automate Dataverse row added, modified, or deleted trigger: https://learn.microsoft.com/en-us/power-automate/dataverse/create-update-delete-trigger
- Power Automate limits and retry policy documentation: https://learn.microsoft.com/en-us/power-automate/limits-and-config
- Power Automate IP address configuration: https://learn.microsoft.com/en-gb/power-automate/ip-address-configuration
- HTTP with Microsoft Entra ID connector reference: https://learn.microsoft.com/en-gb/connectors/webcontentsv2/
- Power Automate connector reference list: https://learn.microsoft.com/en-us/connectors/connector-reference/connector-reference-powerautomate-connectors
- Create a custom connector from an OpenAPI definition: https://learn.microsoft.com/en-us/connectors/custom-connectors/define-openapi-definition
- Dataverse Web API properties and lookup property naming: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-properties

## Issues Found
- Updated the C# Azure Function example from the in-process model using `Microsoft.Azure.WebJobs`, `[FunctionName]`, `HttpRequest`, and `IActionResult` to the current isolated worker model using `Microsoft.Azure.Functions.Worker`, `[Function]`, `HttpRequestData`, and `HttpResponseData`. Microsoft documentation recommends the isolated worker model for continued support; in-process support ends on November 10, 2026.
- Added null-payload handling and case-insensitive JSON deserialization to the function example so invalid or unexpected request bodies do not cause a null-reference failure before returning a response.
- Replaced "Azure AD" terminology with "Microsoft Entra ID" and changed the connector name to "HTTP with Microsoft Entra ID", matching current Microsoft naming and connector documentation.
- Corrected the IP restriction guidance. Power Automate documentation recommends Azure service tags; connector actions use `AzureConnectors`, while HTTP and HTTP + Swagger actions require `LogicApps`, `PowerPlatformPlex`, and `PowerPlatformInfra`.
- Replaced the unsupported "Azure Functions connector" guidance with custom connector guidance. The current Power Automate connector reference does not list a direct Azure Functions connector, while custom connectors and HTTP actions are supported options.
- Corrected the Power Automate payload for the Dataverse change type from `@odata.context` to `SdkMessage`, which Microsoft documents as returning `Create`, `Update`, or `Delete`.
- Corrected the Dataverse lookup field example for the contact's parent customer from `parentcustomerid` to `_parentcustomerid_value`, matching Dataverse lookup property naming.
- Removed the deterministic retry delay sequence example. Power Automate uses exponential retries within documented limits, but the exact intervals are policy-controlled and should not be presented as fixed `10s, 20s, 40s, 80s` timing.

## Review Notes
- The architecture is technically valid for moderate workloads. For high-volume scenarios, the post correctly points readers toward batching or a queue-based design.
- The sample function still leaves enrichment and email delivery as placeholders, which is appropriate for the scope of the tutorial.
