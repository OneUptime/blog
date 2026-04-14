# Validation Summary: How to Configure Dapr for Microservices with Different Protocols

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar model, service invocation, pub/sub)
- gRPC
- HTTP/HTTPS
- Kubernetes annotations
- Python (requests library)
- Go (Dapr Go SDK)
- Node.js / Express
- Protocol Buffers (proto3)

## Sources Consulted
- Dapr Arguments & Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Go SDK Client Package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub Subscription Methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr How-To: Invoke Services using gRPC: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/

## Issues Found
1. **Go SDK `InvokeMethod` incorrect 4th parameter** (lines 64-68): The call passed `"application/json"` as the 4th argument to `client.InvokeMethod()`. The actual Go SDK signature is `InvokeMethod(ctx context.Context, appID, methodName, verb string)` where the 4th parameter is the HTTP verb (e.g., `"get"`, `"post"`), not a content type. Changed `"application/json"` to `"get"` with an updated inline comment.

## Review Notes
- The `dapr.io/app-protocol` annotation also supports `"grpcs"` (gRPC with TLS) and `"h2c"` (HTTP/2 cleartext), which are not mentioned in the post. This is acceptable since the post focuses on the most common protocols (HTTP, gRPC, HTTPS), but future updates could mention these for completeness.
- The protocol translation explanation is correct: Dapr sidecars use gRPC for inter-sidecar communication internally, while each sidecar communicates with its local app using the protocol declared via `app-protocol`. This enables HTTP services to invoke gRPC services (and vice versa) transparently.
- The gRPC `ListTopicSubscriptions` method shown for Go pub/sub subscriptions is part of the Dapr `AppCallback` gRPC service definition and is correct, though most current Dapr documentation emphasizes declarative (YAML) or programmatic (HTTP endpoint) subscription approaches over direct gRPC callback implementation.
