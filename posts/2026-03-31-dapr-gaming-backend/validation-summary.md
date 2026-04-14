# Validation Summary: How to Use Dapr for Gaming Backend Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) — state management, pub/sub, actors
- Go with Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Gin web framework for Go (`github.com/gin-gonic/gin`)
- C# / .NET with Dapr .NET Actors SDK (`Dapr.Actors.Runtime`)
- Python with Dapr Python SDK (`dapr-client`) and Flask

## Sources Consulted
- Dapr Go SDK client interface — `SaveStateWithETag` method signature, `GetState` return types, `StateItem` struct definition (https://github.com/dapr/go-sdk)
- Dapr .NET Actors SDK — actor class definition patterns, `ActorHost` constructor, `RegisterTimerAsync`/`UnregisterTimerAsync` signatures, actor type registration (https://github.com/dapr/dotnet-sdk)
- Dapr Python SDK — `DaprClient.get_state()` return type (`StateResponse.data` is `bytes`), `save_state()` parameter types (https://github.com/dapr/python-sdk)
- Python `json.loads` documentation — accepts `str`, `bytes`, and `bytearray`

## Issues Found

1. **Go code — `SaveStateWithETag` data parameter type**: The call passed `string(updated)` as the data argument, but `SaveStateWithETag` expects `[]byte`, not `string`. Since `json.Marshal` already returns `[]byte`, the correct argument is `updated` directly. Also removed an extra trailing `nil` argument that did not match the method signature (`storeName, key string, data []byte, etag string, meta map[string]string, so ...StateOption`). Changed `string(updated), state.Etag, nil, nil` to `updated, state.Etag, nil`.

2. **C# code — non-existent `[Actor(TypeName = "...")]` attribute**: The `[Actor(TypeName = "GameSessionActor")]` attribute does not exist in the Dapr .NET Actors SDK (`Dapr.Actors.Runtime`). Actor type names are configured during service registration (e.g., `options.Actors.RegisterActor<GameSessionActor>()`), not via class-level attributes. Removed the attribute line.

## Review Notes
- The Go code references `InventoryItem` (type) and `xpForLevel` (function) without defining them. This is acceptable for a blog post that focuses on Dapr patterns rather than a complete application.
- The C# code references a `GameTick` method via `nameof(GameTick)` in the timer registration, but the method is not defined in the shown snippet. This is fine for illustrative purposes.
- The Python leaderboard implementation uses a read-modify-write pattern on the top-100 list without ETag-based concurrency control. Under high write throughput this could lose updates, but this is an acceptable simplification for a tutorial.
- The Python code's `client.get_state(...).data or "[]"` pattern works correctly because `StateResponse.data` returns `bytes` (empty `b""` is falsy), and `json.loads` accepts both `bytes` and `str`.
