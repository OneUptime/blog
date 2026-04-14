# Validation Summary: How to Configure gRPC Communication in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- gRPC (Google Remote Procedure Call)
- Go (Golang)
- Protocol Buffers (protobuf)
- Kubernetes annotations
- Dapr Go SDK
- mTLS

## Sources Consulted
- Dapr gRPC API documentation: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/
- Dapr AppCallback proto definition: https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/appcallback.proto
- Dapr common proto definition (InvokeRequest/InvokeResponse): https://github.com/dapr/dapr/blob/master/dapr/proto/common/v1/common.proto
- Dapr Go SDK client package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr gRPC proxy feature graduation (issue #3814): https://github.com/dapr/dapr/issues/3814
- Dapr CLI reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Wrong import path for InvokeRequest/InvokeResponse (gRPC server code)
- **What was wrong:** The code imported only `pb "github.com/dapr/dapr/pkg/proto/runtime/v1"` and used `pb.InvokeRequest` and `pb.InvokeResponse`. However, `InvokeRequest` and `InvokeResponse` are defined in the `common/v1` package (`github.com/dapr/dapr/pkg/proto/common/v1`), not `runtime/v1`. The `AppCallbackServer` interface is in `runtime/v1`, but its `OnInvoke` method uses types from `common/v1`.
- **What was changed:** Added a separate import `commonv1 "github.com/dapr/dapr/pkg/proto/common/v1"` and changed all references to `InvokeRequest` and `InvokeResponse` to use `commonv1.` prefix instead of `pb.`.

### 2. Missing anypb import (gRPC server code)
- **What was wrong:** The code used `&anypb.Any{Value: ...}` but did not import the `anypb` package (`google.golang.org/protobuf/types/known/anypb`).
- **What was changed:** Added `"google.golang.org/protobuf/types/known/anypb"` to the import block.

### 3. Wrong 4th parameter in InvokeMethod call (Go SDK client code)
- **What was wrong:** `client.InvokeMethod(ctx, "grpc-service", "process", "application/json")` passed `"application/json"` as the 4th argument. The Dapr Go SDK `InvokeMethod` signature is `InvokeMethod(ctx, appID, methodName, verb string)` where the 4th parameter is an HTTP verb (e.g., "post", "get"), not a content type.
- **What was changed:** Changed `"application/json"` to `"post"`.

### 4. Wrong gRPC proxy feature flag name and missing version context
- **What was wrong:** The feature flag was listed as `GrpcProxy` but the correct name is `proxy.grpc`. Additionally, gRPC proxying graduated to stable in Dapr v1.7 (January 2022) and is enabled by default — the feature flag is no longer needed for current Dapr versions.
- **What was changed:** Corrected the feature flag name to `proxy.grpc` and added context explaining that gRPC proxying is stable and enabled by default since Dapr v1.7, with the configuration only needed for older versions.

## Review Notes
- The `anypb.Any{Value: []byte(...)}` pattern (setting Value directly without TypeUrl) is valid for Dapr — the Dapr proto spec documents that "Any.value is treated as bytes if Any.type_url is unset."
- The Go SDK client code snippet is missing standard library imports (`context`, `log`) and a `package main` declaration, but this is acceptable for a code snippet (as opposed to the full-file gRPC server example).
- The Kubernetes annotations, CLI flags, and `grpcs` protocol for app-to-sidecar TLS are all correct per current Dapr documentation.
- The default Dapr gRPC port (50001) and HTTP port (3500) are correctly stated.
