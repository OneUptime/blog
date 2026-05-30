# Validation Summary: How to Build Real-Time Applications with SignalR and Azure SignalR Service in C#

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core SignalR
- Azure SignalR Service
- C#
- JavaScript SignalR client
- .NET SignalR client
- Azure CLI
- Azure App Service
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Overview of ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction
- Microsoft Learn: Use hubs in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/hubs
- Microsoft Learn: ASP.NET Core SignalR JavaScript client - https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client
- Microsoft Learn: ASP.NET Core SignalR .NET client - https://learn.microsoft.com/en-us/aspnet/core/signalr/dotnet-client
- Microsoft Learn: Azure SignalR Service client negotiation - https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-concept-client-negotiation
- Microsoft Learn: Scale SignalR Service with multiple instances - https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-scale-multi-instances
- Microsoft Learn: Azure CLI az signalr reference - https://learn.microsoft.com/en-us/cli/azure/signalr
- Microsoft Learn: Azure CLI az webapp reference - https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: Configure an App Service app - https://learn.microsoft.com/en-us/azure/app-service/configure-common
- Microsoft Learn: Supported Azure SignalR Service metrics - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-signalrservice-signalr-metrics
- Microsoft Learn: Azure CLI az monitor metrics reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics

## Issues Found
- The chat hub used a static `Dictionary<string, string>` for shared connection state. Hub methods can run concurrently, so this was changed to `ConcurrentDictionary<string, string>` with `TryRemove` for disconnect cleanup.
- The Azure CLI examples used both `my-rg` and `signalr-rg`, which would break a copy-paste flow. The commands now create and consistently use `signalr-rg`.
- The App Service deployment command used `--runtime "DOTNET|8.0"`, which is not the documented Linux App Service stack value. The post now configures the Linux stack with `az webapp config set --linux-fx-version "DOTNETCORE|8.0"`.
- The post said App Service WebSockets must be enabled for this Azure SignalR Service deployment. With Azure SignalR Service, clients connect WebSockets to the service after negotiation, so the App Service WebSockets command was removed and the best practice was clarified for self-hosted SignalR.
- The scaling section said app servers are stateless and all connection state lives in Azure SignalR Service. This was narrowed to client WebSocket connection handling, with a note that application-level user/session state still needs shared storage across app instances.
- The conclusion said Azure SignalR Service scales automatically. This was changed to "supporting scale-out" to avoid implying autoscale is automatic without configuration.

## Review Notes
The post is technically valid after the corrections. The examples remain simplified: production applications should add authentication and authorization, protect the Azure SignalR connection string with a secure configuration source such as Key Vault or managed identity where appropriate, validate user input, and use durable/shared storage for app-level user presence across multiple app instances.
