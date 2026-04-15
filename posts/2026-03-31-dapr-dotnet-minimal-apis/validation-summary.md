# Validation Summary: How to Use Dapr with .NET Minimal APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET Minimal APIs (ASP.NET Core)
- Dapr .NET SDK (`Dapr.Client`, `Dapr.AspNetCore`)
- Dapr building blocks: service invocation, state management, pub/sub, secrets

## Sources Consulted
- Dapr .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/
- Dapr.Client NuGet package: https://www.nuget.org/packages/Dapr.Client
- Dapr.AspNetCore NuGet package: https://www.nuget.org/packages/Dapr.AspNetCore/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr pub/sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr state management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr secrets documentation: https://docs.dapr.io/developing-applications/building-blocks/secrets/

## Issues Found
1. **`--components-path` flag is deprecated in favor of `--resources-path`**: In the "Running the Service" section, the `dapr run` command used `--components-path`, which was deprecated in Dapr CLI v1.11+ and replaced by `--resources-path`. The old flag still functions but emits a deprecation warning. Changed to `--resources-path` to align with current Dapr CLI standards.

## Review Notes
- The `[Topic]` attribute inline syntax on minimal API lambdas is valid C# 10+ and works correctly with Dapr's `MapSubscribeHandler()` endpoint metadata discovery. An alternative fluent syntax (`.WithTopic()`) also exists but is not required.
- NuGet packages `Dapr.Client` and `Dapr.AspNetCore` are current (v1.16.x as of review date) and non-deprecated.
- All DaprClient method signatures (`InvokeMethodAsync`, `GetStateAsync`, `SaveStateAsync`, `PublishEventAsync`, `GetSecretAsync`) are correct and use current, non-deprecated APIs.
- The bootstrapping pattern (`AddDaprClient()`, `UseCloudEvents()`, `MapSubscribeHandler()`) is the standard recommended setup for Dapr with ASP.NET Core minimal APIs.
- `GetSecretAsync` correctly returns `Dictionary<string, string>`, and the `ContainsKey` check shown is appropriate.
