# Validation Summary: How to Use Dapr with ASP.NET Core

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- ASP.NET Core (minimal APIs and controllers)
- Dapr .NET SDK (`Dapr.AspNetCore`, `Dapr.Client`)
- Dapr pub/sub building block
- Dapr state management building block
- Dapr service invocation building block
- Dapr CLI

## Sources Consulted
- Dapr .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/
- Dapr .NET Client SDK reference: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr pub/sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr state management how-to guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr .NET SDK GitHub source (DaprMvcBuilderExtensions.cs, DaprClient.cs): https://github.com/dapr/dotnet-sdk
- NuGet package pages for Dapr.AspNetCore and Dapr.Client

## Issues Found

### 1. Redundant `AddDaprClient()` call (Low severity)
- **What was wrong:** The `Program.cs` setup called both `builder.Services.AddControllers().AddDapr()` and `builder.Services.AddDaprClient()`. Since `AddDapr()` internally calls `AddDaprClient()`, the second call was redundant.
- **What was changed:** Removed the `builder.Services.AddDaprClient();` line and the separate `dotnet add package Dapr.Client` install command (it is a dependency of `Dapr.AspNetCore`).
- **Why:** While harmless (it uses `TryAddSingleton`), showing redundant registration is misleading for readers learning the SDK.

### 2. Deprecated `--components-path` CLI flag (Medium severity)
- **What was wrong:** The `dapr run` command used `--components-path`, which is deprecated.
- **What was changed:** Replaced `--components-path` with `--resources-path`.
- **Why:** `--resources-path` is the current recommended flag in the Dapr CLI.

### 3. Inaccurate summary claim about `AddDapr()` (Medium severity)
- **What was wrong:** The summary stated "The `AddDapr()` extension wires up controllers for CloudEvents." In reality, `AddDapr()` registers Dapr MVC integration (model binders, DaprClient in DI). CloudEvents handling is done by the `UseCloudEvents()` middleware, not `AddDapr()`.
- **What was changed:** Rewrote the summary sentence to correctly attribute CloudEvents handling to `UseCloudEvents()` and describe `AddDapr()` as registering Dapr integration and DI.
- **Why:** Conflating these two methods gives readers an incorrect mental model of which component does what.

## Review Notes
- `DaprClient.InvokeMethodAsync` (used in the service invocation example) is marked `[Obsolete]` in the SDK with guidance to use native `HttpClient` via `DaprClient.CreateInvokableHttpClient()` or `IHttpClientFactory` instead. It still functions and is not slated for removal, but a future update of this post could migrate to the recommended HTTP client approach.
- The `[Topic]` attribute usage on both controllers and minimal APIs is correct and well-demonstrated.
- State management API calls (`SaveStateAsync`, `DeleteStateAsync`) are accurate.
- Both NuGet packages (`Dapr.AspNetCore` v1.17.8, `Dapr.Client` v1.17.8) are actively maintained as of April 2026.
