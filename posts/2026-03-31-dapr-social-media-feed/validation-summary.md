# Validation Summary: How to Build a Social Media Feed with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub API
- Dapr Actors API
- Dapr State Management API
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk`)

## Sources Consulted
- Dapr Go SDK client interface (`client.Client`) — actor invocation methods: https://github.com/dapr/go-sdk/blob/main/client/actor.go
- Dapr Go SDK `InvokeActorRequest` / `InvokeActorResponse` types: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK pub/sub handler signature (`common.TopicEvent`): https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Actors overview and state management: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Pub/Sub building block: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Go `net/http` `Request.PathValue` (Go 1.22+): https://pkg.go.dev/net/http

## Issues Found

### 1. `InvokeActorMethod` does not exist in the Dapr Go SDK (two occurrences)

**What was wrong:** The blog used `daprClient.InvokeActorMethod(ctx, actorType, actorID, method, data, result)` in both the fan-out handler and the feed API endpoint. This method does not exist in the Dapr Go SDK. The actual client method is `InvokeActor(ctx, *InvokeActorRequest)` which returns `(*InvokeActorResponse, error)`.

**What was changed:**

- **Fan-out handler** (`handleNewPost`): Replaced `InvokeActorMethod(ctx, "Feed", followerID, "AddActivity", activity, nil)` with `InvokeActor(ctx, &dapr.InvokeActorRequest{ActorType: "Feed", ActorID: followerID, Method: "AddActivity", Data: activityData})`. Also added `json.Marshal(activity)` before the loop to serialize the activity data to `[]byte` as required by the `InvokeActorRequest.Data` field.

- **Feed API** (`handleGetFeed`): Replaced `InvokeActorMethod(r.Context(), "Feed", userID, "GetFeed", struct{...}, &activities)` with `InvokeActor` using an `InvokeActorRequest` struct. Added `json.Marshal` for the request data and `json.Unmarshal(resp.Data, &activities)` to deserialize the response, since `InvokeActor` returns raw bytes in `InvokeActorResponse.Data`.

**Why:** The `InvokeActorMethod` convenience method may be confused with patterns from other Dapr SDKs (e.g., .NET's `ActorProxy.InvokeMethodAsync`), but it does not exist in the Go SDK. The Go SDK exclusively uses the `InvokeActor` method with a request/response struct pattern.

## Review Notes
- The post uses two different state store names: `"statestore"` (for saving posts in `handleCreatePost`) and `"social-store"` (for follower data in `handleNewPost` and `handleFollow`). This is technically valid (an app can use multiple state stores), but could be confusing in a tutorial context. A note explaining the choice or using a single store name would improve clarity.
- The `r.PathValue("userId")` call in `handleFollow` requires Go 1.22+ (`net/http` enhanced routing). This is current and correct but worth noting for readers on older Go versions.
- Error handling is minimal throughout (many errors are silently ignored with `_`). This is acceptable for a tutorial focused on the Dapr patterns, but production code should handle these errors.
- The claim that feed reads are "O(1)" in the summary is a simplification — reads are O(k) where k is the page size, but since page size is bounded, this is a reasonable characterization.
