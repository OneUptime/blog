# Validation Summary: How to Install and Configure the Dapr .NET SDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET / ASP.NET Core
- C#
- NuGet package management
- Dependency Injection in ASP.NET Core

## Sources Consulted
- Dapr .NET SDK GitHub repository (https://github.com/dapr/dotnet-sdk) — verified DaprClientBuilder API methods, DaprServiceCollectionExtensions, DaprMvcBuilderExtensions, DaprApplicationBuilderExtensions, DaprEndpointRouteBuilderExtensions, and DaprDefaults source files
- Dapr official documentation (https://docs.dapr.io/developing-applications/sdks/dotnet/)

## Issues Found
No technical issues found.

All code examples, API method signatures, NuGet package names, environment variables, default ports, and DI registration patterns were verified against the Dapr .NET SDK source code and confirmed correct:

- NuGet packages (`Dapr.Client`, `Dapr.AspNetCore`, `Dapr.Actors`, `Dapr.Actors.AspNetCore`) are correct.
- `DaprClientBuilder` methods (`UseDaprApiToken`, `UseHttpEndpoint`, `UseGrpcEndpoint`, `UseTimeout`) all exist with the correct signatures.
- `AddDaprClient()` accepts an `Action<DaprClientBuilder>` configuration lambda as shown.
- `AddControllers().AddDapr()` is the correct extension method for Dapr model binding.
- `UseCloudEvents()` and `MapSubscribeHandler()` are correct middleware registration calls.
- `SaveStateAsync`, `PublishEventAsync`, and `GetStateAsync` parameter orders are correct.
- DaprClient defaults to singleton registration in DI as claimed.
- Environment variables `DAPR_HTTP_PORT`, `DAPR_GRPC_PORT`, and `DAPR_API_TOKEN` are correct.
- Default ports (HTTP: 3500, gRPC: 50001) are correct.

## Review Notes
- The Dapr .NET SDK also supports `DAPR_HTTP_ENDPOINT` and `DAPR_GRPC_ENDPOINT` environment variables, which take precedence over the port-based variables. These are useful for remote Dapr sidecar scenarios but their omission is not an error — the post focuses on the common local development setup.
- The `AddDaprClient` method also accepts an optional `ServiceLifetime` parameter (defaulting to `ServiceLifetime.Singleton`), allowing scoped or transient registration. The post's claim of singleton registration is correct for the default behavior.
