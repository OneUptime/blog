# Validation Summary: How to Handle gRPC Errors in Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- gRPC and gRPC status codes
- Python (dapr-client SDK, grpcio, grpcio-status, googleapis-common-protos)
- Go (dapr/go-sdk, google.golang.org/grpc)
- Dapr Resiliency spec (declarative retry policies)

## Sources Consulted
- Dapr Resiliency policies documentation — https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency retry policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency spec reference — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Go SDK client interface — https://github.com/dapr/go-sdk/blob/main/client/state.go
- Dapr Python SDK DaprClient — https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- gRPC status codes specification — https://grpc.github.io/grpc/core/md_doc_statuscodes.html
- Python grpcio-status package (rpc_status.from_call) — https://grpc.io/docs/languages/python/
- Go gRPC status package — https://pkg.go.dev/google.golang.org/grpc/status

## Issues Found

### 1. Python code: Unused `StateItem` import (line 33)
- **What was wrong:** `from dapr.clients.grpc._state import StateItem` was imported but never used in the code example. This is dead code that could confuse readers.
- **What was changed:** Removed the unused import line.
- **Why:** The example only calls `client.get_state()` which returns a `StateResponse`, not a `StateItem`. Including the unused import suggests it is needed.

### 2. Go code: Missing `"fmt"` import (line 57-63)
- **What was wrong:** The Go function uses `fmt.Errorf` in two places but did not import the `"fmt"` package. This code would not compile.
- **What was changed:** Added `"fmt"` to the import block.
- **Why:** Without the import, the Go example is broken and will produce a compile error.

### 3. Resiliency YAML: Incorrect `matching.gRPCStatusCodes` format (line 143-145)
- **What was wrong:** The `matching.gRPCStatusCodes` field was written as a YAML list of named codes (`- UNAVAILABLE`, `- INTERNAL`). The Dapr resiliency spec requires a comma-separated string of numeric gRPC status codes (e.g., `"13,14"`).
- **What was changed:** Replaced the YAML list with the correct string format `"13,14"` (where 13 = INTERNAL, 14 = UNAVAILABLE).
- **Why:** Using named codes in a YAML list would cause a configuration error at runtime. The Dapr resiliency spec only accepts numeric codes as a comma-separated string.

## Review Notes
- The gRPC status code table is accurate per the gRPC specification. The table lists codes slightly out of numeric order (UNAVAILABLE/14 before INTERNAL/13), which is fine since the ordering is by Dapr relevance.
- The Python rich error details extraction example using `grpc_status.rpc_status.from_call()` and protobuf Any unpacking is correct but requires the `grpcio-status` and `googleapis-common-protos` packages, which are not mentioned as dependencies. Readers may need to install them separately.
- The retry logic example uses simple exponential backoff (`2 ** attempt`) without jitter. For production use, adding jitter would be recommended to avoid thundering herd problems, but this is acceptable for a tutorial.
