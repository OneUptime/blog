# Validation Summary: How to Scale Real-Time Connections with Azure SignalR Service

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure SignalR Service
- ASP.NET Core SignalR
- Azure Functions
- Azure Monitor metrics and alerts
- Azure CLI
- MessagePack Hub Protocol
- WebSockets

## Sources Consulted
- Microsoft Learn: Performance guide for Azure SignalR Service - https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-concept-performance
- Microsoft Learn: How to scale an Azure SignalR Service instance - https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-scale-signalr
- Microsoft Learn: Automatically scale units of an Azure SignalR Service - https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-scale-autoscale
- Microsoft Learn: Service mode in Azure SignalR Service - https://learn.microsoft.com/en-us/azure/azure-signalr/concept-service-mode
- Microsoft Learn: Resiliency and disaster recovery in Azure SignalR Service - https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-concept-disaster-recovery
- Microsoft Learn: Monitoring data reference for Azure SignalR Service - https://learn.microsoft.com/en-us/azure/azure-signalr/monitor-signalr-reference
- Microsoft Learn: Azure CLI `az signalr` reference - https://learn.microsoft.com/en-us/cli/azure/signalr
- Microsoft Learn: Azure CLI `az monitor metrics alert` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Use MessagePack Hub Protocol in SignalR for ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/signalr/messagepackhubprotocol
- Microsoft Learn: ASP.NET Core SignalR hosting and scaling - https://learn.microsoft.com/en-us/aspnet/core/signalr/scale

## Issues Found
- The post said a service instance could only scale to 100 units. Updated this to clarify that Standard_S1 and Premium_P1 support up to 100 units, while Premium_P2 supports up to 1,000 units and about 1,000,000 concurrent connections.
- The ASP.NET Core sample used `options.ConnectionCount`, which is not the current Azure SignalR SDK option documented for ASP.NET Core. Changed it to `options.InitialHubServerConnectionCount`.
- The sample comment described `ServerStickyMode` as a timeout. Changed the comment to describe server stickiness during negotiation.
- The throughput table used approximate 1KB message numbers that did not match Microsoft benchmark scenarios. Replaced it with documented Unit 1 benchmark-style numbers for Default mode, WebSocket transport, 2KB messages, and one message per second.
- The post implied throughput scales roughly linearly for all patterns. Added the routing-limit caveat for small-group and connection-targeted workloads.
- The multi-region explanation overstated endpoint-specific message routing. Updated it to align with primary/secondary endpoint negotiation behavior and regional app-server configuration.
- The connection lifecycle sample implied a static counter was global. Clarified that it tracks connections only on the current app server and updated `OnDisconnectedAsync` to accept `Exception?`.
- The monitoring list mentioned generic connection errors. Replaced it with documented close/open count metrics and system/user error metrics.
- The Azure Monitor alert command used `--action-group`, which is not a valid flag for `az monitor metrics alert create`. Replaced it with the documented `--action` argument using an action group resource ID.
- The autoscaling section stated that SignalR Service does not auto-scale units automatically. Updated it to note that Premium tier supports Azure Monitor autoscale, while Standard tier or custom policies require manual/custom automation.

## Review Notes
The post is now technically accurate against current Microsoft documentation. Future improvements could include adding package installation commands for `Microsoft.Azure.SignalR`, `Microsoft.AspNetCore.SignalR.Protocols.MessagePack`, and `@microsoft/signalr-protocol-msgpack`, but the existing snippets are valid once those packages are installed.
