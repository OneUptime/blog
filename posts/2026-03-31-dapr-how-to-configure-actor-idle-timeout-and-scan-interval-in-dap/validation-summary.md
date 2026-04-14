# Validation Summary: How to Configure Actor Idle Timeout and Scan Interval in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (Actors)
- C# / .NET (ASP.NET Core)
- Python (memory estimation script)
- Prometheus (metrics/monitoring)
- Grafana (alerting)
- Kubernetes (deployment context)

## Sources Consulted
- Dapr actor runtime configuration documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr .NET SDK actor usage: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET SDK actor how-to: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/
- Dapr metrics documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr .NET SDK ActorStateManager source: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/ActorStateManager.cs

## Issues Found

1. **Incorrect Prometheus metric names**: The blog used `dapr_actor_activated_total`, `dapr_actor_deactivated_total`, and `dapr_actor_active_actors` which do not exist. The actual Dapr runtime metrics use the `dapr_runtime_actor_` prefix. Fixed the monitoring section to use `dapr_runtime_actor_deactivated_total` and `dapr_runtime_actor_pending_actor_calls`, and updated the `grep` filter and Grafana alert accordingly.

2. **Incorrect actor lifecycle step - state loading**: The lifecycle description claimed "State is loaded from the configured state store" as a distinct automatic step during activation. In reality, state is loaded on-demand when accessed via `StateManager` methods, not automatically during activation. Fixed the lifecycle to clarify state is loaded on-demand.

3. **Grafana alert name and description inconsistency**: After correcting the metric name from `dapr_actor_activated_total` to `dapr_runtime_actor_deactivated_total`, updated the alert name from `DaprActorHighActivationRate` to `DaprActorHighDeactivationRate` and the summary annotation to match.

## Review Notes
- The .NET SDK configuration properties (`ActorIdleTimeout`, `ActorScanInterval`, `DrainOngoingCallTimeout`, `DrainRebalancedActors`) are all correct with accurate default values.
- The `[Actor(TypeName = "DeviceTwin")]` attribute, `GetOrAddStateAsync`, and `OnActivateAsync`/`OnDeactivateAsync` signatures are all valid.
- The `System.Timers.Timer` usage inside an actor's `OnActivateAsync` works but is unconventional — Dapr provides built-in actor timers and reminders that are more idiomatic. This is not technically wrong but could be noted as a best-practice consideration in a future revision.
- The `_activationCount` field will always be 1 after activation since the actor object is newly instantiated each time; this counter doesn't persist across activations. This is not incorrect per se (the code works), but could be misleading to readers who expect it to track cumulative activations.
- The Python memory estimation script is correct and useful as a rough planning tool.
- The default metrics port (9090) is correct for Dapr.
