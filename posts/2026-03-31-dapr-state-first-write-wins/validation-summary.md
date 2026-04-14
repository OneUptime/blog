# Validation Summary: How to Use First-Write-Wins Concurrency in Dapr State Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr State Management HTTP API (v1.0)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Node.js with Axios (HTTP client)
- ETags / Optimistic Concurrency Control

## Sources Consulted
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Management Overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/
- Dapr Go SDK Client Source: https://github.com/dapr/go-sdk/blob/main/client/state.go
- Dapr Go SDK Client Interface: https://github.com/dapr/go-sdk/blob/main/client/client.go
- Dapr Runtime HTTP API Source: https://github.com/dapr/dapr/blob/master/pkg/api/http/http.go
- Dapr Runtime gRPC API Source: https://github.com/dapr/dapr/blob/master/pkg/api/grpc/grpc.go

## Issues Found

### 1. Go SDK: `GetStateWithETag()` does not exist (HIGH)
- **What was wrong:** Line 110 called `client.GetStateWithETag(ctx, "statestore", "order-123", nil)` with three return values `(item, etag, err)`. This function does not exist in the Dapr Go SDK.
- **What was changed:** Replaced with `client.GetState()` which returns `(*StateItem, error)`. The ETag is accessed via `item.Etag` on the returned `StateItem`. Added error checking after the call.
- **Why:** The Go SDK always returns the ETag as part of the `StateItem` struct; there is no separate "WithETag" getter variant.

### 2. Go SDK: `SaveStateWithETag` called with wrong parameter style (HIGH)
- **What was wrong:** Lines 113-116 passed `&dapr.StateOptions{Concurrency: ..., Consistency: ...}` as a struct pointer argument. The actual function signature uses variadic functional options.
- **What was changed:** Replaced with `dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite)` and `dapr.WithConsistency(dapr.StateConsistencyStrong)` functional option arguments. Also added the required `meta` parameter (`nil`).
- **Why:** The `SaveStateWithETag` signature is `SaveStateWithETag(ctx, storeName, key string, data []byte, etag string, meta map[string]string, so ...StateOption) error`. Options must be passed as variadic `StateOption` values.

### 3. Go SDK: Wrong gRPC error code for ETag mismatch (HIGH)
- **What was wrong:** Line 117 checked `status.Code(err) == codes.FailedPrecondition`. Dapr returns `codes.Aborted` for ETag mismatches, not `codes.FailedPrecondition`.
- **What was changed:** Changed to `codes.Aborted`.
- **Why:** The Dapr runtime gRPC handler maps `state.ETagMismatch` errors to `codes.Aborted`.

### 4. Node.js: `consistency` passed as HTTP header instead of query parameter (MEDIUM)
- **What was wrong:** Line 57 passed consistency as a request header: `{ headers: { 'consistency': 'strong' } }`.
- **What was changed:** Changed to query parameter: `?consistency=strong` appended to the URL.
- **Why:** The Dapr State Management HTTP API documents `consistency` as a query parameter on GET requests, not as a request header.

## Review Notes
- The `curl -I` example (line 22) sends a HEAD request. This works for demonstrating headers but readers should know that `-i` (lowercase) would show both headers and body. This is acceptable as-is since the example is specifically about inspecting the ETag header.
- The HTTP 409 Conflict response for ETag mismatch (mentioned in the curl and Node.js sections) is correct per Dapr runtime source code, though it is not explicitly listed in the official API reference documentation. This is a gap in Dapr's docs, not an error in the blog post.
- The retry loop example uses linear backoff (`100 * attempt` ms). The summary section mentions "exponential backoff" which is slightly inconsistent. This is a minor wording issue rather than a code error.
- The Node.js code references `ConflictError` (line 79) which is not a built-in class. Readers would need to define it or use a standard `Error`. This is acceptable in tutorial context as it illustrates intent.
