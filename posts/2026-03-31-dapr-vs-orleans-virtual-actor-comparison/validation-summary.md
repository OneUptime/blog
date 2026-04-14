# Validation Summary: Dapr vs Orleans: Virtual Actor Model Comparison

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Microsoft Orleans (virtual actor framework for .NET)
- Dapr Actors (polyglot virtual actor runtime)
- .NET / C#
- Python (Dapr SDK)
- Dapr HTTP API

## Sources Consulted
- Orleans documentation: https://learn.microsoft.com/en-us/dotnet/orleans/
- Orleans grain persistence docs: https://learn.microsoft.com/en-us/dotnet/orleans/grains/grain-persistence
- Dapr Actors documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr Actor API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Python SDK: https://github.com/dapr/python-sdk

## Issues Found
1. **Orleans grain state management code was incorrect.** The `OrderGrain` class extended `Grain` (without a state type parameter) but called `WriteStateAsync()`, which is only available on `Grain<TState>`. It also used a private `_state` field instead of the inherited `State` property. Fixed by changing the base class to `Grain<OrderState>`, removing the private field, and accessing state via the `State` property. This matches the documented Orleans grain persistence pattern.

## Review Notes
- The Dapr Python actor code correctly uses `self._state_manager` with `set_state()` and `save_state()` methods from the Dapr Python SDK `Actor` base class.
- The Dapr HTTP API endpoint format (`/v1.0/actors/<actorType>/<actorId>/method/<methodName>`) is correct.
- Orleans origin claim ("created at Microsoft Research (2010)") is approximately correct — the research project began around 2010-2011 at MSR, was used in production for Halo, and was open-sourced in January 2015.
- The comparison table is generally accurate. Orleans does support OpenTelemetry for observability, and Dapr provides both its own metrics and OpenTelemetry integration.
- Orleans 7+ introduced a newer declarative persistence pattern using `[PersistentState]` attribute injection via `IPersistentState<T>`, but the `Grain<TState>` pattern used in the fix remains valid and is simpler for illustrative purposes.
