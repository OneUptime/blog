# Validation Summary: How to Develop Custom Dapr Name Resolution Components

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, name resolution building block)
- Go (components-contrib Resolver interface)
- gRPC (Dapr sidecar communication)
- Service discovery (custom service registries)

## Sources Consulted
- [Dapr pluggable components overview](https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-overview/) — confirms supported pluggable component types: State Store, Pub/Sub, Bindings, Secret Stores (NOT name resolution)
- [Dapr pluggable components Go SDK](https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-sdks/pluggable-components-go/) — confirms SDK only supports state store, pub/sub, and bindings
- [dapr-sandbox/components-go-sdk GitHub](https://github.com/dapr-sandbox/components-go-sdk) — verified no `nameresolution/v1` subpackage exists
- [dapr/dapr proto/components/v1 directory](https://github.com/dapr/dapr/tree/master/dapr/proto) — confirmed proto files: `state.proto`, `pubsub.proto`, `bindings.proto`, `secretstore.proto`, `common.proto` — no `nameresolution.proto`
- [dapr/components-contrib nameresolution package](https://pkg.go.dev/github.com/dapr/components-contrib/nameresolution) — verified correct Resolver interface: `Init`, `ResolveID`, `Close`
- [Dapr name resolution component specs](https://docs.dapr.io/reference/components-reference/supported-name-resolution/) — verified built-in resolvers and Configuration-based setup
- [Dapr Configuration spec](https://docs.dapr.io/reference/resource-specs/configuration-schema/) — verified nameResolution configuration format
- [How to implement pluggable components](https://docs.dapr.io/developing-applications/develop-components/pluggable-components/develop-pluggable/) — confirmed pluggable component architecture details

## Issues Found

1. **Fundamental premise error: name resolution is NOT a pluggable component type**
   - The original post described building a "pluggable" name resolution component using `dapr-sandbox/components-go-sdk`. Dapr's pluggable component framework only supports State Store, Pub/Sub, Bindings, and Secret Stores. Name resolution is implemented as a built-in component via `dapr/components-contrib/nameresolution`.
   - Changed title from "Pluggable" to "Custom", updated tags and description accordingly.

2. **Incorrect import paths**
   - `github.com/dapr-sandbox/components-go-sdk` and `github.com/dapr-sandbox/components-go-sdk/nameresolution/v1` do not contain name resolution support.
   - `github.com/dapr/dapr/pkg/proto/components/v1` has no name resolution proto messages.
   - Changed to `github.com/dapr/components-contrib/nameresolution` and `github.com/dapr/kit/logger`.

3. **Wrong interface methods and signatures**
   - Original used `Init(ctx, *proto.NameResolutionInitRequest) (*proto.NameResolutionInitResponse, error)` — these proto types don't exist.
   - Original used `Resolve(ctx, *proto.ResolveRequest) (*proto.ResolveResponse, error)` — method is `ResolveID`, not `Resolve`.
   - Original used `Ping(ctx, *proto.PingRequest) (*proto.PingResponse, error)` — the interface requires `Close() error` (from `io.Closer`), not `Ping`.
   - Corrected to: `Init(ctx, nameresolution.Metadata) error`, `ResolveID(ctx, nameresolution.ResolveRequest) (string, error)`, `Close() error`.

4. **Wrong metadata access pattern**
   - Original used `req.Metadata.Properties` iterating with `.Key` and `.Value` fields (proto map entry style).
   - Corrected to `metadata.Properties["catalogURL"]` (standard Go map access on `nameresolution.Metadata`).

5. **Wrong field names in ResolveRequest**
   - Original used `req.Id` (proto-style). Corrected to `req.ID` (Go-style, from `nameresolution.ResolveRequest`).

6. **Wrong registration pattern**
   - Original used `dapr.Register("name", dapr.WithNameResolver(...))` and `dapr.MustRun()` — `WithNameResolver` does not exist in the SDK.
   - Replaced with correct factory function pattern (`NewServiceCatalogResolver`) and explanation that custom resolvers are registered in a custom Dapr runtime build.

7. **Wrong component manifest format**
   - Original showed a `kind: Component` resource with `type: nameresolution.custom-catalog-resolver`. Name resolution is NOT configured via Component resources; it's configured in the Dapr Configuration resource under `spec.nameResolution`.
   - Replaced with the correct Configuration YAML format.

8. **Incorrect testing commands**
   - Original showed building and running a standalone gRPC server binary with `DAPR_COMPONENT_SOCKET_FOLDER`. This is the pluggable component pattern, which doesn't apply to name resolution.
   - Replaced with `dapr run --config` approach for testing with a custom configuration.

9. **Caching code used wrong types**
   - Updated `Resolve` to `ResolveID`, `req.Id` to `req.ID`, `*proto.ResolveResponse{Address: ...}` to plain string return, and `proto` types to `nameresolution` types.

## Review Notes
- The `components-contrib` approach for custom name resolvers requires either contributing the component upstream to the `dapr/components-contrib` repository or maintaining a custom Dapr runtime build. This is a higher barrier than pluggable components (which run as separate processes). The post could benefit from a note about this trade-off in a future update.
- The Go SDK (`dapr-sandbox/components-go-sdk`) is still in sandbox status. If name resolution is added to the pluggable component framework in a future Dapr release, this post should be revisited.
- The caching section uses `sync.Map` and `time` packages in the struct but does not show the import statements. This is acceptable for a partial code snippet but readers should be aware they need to import `"sync"` and `"time"`.
