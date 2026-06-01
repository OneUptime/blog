# Validation Summary: How to Deploy Azure SignalR Service with Pulumi Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SignalR Service
- Azure Functions
- Pulumi Azure Native
- Python
- Azure Storage
- Application Insights
- Log Analytics

## Sources Consulted
- Pulumi Azure Native SignalR resource documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/signalrservice/signalr/
- Pulumi Azure Native SignalR key listing documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/signalrservice/listsignalrkeys/
- Pulumi Azure Native WebApp documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/web/webapp/
- Pulumi Azure Native Application Insights Component documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/insights/component/
- Pulumi Azure Native Log Analytics Workspace documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/operationalinsights/workspace/
- Microsoft Azure Functions infrastructure-as-code documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-infrastructure-as-code
- Microsoft Azure Functions Python developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Microsoft Azure Functions SignalR bindings documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-signalr-service
- Microsoft Azure Functions SignalR output binding documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-signalr-service-output
- Microsoft Azure Functions SignalR trigger binding documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-signalr-service-trigger
- Microsoft Azure SignalR upstream endpoint documentation: https://learn.microsoft.com/en-us/azure/azure-signalr/concept-upstream
- Microsoft Azure SignalR Service pricing documentation: https://azure.microsoft.com/en-us/pricing/details/signalr-service/

## Issues Found
- The Pulumi Azure Native SignalR examples used `resource_name` and `network_ac_ls`, which are not the correct current Python property names. Changed them to `resource_name_` and `network_acls`.
- The Application Insights Component example used `resource_name` and omitted the Log Analytics workspace required by the current Azure Native Component API. Changed it to `resource_name_`, added a Log Analytics workspace, and linked it with `workspace_resource_id`.
- The storage connection string used a Pulumi `Output` object inside an f-string after the value had left the `Output.all(...)` callback. Reworked it so the resolved account name and storage key are used together inside the callback.
- The Linux Function App resource used `kind="functionapp"`. Updated it to `kind="functionapp,linux"` to match Azure Functions Linux infrastructure guidance.
- The Function App monitoring setting used the older instrumentation-key app setting. Updated it to `APPLICATIONINSIGHTS_CONNECTION_STRING` with the Application Insights connection string.
- The Azure Functions Python SignalR generic binding decorators used snake_case binding property names. Updated them to the binding JSON property names `hubName` and `connectionStringSetting`.
- The upstream section claimed to configure a custom domain but only configured upstream endpoints. Removed the custom-domain wording and corrected the Pulumi resource name fields in that snippet.
- The summary claimed serverless mode means you only pay for messages and connections. Updated it to reflect Azure SignalR pricing by tier, units, and message usage, and clarified that the Functions app is the part that can scale down when idle.

## Review Notes
The post remains a high-level infrastructure tutorial. It still assumes the Azure Functions application package is deployed separately and does not include the deployment workflow for the function code itself.
