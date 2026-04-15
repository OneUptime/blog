# Validation Summary: How to Use Dependency Injection with Dapr .NET SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr .NET SDK (Dapr.Client, Dapr.AspNetCore, Dapr.Actors, Dapr.Actors.AspNetCore)
- .NET Dependency Injection (IServiceCollection)
- ASP.NET Core (WebApplication, controllers, BackgroundService)
- gRPC (DaprClient gRPC channel)
- Dapr Actors (IActorProxyFactory, ActorId)

## Sources Consulted
- Dapr .NET SDK source code (dapr/dotnet-sdk GitHub repository)
  - `src/Dapr.AspNetCore/DaprServiceCollectionExtensions.cs` — AddDaprClient() registration and lifetime defaults
  - `src/Dapr.Client/DaprClientBuilder.cs` — UseGrpcEndpoint, UseHttpEndpoint, UseJsonSerializationOptions method signatures
  - `src/Dapr.Client/DaprClient.cs` — GetStateAsync, SaveStateAsync, PublishEventAsync method signatures
  - `src/Dapr.Actors/Client/IActorProxyFactory.cs` — IActorProxyFactory interface and CreateActorProxy<T> signature
  - `src/Dapr.Actors.AspNetCore/ActorsServiceCollectionExtensions.cs` — AddActors() registration method

## Issues Found
1. **`AddActorProxyFactory()` does not exist** — The blog post called `builder.Services.AddActorProxyFactory()` to register the actor proxy factory. This method does not exist in the Dapr .NET SDK. The correct method is `builder.Services.AddActors(options => { })`, which is an extension method from the `Dapr.Actors.AspNetCore` package. It registers `IActorProxyFactory` (along with `ActorRuntime` and `ActorActivatorFactory`) into the DI container automatically. Fixed the call from `AddActorProxyFactory()` to `AddActors(options => { })`.

## Review Notes
- The `AddDaprClient()` method accepts an optional `ServiceLifetime lifetime` parameter (defaulting to `ServiceLifetime.Singleton`), so the singleton claim is accurate.
- `IActorProxyFactory.CreateActorProxy<T>(ActorId, string)` has an additional optional third parameter `ActorProxyOptions options = null` and a generic constraint `where T : IActor`. The blog usage is correct since the third parameter is optional, but readers implementing `ICartActor` should ensure it extends `IActor`.
- The DaprClient methods (`GetStateAsync`, `SaveStateAsync`, `PublishEventAsync`) all have additional optional parameters (e.g., `ConsistencyMode`, `StateOptions`, `metadata`) beyond what the blog shows. The simplified usage shown is correct and idiomatic.
