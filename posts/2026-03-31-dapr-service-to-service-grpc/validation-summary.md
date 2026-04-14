# Validation Summary: How to Set Up Dapr Service-to-Service Communication with gRPC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation building block)
- gRPC (service-to-service communication)
- Protocol Buffers (protobuf)
- Go (gRPC server and client examples)
- Python (gRPC server and client examples)
- Dapr Go SDK
- Kubernetes (Dapr annotations)

## Sources Consulted
- Dapr gRPC Service Invocation Documentation: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/
- Dapr CLI Reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Go SDK Client Documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- gRPC-Go Package Documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC Insecure Credentials Package: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- Dapr Configuration Reference: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

### 1. Deprecated `grpc.Dial` usage in Go client (Option A)
- **What was wrong:** The Go client example used `grpc.Dial("localhost:50001", grpc.WithInsecure())`. `grpc.Dial` has been deprecated since gRPC-Go v1.63.0 in favor of `grpc.NewClient`.
- **What was changed:** Replaced `grpc.Dial` with `grpc.NewClient`.
- **Why:** `grpc.NewClient` is the current recommended API for creating gRPC client connections.

### 2. Deprecated `grpc.WithInsecure()` usage in Go client (Option A)
- **What was wrong:** The Go client used `grpc.WithInsecure()` which is deprecated.
- **What was changed:** Replaced with `grpc.WithTransportCredentials(insecure.NewCredentials())` and added the `"google.golang.org/grpc/credentials/insecure"` import.
- **Why:** `grpc.WithInsecure()` is deprecated; the credentials/insecure package is the current replacement.

### 3. Invalid verb parameter in `InvokeMethodWithContent` (Option B)
- **What was wrong:** The Dapr Go SDK example passed `"grpc"` as the verb parameter to `InvokeMethodWithContent`. The verb parameter expects an HTTP method (e.g., "post", "get"), not a protocol name.
- **What was changed:** Changed `"grpc"` to `"post"`.
- **Why:** Dapr's service invocation API uses HTTP verbs for routing. The sidecar handles protocol translation to gRPC based on the target service's `--app-protocol` configuration, not the verb parameter.

## Review Notes
- The `proxy.grpc` feature flag in the "Configuring gRPC Proxying" section enables transparent gRPC pass-through proxying. This is distinct from the standard gRPC invocation (using `dapr-app-id` metadata) which works out of the box without any special configuration. The post could clarify this distinction more explicitly, but it is not technically incorrect.
- The Python examples use `grpc.insecure_channel()` which is the standard current API for Python gRPC and is correct.
- All Dapr CLI flags (`--app-id`, `--app-port`, `--app-protocol grpc`, `--dapr-grpc-port`) are correct.
- All Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/app-protocol`) are correct.
- The default Dapr gRPC sidecar port of 50001 is correctly stated.
- The `dapr-app-id` metadata key for routing gRPC calls is correct.
- The protobuf definition and code generation commands are correct.
