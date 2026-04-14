# Validation Summary: How to Develop Dapr Pluggable Pub/Sub Components

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pluggable Components
- Dapr Go Components SDK (`github.com/dapr-sandbox/components-go-sdk`)
- Dapr Components Contrib (`github.com/dapr/components-contrib`)
- Go (Golang)
- gRPC
- Pub/Sub messaging pattern

## Sources Consulted
- Dapr pluggable components Go SDK documentation: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-sdks/pluggable-components-go/
- Dapr Go pub/sub pluggable component guide: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-sdks/pluggable-components-go/go-pub-sub/
- `components-go-sdk` pubsub/v1 interface source: https://github.com/dapr-sandbox/components-go-sdk/blob/main/pubsub/v1/pubsub.go (confirms PubSub interface wraps `contribPubSub.PubSub`)
- `components-go-sdk` go.mod: https://github.com/dapr-sandbox/components-go-sdk/blob/main/go.mod (confirms dependency on components-contrib v1.11.3)
- `components-contrib` PubSub interface: https://github.com/dapr/components-contrib/blob/main/pubsub/pubsub.go
- `components-contrib` pub/sub type definitions: https://github.com/dapr/components-contrib/blob/main/pubsub/requests.go
- `components-contrib` feature constants: https://github.com/dapr/components-contrib/blob/main/pubsub/feature.go
- Dapr component proto definitions: https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/pubsub.proto
- Dapr environment variables reference: https://docs.dapr.io/reference/environment/
- Dapr component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr subscription schema reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/

## Issues Found

### 1. Wrong import and type system (Critical)
**What was wrong:** The post imported `proto "github.com/dapr/dapr/pkg/proto/components/v1"` and used raw gRPC proto types (`proto.TopicEventRequest`, `proto.PubSubInitRequest`, `proto.PublishRequest`, `proto.SubscribeRequest`, `proto.PubSub_SubscribeServer`, etc.) for all method signatures. The Go SDK (`components-go-sdk`) wraps the `components-contrib/pubsub` interface, not the raw proto types. Types like `proto.SubscribeRequest` and `proto.PubSub_SubscribeServer` don't even exist in the components proto (the gRPC method is `PullMessages`, not `Subscribe`).
**What was changed:** Replaced the proto import with `"github.com/dapr/components-contrib/pubsub"` and updated all method signatures and types to use the correct components-contrib types (`pubsub.Metadata`, `pubsub.PublishRequest`, `pubsub.NewMessage`, `pubsub.SubscribeRequest`, `pubsub.Handler`, `pubsub.Feature`).

### 2. Wrong method signatures (Critical)
**What was wrong:** All methods had incorrect signatures:
- `Init(ctx context.Context, req *proto.PubSubInitRequest) (*proto.PubSubInitResponse, error)` — should be `Init(metadata pubsub.Metadata) error`
- `Features(ctx context.Context, req *proto.FeaturesRequest) (*proto.FeaturesResponse, error)` — should be `Features() []pubsub.Feature`
- `Publish(ctx context.Context, req *proto.PublishRequest) (*proto.PublishResponse, error)` — should be `Publish(req *pubsub.PublishRequest) error`
- `Subscribe(req *proto.SubscribeRequest, stream proto.PubSub_SubscribeServer) error` — should be `Subscribe(ctx context.Context, req pubsub.SubscribeRequest, handler pubsub.Handler) error`
**What was changed:** All method signatures corrected to match the `components-contrib/pubsub.PubSub` interface.

### 3. Wrong Subscribe pattern (Critical)
**What was wrong:** Subscribe used a blocking server-streaming pattern (for loop reading from channel and sending to a gRPC stream). The SDK expects a handler-callback pattern where Subscribe starts a goroutine and returns immediately.
**What was changed:** Rewrote Subscribe to spawn a goroutine that reads from the channel and invokes the handler callback, returning nil immediately per the SDK pattern.

### 4. Missing Close method (Major)
**What was wrong:** The `io.Closer` interface (`Close() error`) is embedded in `pubsub.PubSub` but was not implemented, which would cause a compile error.
**What was changed:** Added `Close() error` method returning nil.

### 5. Wrong environment variable name (Major)
**What was wrong:** Used `DAPR_COMPONENT_SOCKET_FOLDER=/tmp/dapr-components`. The correct variable is `DAPR_COMPONENTS_SOCKETS_FOLDER` (plural "COMPONENTS" and "SOCKETS") and the default path is `/tmp/dapr-components-sockets`.
**What was changed:** Fixed to `DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets`.

### 6. Incorrect interface description (Minor)
**What was wrong:** Listed required methods as "Init, Features, Publish, Subscribe, and Ping". Ping is auto-implemented by the SDK and not part of the developer-facing interface. Close was missing from the list.
**What was changed:** Changed to "Init, Features, Publish, Subscribe, and Close".

### 7. Missing components-contrib dependency in setup (Minor)
**What was wrong:** Setup only ran `go get` for the SDK. Since the implementation directly imports `github.com/dapr/components-contrib/pubsub`, this dependency should be explicitly installed.
**What was changed:** Added `go get github.com/dapr/components-contrib@latest` to the setup commands.

### 8. Wrong acknowledgment handling code (Major)
**What was wrong:** Used proto stream-based ack/nack pattern (`stream.Send`, `stream.Recv`, `proto.TopicEventResponse_RETRY`). In the handler model, acknowledgment is implicit: handler returning nil = ack, handler returning error = nack/retry.
**What was changed:** Rewrote to use handler-based pattern where errors from the handler trigger re-enqueue.

### 9. Features return type (Minor)
**What was wrong:** Used `[]string{"MESSAGE_TTL"}` as features. The SDK uses typed constants via `pubsub.Feature` type.
**What was changed:** Changed to `[]pubsub.Feature{pubsub.FeatureMessageTTL}`.

## Review Notes
- The component manifest (`apiVersion: dapr.io/v1alpha1`, `type: pubsub.custom-pubsub`) and subscription configuration (`apiVersion: dapr.io/v2alpha1`) are correct.
- The `components-go-sdk` is pinned to components-contrib v1.11.3 (mid-2023). The current components-contrib main branch has added `context.Context` parameters to `Init` and `Publish`, but the SDK version does not require them. If the SDK updates its dependency, these method signatures would need to change.
- The SDK's `pubsub.PubSub` interface also embeds `metadata.ComponentWithMetadata` in newer components-contrib versions, but the SDK's pinned version does not require implementing `GetComponentMetadata()`.
- The `BulkPublisher` interface is optional and not discussed in this tutorial, which is fine for an introductory post.
- The curl test command assumes a Dapr sidecar is running on port 3500, which requires additional setup not shown (e.g., `dapr run` with the component config). This is acceptable for a tutorial that focuses on the component implementation itself.
