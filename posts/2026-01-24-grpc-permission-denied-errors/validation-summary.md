# Validation Summary: How to Fix 'Permission Denied' Errors in gRPC

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- gRPC status codes and interceptors
- Python gRPC client and server APIs
- Go gRPC client APIs and credentials
- TLS and mutual TLS configuration
- OAuth2 per-RPC credentials
- Kubernetes ServiceAccounts and RBAC

## Sources Consulted
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC authentication guide: https://grpc.io/docs/guides/auth/
- gRPC interceptors guide: https://grpc.io/docs/guides/interceptors/
- gRPC Python API reference: https://grpc.github.io/grpc/python/grpc.html
- gRPC Go package reference: https://pkg.go.dev/google.golang.org/grpc
- gRPC Go credentials package reference: https://pkg.go.dev/google.golang.org/grpc/credentials
- gRPC Go OAuth credentials package reference: https://pkg.go.dev/google.golang.org/grpc/credentials/oauth
- gRPC Go anti-patterns documentation for Dial vs NewClient: https://github.com/grpc/grpc-go/blob/master/Documentation/anti-patterns.md
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes ServiceAccount configuration guide: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/

## Issues Found
- The post described missing credentials as resulting in `PERMISSION_DENIED`. gRPC's official status code guidance says callers that cannot be identified should receive `UNAUTHENTICATED`, so the example comment and inline result were corrected.
- The Python client interceptor examples attempted to instantiate `grpc.ClientCallDetails` directly. The Python API exposes this as an interface-like details object, and common working interceptor examples create a concrete subclass, so both examples now define and use `_ClientCallDetails`.
- The Python interceptor examples omitted the current `compression` field when reconstructing client call details. The examples now preserve `client_call_details.compression`.
- The Go examples used `grpc.Dial`, which gRPC-Go documentation identifies as deprecated in favor of `grpc.NewClient`. The examples now use `grpc.NewClient`.
- The Go mTLS example used deprecated `ioutil.ReadFile` and referenced `fmt.Errorf` without importing `fmt`. It now uses `os.ReadFile` and includes the required `fmt` import.
- The Go server-side debug example used `strings.TrimPrefix` and `strings.Join` without importing `strings`. The missing import was added.
- The TLS troubleshooting diagram suggested a failed certificate verification may surface as `PERMISSION_DENIED`. TLS handshake failures usually fail before the RPC reaches application authorization and are typically surfaced as connection errors such as `UNAVAILABLE`, so the diagram note and related comment were corrected.
- The Python server authorization example used `futures.ThreadPoolExecutor` without importing `futures` and had an unused `wraps` import. The import was corrected to `from concurrent import futures`.
- The Python authorization example stripped `Bearer ` with a broad string replacement. It now only removes the expected prefix when present.

## Review Notes
The server-side authorization interceptor example is intentionally scoped to unary-unary RPCs because it returns `grpc.unary_unary_rpc_method_handler` for denied requests. A production interceptor that protects streaming methods should return handlers matching each RPC type.
