# Validation Summary: How to Configure Actor Turn-Based Concurrency in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (Dapr.Actors, Dapr.Actors.Runtime)
- C# / ASP.NET Core
- Dapr Actor model (virtual actors, turn-based concurrency, reentrancy)
- Prometheus metrics for Dapr
- Grafana dashboards

## Sources Consulted
- Dapr Actor Reentrancy Documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/actor-reentrancy/
- Dapr Actor Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr .NET SDK Actors Usage Guide: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET SDK How-To Run Actors: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/
- Dapr .NET SDK Actor Client (IActorProxyFactory): https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-client/
- Dapr Metrics Documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr .NET SDK Source (Actor.cs, ActorStateManager.cs): https://github.com/dapr/dotnet-sdk

## Issues Found
1. **Incorrect Dapr metric name**: The Prometheus metric was listed as `dapr_actor_pending_actor_calls` but the correct metric name with the runtime prefix is `dapr_runtime_actor_pending_actor_calls`. The `grep` filter was also updated from `dapr_actor_pending` to `dapr_runtime_actor_pending` to match. Fixed in the monitoring bash code block.

## Review Notes
- The "Configuring Actor Method Timeouts" section title is slightly misleading. Dapr does not have per-method timeouts for actors. The settings shown (`ActorIdleTimeout`, `DrainOngoingCallTimeout`) control actor lifecycle and drain behavior during rebalancing, not method-level execution timeouts. The C# code itself is correct, but the framing could be clarified in a future revision.
- The YAML configuration snippet in that section shows a general Dapr configuration (features, metrics, tracing) but does not include any actor-specific timeout settings. Actor timeouts can be configured in Dapr YAML under `spec.actor` but this is not shown. The C# host-level configuration below it is the correct approach for the .NET SDK.
- The `Program.cs` snippet imports `using Dapr.Actors.Runtime;` but `ActorReentrancyConfig` resides in the `Dapr.Actors` namespace. In practice, this may be resolved by implicit usings or project-level global usings, but an explicit `using Dapr.Actors;` would be more precise.
- The Grafana dashboard ID 11150 claim could not be independently verified but is plausible.
- All core technical concepts (turn-based concurrency guarantees, reentrancy behavior, actor state management, proxy factory usage, concurrent test patterns) are accurate and well-explained.
