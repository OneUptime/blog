# Validation Summary: How to Migrate from gRPC Direct Calls to Dapr Service Invocation

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr (Service Invocation, Resiliency)
- gRPC (Go / grpc-go)
- Go (Golang)
- Protocol Buffers (protobuf)

## Sources Consulted
- Dapr gRPC Service Invocation how-to guide (https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/)
- Dapr Resiliency spec documentation (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr CLI reference for `dapr run` (https://docs.dapr.io/reference/cli/dapr-run/)
- Dapr Security / mTLS documentation (https://docs.dapr.io/concepts/security-concept/)
- grpc-go API reference and changelog for `grpc.Dial` deprecation (https://github.com/grpc/grpc-go)

## Issues Found

### 1. `grpc.Dial` deprecated in favor of `grpc.NewClient`
- **What was wrong:** Both the "Before" and "After" Go code examples used `grpc.Dial()`, which was deprecated in grpc-go v1.63.0.
- **What was changed:** Replaced `grpc.Dial()` with `grpc.NewClient()` in both code examples.
- **Why:** `grpc.NewClient` is the current recommended API. While `grpc.Dial` will remain supported throughout the 1.x series, new tutorials should use the current API to avoid teaching deprecated patterns.

### 2. `--components-path` CLI flag deprecated in favor of `--resources-path`
- **What was wrong:** The `dapr run` command for the order-service used `--components-path ./components`, which is a deprecated flag.
- **What was changed:** Replaced `--components-path` with `--resources-path` in the `dapr run` command.
- **Why:** The Dapr CLI deprecated `--components-path` in favor of `--resources-path` to reflect that the directory can contain any Dapr resource (components, resiliency specs, subscriptions, etc.), not just components.

## Review Notes
- The Dapr sidecar default gRPC port (50001), `dapr-app-id` metadata key, Go metadata pattern, resiliency YAML structure, and mTLS claims are all verified correct against official Dapr documentation.
- The server-side code correctly shows that no changes are needed when migrating to Dapr service invocation — only the client is modified.
- The resiliency YAML uses correct apiVersion (`dapr.io/v1alpha1`), kind (`Resiliency`), and field names (`policy: exponential`, `maxInterval`, `maxRetries`).
- Note that Dapr's own official documentation examples still use `grpc.Dial` in some places, so the original post was consistent with Dapr's docs even though grpc-go has moved on.
