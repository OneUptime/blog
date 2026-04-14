# How to Fix Dapr HTTP to gRPC Protocol Confusion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, gRPC, Protocol, Service Invocation

Description: Resolve Dapr HTTP to gRPC protocol mismatches in service invocation by correctly configuring app protocol settings and proxy modes.

---

Dapr supports both HTTP and gRPC for app-to-sidecar communication. Confusing the two - or misconfiguring which protocol the app uses - leads to failed invocations and cryptic error messages.

## How Protocol Selection Works

Dapr sidecars communicate with each other over gRPC internally. However, the sidecar can talk to YOUR application over either HTTP or gRPC. You specify this via the `--app-protocol` flag:

```bash
# HTTP app (default)
dapr run --app-id myapp --app-port 8080 --app-protocol http -- python app.py

# gRPC app
dapr run --app-id myapp --app-port 50051 --app-protocol grpc -- python app.py
```

## Common Error: Sending HTTP to a gRPC App

If you configure `--app-protocol grpc` but your app serves HTTP, the sidecar sends a gRPC request and receives an invalid response:

```text
failed to invoke app: rpc error: code = Internal
desc = failed to proxy request: invalid gRPC response
```

Fix: match the protocol flag to what your app actually serves.

## Checking Protocol in Kubernetes

For Kubernetes deployments, set the protocol via annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/app-port: "50051"
  dapr.io/app-protocol: "grpc"
```

For HTTP (default, can be omitted):

```yaml
annotations:
  dapr.io/app-protocol: "http"
```

## gRPC Proxying for Non-Dapr gRPC Apps

If you want to invoke a standard gRPC service (not Dapr-aware), use the gRPC proxy mode:

```yaml
annotations:
  dapr.io/app-protocol: "grpc"
  dapr.io/enable-app-health-check: "false"
```

Then invoke it with the Dapr gRPC endpoint:

```python
import grpc

channel = grpc.insecure_channel('localhost:50001')
# Use the Dapr gRPC proxy - pass the app-id as metadata
metadata = [('dapr-app-id', 'target-service')]
```

## HTTP2 Protocol for gRPC

For gRPC apps, ensure HTTP/2 is enabled. If you see `PROTOCOL_ERROR`, the proxy may be downgrading to HTTP/1:

```yaml
annotations:
  dapr.io/app-protocol: "h2c"
```

`h2c` is HTTP/2 cleartext (without TLS), which gRPC requires.

## Testing Protocol Compatibility

Verify your app responds correctly on the configured port and protocol:

```bash
# For HTTP app
curl http://localhost:8080/healthz

# For gRPC app - use grpc_cli or grpcurl
grpcurl -plaintext localhost:50051 list
```

## Service Invocation Across Protocols

When calling from an HTTP app to a gRPC-protocol app, Dapr handles the translation:

```bash
# HTTP caller invoking gRPC target - Dapr translates automatically
curl -X POST http://localhost:3500/v1.0/invoke/grpc-service/method/SayHello \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

## Summary

Dapr HTTP to gRPC protocol confusion is resolved by ensuring the `--app-protocol` flag or `dapr.io/app-protocol` annotation matches the protocol your application actually serves. Use `h2c` for gRPC without TLS, `grpc` for standard gRPC, and `http` for REST applications. Dapr handles cross-protocol translation automatically during service invocation.
