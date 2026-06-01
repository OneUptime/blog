# Validation Summary: How to Build a Shared Augmented Reality Experience with Azure Spatial Anchors

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Spatial Anchors
- Azure SignalR Service
- Azure Functions
- Azure CLI
- Unity
- AR Foundation
- C#
- JavaScript

## Sources Consulted
- Microsoft Learn lifecycle page for Azure Spatial Anchors: https://learn.microsoft.com/en-us/lifecycle/products/azure-spatial-anchors
- Microsoft Learn API reference for CloudSpatialAnchorSession: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.spatialanchors.cloudspatialanchorsession
- Microsoft Learn documentation for Azure Functions SignalR Service input binding: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-signalr-service-input
- Microsoft Learn Azure CLI reference for az signalr: https://learn.microsoft.com/en-us/cli/azure/signalr

## Issues Found
- The post presents Azure Spatial Anchors as a viable service for building a new shared AR application in 2026. Microsoft lists Azure Spatial Anchors with a retirement date of November 20, 2024, so the core service used by the tutorial was already retired before the post date of February 16, 2026.
- Because the article's main implementation depends on a retired Azure service, the tutorial is not salvageable through small corrections without replacing the central technology and substantially rewriting the post. The README.md was not edited.

## Review Notes
The Azure SignalR Service CLI command and SignalR Functions binding concepts are still documented, but they do not make the tutorial usable because the primary Azure Spatial Anchors dependency has been retired. A future replacement article should use a currently supported spatial anchoring or shared AR platform and revalidate the Unity client APIs against that platform's current SDK.
