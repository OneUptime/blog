# Validation Summary: How to Develop Dapr Pluggable State Store Components

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pluggable components framework)
- Dapr Go pluggable components SDK (`github.com/dapr-sandbox/components-go-sdk`)
- Dapr components-contrib state store interface (`github.com/dapr/components-contrib/state`)
- Go (programming language)
- gRPC (communication protocol between Dapr and pluggable components)
- Unix domain sockets

## Sources Consulted
- Dapr pluggable components Go SDK source code: `github.com/dapr-sandbox/components-go-sdk` (registry.go, service.go, state/v1/store.go, state/v1/wrapper.go, examples/)
- Dapr components-contrib state store interface: `github.com/dapr/components-contrib/state/store.go`
- Dapr sidecar pluggable component discovery: `github.com/dapr/dapr/pkg/components/pluggable/discovery.go`
- Dapr official documentation on pluggable components: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/

## Issues Found

### 1. Wrong types used throughout the state store implementation (Critical)
**What was wrong:** The blog imported raw gRPC proto types (`proto "github.com/dapr/dapr/pkg/proto/components/v1"`) and used proto request/response types (e.g., `*proto.GetRequest`, `*proto.GetResponse`, `*proto.SetRequest`, `*proto.SetResponse`). Users do not work with proto types directly; the SDK handles translation between proto and `components-contrib` types automatically.
**What was changed:** Replaced all proto type references with the correct `components-contrib/state` types (e.g., `*state.GetRequest`, `*state.GetResponse`, `*state.SetRequest`).

### 2. Incorrect method signatures (Critical)
**What was wrong:** Multiple methods had wrong signatures:
- `Init` was shown as returning `(*proto.InitResponse, error)` — it should return just `error` and accept `state.Metadata` not `*proto.InitRequest`.
- `Features` was shown accepting `(ctx, req)` and returning a proto response — it should take no params and return `[]state.Feature`.
- `Set` and `Delete` were shown returning response objects — they should return just `error`.
**What was changed:** Corrected all method signatures to match the `components-contrib` `state.Store` interface.

### 3. Ping method listed as required (Moderate)
**What was wrong:** The blog listed `Ping` as a required method to implement. The SDK handles Ping automatically in its wrapper layer; it is not part of the user-facing interface.
**What was changed:** Removed `Ping` from the interface description and implementation. Added `Close()` (from `io.Closer`) which is actually required.

### 4. Missing BulkStore methods (Moderate)
**What was wrong:** The `state.Store` interface embeds `BulkStore`, which requires `BulkGet`, `BulkSet`, and `BulkDelete`. These were not mentioned or implemented.
**What was changed:** Added implementations for all three bulk methods and `GetComponentMetadata`.

### 5. Wrong `dapr run` flag for pluggable component sockets (Critical)
**What was wrong:** The blog used `--unix-domain-socket /tmp/dapr-components` on the `dapr run` command. This flag configures Dapr's own API server to use Unix sockets instead of TCP — it has nothing to do with pluggable component discovery. There is no CLI flag for pluggable component socket paths.
**What was changed:** Replaced the `--unix-domain-socket` flag with the `DAPR_COMPONENTS_SOCKETS_FOLDER` environment variable, which is how you configure the sidecar's pluggable component socket discovery folder.

### 6. Outdated environment variable name (Minor)
**What was wrong:** Used `DAPR_COMPONENT_SOCKET_FOLDER` (singular). While this still works as a fallback, the preferred env var is `DAPR_COMPONENT_SOCKETS_FOLDER` (plural) for the component side, and `DAPR_COMPONENTS_SOCKETS_FOLDER` for the sidecar side.
**What was changed:** Updated to `DAPR_COMPONENT_SOCKETS_FOLDER` for the component process and `DAPR_COMPONENTS_SOCKETS_FOLDER` for the Dapr sidecar.

### 7. Wrong default socket folder path (Minor)
**What was wrong:** Used `/tmp/dapr-components` as the socket folder path. The actual default is `/tmp/dapr-components-sockets`.
**What was changed:** Updated to `/tmp/dapr-components-sockets`.

### 8. Wrong transactional method name and types (Critical)
**What was wrong:** The blog showed a `Transact` method using proto types (`*proto.TransactionalStateRequest`, `TransactionalStateOperation_Set`, etc.). The correct user-facing method is `Multi` from `state.TransactionalStore`, which uses `components-contrib` types.
**What was changed:** Replaced `Transact` with `Multi`, updated the signature to `Multi(ctx context.Context, request *state.TransactionalStateRequest) error`, and replaced proto type switches with `components-contrib` `state.SetRequest`/`state.DeleteRequest` type assertions.

## Review Notes
- The SDK repository (`github.com/dapr-sandbox/components-go-sdk`) appears to have dependencies pinned to Dapr ~v1.11. The SDK may not yet reflect the very latest Dapr releases. Authors should verify compatibility with their target Dapr version.
- The registration API (`dapr.Register` + `dapr.MustRun()`) and component YAML format (`state.my-custom-statestore`) were correct as written.
- The conceptual explanation of pluggable components (separate process, Unix domain socket, gRPC) is accurate.
