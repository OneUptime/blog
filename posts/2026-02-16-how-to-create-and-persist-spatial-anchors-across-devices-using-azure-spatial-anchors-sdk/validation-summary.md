# Validation Summary: How to Create and Persist Spatial Anchors Across Devices

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Spatial Anchors
- Azure CLI
- Unity
- C#
- AR Foundation
- HoloLens
- ARKit
- ARCore

## Sources Consulted
- Microsoft Learn lifecycle page for Azure Spatial Anchors: https://learn.microsoft.com/en-us/lifecycle/products/azure-spatial-anchors
- Azure Spatial Anchors retirement migration guidance: https://azure.microsoft.com/en-us/updates?id=azure-spatial-anchors-retirement
- Microsoft Learn API reference for `CloudSpatialAnchorSession`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.spatialanchors.cloudspatialanchorsession?view=spatialanchors-dotnet
- Microsoft Learn API reference for `SessionStatus`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.spatialanchors.sessionstatus?view=spatialanchors-dotnet
- Microsoft Learn API reference for the `Microsoft.Azure.SpatialAnchors` namespace: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.spatialanchors?view=spatialanchors-dotnet

## Issues Found
- Azure Spatial Anchors is retired. Microsoft lists Azure Spatial Anchors with a retirement date of November 20, 2024. This post is dated February 16, 2026 and presents the retired service as a usable current Azure service, including instructions to create accounts and build production workflows around it. Because the core service is no longer available for new current implementations, the post should be removed or replaced rather than edited in place.
- The code examples also contain implementation problems that would need correction if this were archival content. For example, the create-progress loop uses `!cloudSession.GetSessionStatusAsync().Result.RecommendedForCreateProgress >= 1.0f`, which is not valid C# logic because `!` cannot be applied to the float progress value. The examples also use helper methods such as `AddARAnchor()`, `FindNativeAnchor()`, `GetPointer()`, `GetPose()`, and `UnityDispatcher.InvokeOnAppThread()` without showing the required supporting packages or helper implementations.

## Review Notes
The post has technical implementation details, but it is not suitable as a current software engineering tutorial because its central platform was retired before the post date. A replacement article should use currently supported AR anchor/sharing options rather than Azure Spatial Anchors.
