# Validation Summary: How to Configure Dapr gRPC Port

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar architecture, gRPC API, app callbacks)
- gRPC (protocol, service invocation, grpcurl testing)
- Kubernetes (Deployment manifests, annotations, kubectl exec)
- Go (Dapr Go SDK - client creation, service invocation, app callback server)
- Python (Dapr Python SDK - DaprClient, invoke_method)

## Sources Consulted
- Dapr Kubernetes annotations reference (dapr.io/grpc-port, dapr.io/app-protocol, dapr.io/app-port)
- Dapr Go SDK source (github.com/dapr/go-sdk/client) - NewClient, NewClientWithPort, InvokeMethod signatures
- Dapr Python SDK source (dapr/clients/grpc/client.py) - DaprClient, invoke_method signature
- Dapr proto definitions (dapr.proto.runtime.v1.Dapr/GetState service path)
- Dapr environment variable reference (DAPR_GRPC_PORT)

## Issues Found
1. **Code block language tag**: The Kubernetes `env:` configuration snippet for setting `DAPR_GRPC_PORT` was incorrectly tagged as a `bash` code block. Changed to `yaml` since it is a Kubernetes manifest snippet.

## Review Notes
- The Python `invoke_method` call omits the `http_verb` parameter. This is functionally correct as it defaults appropriately, but explicitly passing `http_verb='POST'` would improve clarity for a tutorial. Not changed since the code works as-is.
- The `OnInvoke` Go callback example omits embedding `pb.UnimplementedAppCallbackServer` in the struct, which is a gRPC best practice for forward compatibility. Not changed since this is a focused snippet, not a complete implementation.
- The `ss -tlnp` verification command may not work in the `daprd` container if it uses a distroless base image. The command syntax itself is correct.
- Default gRPC port 50001, annotation `dapr.io/grpc-port`, environment variable `DAPR_GRPC_PORT`, Go SDK APIs (`NewClient`, `NewClientWithPort`, `InvokeMethod`), Python SDK APIs (`DaprClient`, `invoke_method`), and gRPC service path `dapr.proto.runtime.v1.Dapr/GetState` are all verified correct.
