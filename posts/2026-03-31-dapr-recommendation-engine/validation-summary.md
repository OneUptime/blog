# Validation Summary: How to Build a Recommendation Engine Backend with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Actors (per-user state management)
- Dapr Pub/Sub (behavioral event processing)
- Dapr Service Invocation (ML model serving)
- Dapr State Store (popular items cache)
- Go programming language

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk
- Dapr Go SDK actor package (`actor/actor.go`, `actor/manager.go`)
- Dapr Go SDK client package (`client/client.go`, `client/actor.go`, `client/invoke.go`, `client/state.go`)
- Dapr Go SDK service/common package (`service/common/type.go`)
- Dapr Actors documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/
- Dapr Service Invocation documentation: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/
- Dapr State Management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/

## Issues Found

### 1. Deprecated `actor.ServerImplBase` (compilation would succeed but uses deprecated API)
- **What was wrong:** The actor struct embedded `actor.ServerImplBase`, which is deprecated in the Dapr Go SDK in favor of `actor.ServerImplBaseCtx`.
- **What was changed:** Replaced `actor.ServerImplBase` with `actor.ServerImplBaseCtx`.
- **Why:** `ServerImplBase` is explicitly deprecated; `ServerImplBaseCtx` is the current recommended base type and provides context-aware state manager methods matching the signatures used in the post.

### 2. Missing `"time"` import
- **What was wrong:** The first code block called `time.Now().Unix()` but did not include `"time"` in the import block.
- **What was changed:** Added `"time"` to the import statement.
- **Why:** Without this import, the code would not compile.

### 3. `InvokeActorMethod` does not exist in the Dapr Go SDK
- **What was wrong:** The blog called `daprClient.InvokeActorMethod(ctx, actorType, actorID, method, data, response)` in both the Behavior Event Processor and Recommendation Service sections. This method does not exist in the Dapr Go SDK client.
- **What was changed:** Replaced all `InvokeActorMethod` calls with `InvokeActor(ctx, *InvokeActorRequest)`, which is the actual SDK method. Updated the code to marshal request data to `[]byte` before passing it, and to unmarshal response data from `InvokeActorResponse.Data`.
- **Why:** The original code would fail to compile. `InvokeActor` with `InvokeActorRequest`/`InvokeActorResponse` is the correct API.

### 4. Nil map panic in `RecordPurchase`
- **What was wrong:** `RecordPurchase` accessed `profile.CategoryScores[req.Category]` without checking if the map was nil. If this method were called before any `RecordView` (which had the nil check), it would panic with a nil map assignment.
- **What was changed:** Added a nil check (`if profile.CategoryScores == nil`) with map initialization, matching the pattern already used in `RecordView`.
- **Why:** Writing to a nil map in Go causes a runtime panic.

## Review Notes
- The code snippets are illustrative/pedagogical and omit some imports (e.g., the Behavior Event Processor and Recommendation Service sections don't show full import blocks). This is acceptable for a blog post but readers should be aware they need to add appropriate imports.
- The `InvokeMethodWithContent` usage references `dapr.DataContent` — the actual type is `client.DataContent` from `github.com/dapr/go-sdk/client`. This works if the import is aliased as `dapr`, which is a common convention in Dapr Go examples.
- Several error return values from `json.Unmarshal` and `json.Marshal` are ignored with `_`. This is common in blog examples for brevity, but production code should handle these errors.
- The `filterPurchased` and `computePopularItems` helper functions are referenced but not defined, which is fine for a tutorial focused on demonstrating Dapr patterns.
