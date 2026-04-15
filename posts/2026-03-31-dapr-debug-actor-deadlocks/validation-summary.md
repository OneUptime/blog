# Validation Summary: How to Debug Actor Deadlocks in Dapr

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — actor building block
- Dapr actor reentrancy configuration
- Dapr HTTP actor invocation API (`v1.0/actors`)
- Go (net/http, context)
- Kubernetes (kubectl log analysis)
- Dapr pub/sub for decoupling actor calls

## Sources Consulted
- Dapr Actors Overview documentation (https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/) — turn-based concurrency model
- Dapr Actor Reentrancy documentation (https://docs.dapr.io/developing-applications/building-blocks/actors/actor-reentrancy/) — reentrancy configuration fields and behavior
- Dapr Actors API reference (https://docs.dapr.io/reference/api/actors_api/) — HTTP invocation URL pattern and supported methods (POST/GET/PUT/DELETE)
- Dapr Configuration spec (https://docs.dapr.io/reference/resource-specs/configuration-schema/) — Configuration resource YAML structure
- Dapr source code (`pkg/config/app_configuration.go`, `pkg/actors/api/config.go`) — JSON field names and default maxStackDepth value
- Go standard library documentation for `context`, `net/http`, `fmt` packages

## Issues Found
1. **Incorrect reentrancy configuration field name (line 40):** The YAML configuration used `reentrancyConfig` as the field name under `spec.actor`. The correct Dapr field name is `reentrancy`. This was confirmed from the Dapr source code where the struct tag is `json:"reentrancy"` and from official documentation. Changed `reentrancyConfig` to `reentrancy`.

## Review Notes
- The actor HTTP API correctly uses `PUT` — Dapr accepts POST, GET, PUT, and DELETE for actor method invocation. PUT matches the convention Dapr itself uses when calling back into the application.
- The default `maxStackDepth` of 32 shown in the example matches the Dapr default (`DefaultReentrancyStackLimit = 32`), which is a good choice for illustration.
- The Go code ignores the error from `http.NewRequestWithContext` (uses `_`). This is acceptable for illustrative code but would not be recommended in production.
- The `map[string]any` syntax requires Go 1.18+. This is current and appropriate.
- The pub/sub decoupling pattern shown as an alternative to circular actor calls is a well-documented Dapr best practice.
