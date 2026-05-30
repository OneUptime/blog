# Validation Summary: How to Build a Real-Time Mobile Notification System with Azure SignalR Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SignalR Service
- Azure SignalR Service Management SDK for .NET
- Azure Notification Hubs
- ASP.NET Core
- Azure Cache for Redis
- React Native
- React Native Firebase Cloud Messaging
- SignalR JavaScript client
- Azure CLI

## Sources Consulted
- Azure SignalR Service modes: https://learn.microsoft.com/azure/azure-signalr/concept-service-mode
- Azure SignalR Service Management SDK: https://learn.microsoft.com/azure/azure-signalr/signalr-howto-use-management-sdk
- Azure SignalR Service client negotiation: https://learn.microsoft.com/azure/azure-signalr/signalr-concept-client-negotiation
- Azure CLI `az signalr create`: https://learn.microsoft.com/cli/azure/signalr
- ASP.NET Core SignalR JavaScript client: https://learn.microsoft.com/aspnet/core/signalr/javascript-client
- ASP.NET Core SignalR configuration: https://learn.microsoft.com/aspnet/core/signalr/configuration
- Azure SignalR Service limits: https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits
- Azure Notification Hubs routing and tag expressions: https://learn.microsoft.com/azure/notification-hubs/notification-hubs-tags-segment-push-message
- Azure Notification Hubs `SendTemplateNotificationAsync`: https://learn.microsoft.com/dotnet/api/microsoft.azure.notificationhubs.notificationhubclient.sendtemplatenotificationasync
- React Native Firebase Messaging usage: https://rnfirebase.io/messaging/usage

## Issues Found
- The React Native SignalR client used the negotiation endpoint URL in `withUrl`. SignalR clients should be configured with the hub URL, and the client library performs negotiation against `/negotiate`. Changed the URL from `/api/signalr/negotiate` to `/api/signalr`.
- The ASP.NET Core `SignalRController` snippet declared a readonly `ServiceHubContext` field but did not initialize it. Added a constructor that accepts and assigns the injected `ServiceHubContext`.
- The deduplication guidance depended on a notification ID, but the main SignalR and Notification Hubs payloads did not include that ID. Added `NotificationId` initialization and included it in both the SignalR message and template notification properties.
- The reliable delivery example said it always sends both channels, but the code still skipped push when the connection tracker reported the user online. Updated the sample to actually send both channels so client-side deduplication can cover background-transition races.
- The scaling section described Azure SignalR presence as a broad built-in feature. Reworded it to the documented Management SDK user and connection existence checks.

## Review Notes
The Azure CLI command, service mode values, SignalR Standard unit connection limit, Notification Hubs template send with tags, SignalR automatic reconnect usage, and React Native Firebase messaging calls were consistent with current documentation. The snippets remain illustrative and still assume surrounding application setup such as dependency injection registration, hub naming, Notification Hubs device registration templates, and authentication configuration.
