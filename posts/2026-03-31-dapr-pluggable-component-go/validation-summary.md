# Validation Summary: How to Build a Custom Pluggable Component for Dapr in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pluggable components)
- Go
- gRPC
- Unix domain sockets
- Protocol Buffers (Dapr state store proto)

## Sources Consulted
- Dapr Pluggable Components Overview: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-overview/
- How-To: Register a pluggable component: https://docs.dapr.io/operations/components/pluggable-components-registration/
- Dapr pluggable components Go SDK docs: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-sdks/pluggable-components-go/
- Dapr state store proto definition: https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/state.proto
- dapr-sandbox/components-go-sdk GitHub repo: https://github.com/dapr-sandbox/components-go-sdk
- Go package docs for proto/components/v1: https://pkg.go.dev/github.com/dapr/dapr/pkg/proto/components/v1

## Issues Found

### 1. Incorrect Go dependencies in Project Setup
**What was wrong:** The setup section listed two incorrect packages: `github.com/dapr-sandbox/components-contrib/state` (wrong org path; the correct repo is `github.com/dapr/components-contrib`, and it is not needed for the raw proto approach used in this post) and `github.com/dapr/dapr/pkg/components/pluggable` (this is Dapr's internal code for connecting to pluggable components, not for building them). The actual dependencies (`proto/components/v1` and `grpc`) were listed in a separate block below with unnecessary framing.

**What was changed:** Consolidated into a single `go get` block with only the two required dependencies: `github.com/dapr/dapr/pkg/proto/components/v1` and `google.golang.org/grpc`. Updated the introductory text accordingly.

**Why:** The original commands would fail (`dapr-sandbox/components-contrib` doesn't exist) or pull in unnecessary internal Dapr packages. The code only uses proto stubs and gRPC.

### 2. Unused import causing compile error
**What was wrong:** The state store implementation code block imported `"google.golang.org/grpc"` but never used it. Go treats unused imports as compile errors.

**What was changed:** Removed the unused `"google.golang.org/grpc"` import from the state store implementation code block. (The grpc package is correctly imported and used in the separate gRPC server code block.)

**Why:** The code would not compile with the unused import.

### 3. Missing UnimplementedStateStoreServer embedding
**What was wrong:** The `InMemoryStore` struct only implemented 4 of 9 methods in the `StateStoreServer` gRPC interface (missing `Features`, `Ping`, `BulkGet`, `BulkSet`, `BulkDelete`). Without embedding `proto.UnimplementedStateStoreServer`, the struct does not satisfy the interface and the code would not compile.

**What was changed:** Added `proto.UnimplementedStateStoreServer` as an embedded field in the `InMemoryStore` struct. This provides default (unimplemented) responses for the methods not explicitly defined, which is standard practice in gRPC Go servers.

**Why:** Without this embedding, `RegisterStateStoreServer(srv, store)` would fail at compile time because `*InMemoryStore` does not implement the full `StateStoreServer` interface.

## Review Notes
- The post uses the low-level raw proto/gRPC approach rather than the higher-level `github.com/dapr-sandbox/components-go-sdk` SDK. Both are valid approaches; the raw approach gives more control over the gRPC lifecycle as the author notes. However, readers should be aware that the official Dapr documentation recommends `components-go-sdk` for most use cases.
- The component YAML, socket path (`/tmp/dapr-components-sockets`), and `dapr run` commands are all correct.
- The Etag handling (hardcoded `"1"`) is simplified for tutorial purposes. A production implementation would need proper ETag versioning for concurrency control.
