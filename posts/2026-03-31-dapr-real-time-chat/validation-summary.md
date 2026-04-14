# Validation Summary: How to Build a Real-Time Chat Application with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Pub/Sub, State Management, Actors)
- Go (Dapr Go SDK - `github.com/dapr/go-sdk`)
- WebSockets (gorilla/websocket)
- Kubernetes (Deployment with Dapr sidecar annotations)

## Sources Consulted
- Dapr Go SDK source and API documentation (`github.com/dapr/go-sdk/client`) — verified `GetState`, `SaveState`, `PublishEvent` signatures and `StateItem` struct fields
- Dapr Go SDK `common.TopicEvent` struct — verified `RawData []byte` field exists
- Dapr Kubernetes annotations documentation — verified `dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port` annotation names and value formats

## Issues Found
1. **Bug in `HandleRoomMessage` — incorrect `GetState` result usage (line 114):** `json.Unmarshal(roomData, &memberIDs)` was passing the `*StateItem` directly to `json.Unmarshal`, which expects `[]byte`. Fixed to `json.Unmarshal(roomData.Value, &memberIDs)`. The same pattern was handled correctly elsewhere in the post (`saveMessage` and `getHistory` both use `.Value`), so this was an inconsistency/typo.

## Review Notes
- The architecture diagram mentions "Dapr Actors --> per-user session management" but no actor code is shown in the post. This is not an error — it serves as an architectural hint — but readers may expect actor examples.
- The Kubernetes YAML is intentionally a partial snippet showing only Dapr-relevant annotations. It is missing required fields (`spec.selector`, `spec.template.spec.containers`) but this is acceptable for a focused blog snippet.
- The `saveMessage` function uses a read-modify-write pattern on state without concurrency control (e.g., ETags). Under concurrent writes from multiple instances, this could lose messages. This is a design limitation worth noting but not a code correctness error for a tutorial.
