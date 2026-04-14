# Validation Summary: How to Create a Dapr Virtual Actor with HTTP API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (virtual actor model, HTTP API, placement service)
- Node.js / Express
- Redis (as actor state store)
- Dapr CLI

## Sources Consulted
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actor Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr CLI Reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr State Store Component (Redis): https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found
1. **Deprecated CLI flag `--components-path`**: The `dapr run` command used `--components-path`, which is deprecated since Dapr 1.11 in favor of `--resources-path`. Updated the flag to `--resources-path` while keeping the `./components` directory path unchanged (the flag accepts any directory path).

## Review Notes
- The actor activation callback (`POST /actors/{type}/{id}`) and deactivation callback (`DELETE /actors/{type}/{id}`) are optional endpoints documented in the Dapr actor API. The blog correctly implements both.
- The `/dapr/config` response format with `entities`, `actorIdleTimeout`, `actorScanInterval`, `drainOngoingCallTimeout`, and `drainRebalancedActors` fields all match the official documentation exactly.
- The actor state transaction body format (`[{"operation":"upsert","request":{"key":"...","value":...}}]`) is correct per the Dapr docs.
- All client-side HTTP endpoints (method invocation, state read/write, timers, reminders) use correct methods and paths.
- The `actorStateStore: "true"` metadata on the Redis state store component is the correct way to designate an actor state store.
- Port 3500 (sidecar HTTP) and 50005 (placement service) are correct defaults.
- The blog uses in-memory state for the demo and correctly notes that Dapr state store should be used in production. In a real actor implementation, the actor would use the Dapr state API rather than in-memory state, but this is a reasonable simplification for a tutorial focused on the HTTP API mechanics.
