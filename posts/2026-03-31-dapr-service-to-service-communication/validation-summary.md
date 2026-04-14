# Validation Summary: How to Configure Dapr for Service-to-Service Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation building block)
- Kubernetes (deployment annotations, sidecar injection)
- Python (Dapr Python SDK — `dapr.clients.DaprClient`)
- Go (Dapr Go SDK — `github.com/dapr/go-sdk/client`)
- gRPC and HTTP transport protocols
- mTLS (mutual TLS) for service-to-service encryption
- Dapr Resiliency (retries, timeouts, circuit breakers)

## Sources Consulted
- Dapr Python SDK source code (`dapr/python-sdk` on GitHub) — `invoke_method` signature and `InvokeMethodResponse` API
- Dapr Go SDK source code (`dapr/go-sdk` on GitHub) — `InvokeMethodWithContent` signature in `client/invoke.go`
- Dapr Kubernetes Annotations Reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr mTLS Configuration — https://docs.dapr.io/operations/security/mtls/
- Dapr Configuration Schema — https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Resiliency Schema — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry Policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/

## Issues Found

### 1. Go SDK `InvokeMethodWithContent` — incorrect `verb` and `ContentType` arguments
**What was wrong:** The Go code example passed `"application/grpc"` as the third positional argument to `InvokeMethodWithContent`. The actual function signature is `(ctx, appID, methodName, verb string, content *DataContent)`, so `"application/grpc"` was being passed as the HTTP verb. Additionally, `"application/grpc"` is not a valid MIME content type for `DataContent.ContentType` — it is an HTTP/2 transport-level protocol identifier, not a payload content type.

**What was changed:** Changed the verb argument from `"application/grpc"` to `"post"` (a valid HTTP method). Changed `ContentType` in the `DataContent` struct from `"application/grpc"` to `"application/x-protobuf"`, which is the correct MIME type for protobuf-serialized payloads.

**Why:** The Dapr Go SDK's `InvokeMethodWithContent` expects a standard HTTP verb (GET, POST, PUT, DELETE, etc.) as the third positional string argument. Passing `"application/grpc"` would cause it to fall through to `HTTPExtension_NONE`, resulting in unexpected behavior. For the content type, since the data is being marshaled with `proto.Marshal`, the appropriate content type is `application/x-protobuf`.

### 2. mTLS verification kubectl command — wrong resource name
**What was wrong:** The command used `dapr-system` as the resource name: `kubectl get configuration dapr-system -n dapr-system`. The default Dapr configuration CRD resource is named `daprsystem` (one word, no hyphen), not `dapr-system`. The namespace `dapr-system` is correct, but the resource name within that namespace has no hyphen.

**What was changed:** Updated the command to `kubectl get configurations/daprsystem -n dapr-system -o jsonpath='{.spec.mtls}'`. Also changed `configuration` to `configurations` (the canonical plural form used in Dapr documentation).

**Why:** Running the original command would return a "not found" error since no resource named `dapr-system` exists — the actual resource is `daprsystem`.

## Review Notes
- The Python SDK code uses `json.loads(response.data)` which works correctly, but `response.json()` is a convenience method available on `InvokeMethodResponse` that could simplify this. Not changed since the current code is functionally correct.
- The Dapr Python SDK's gRPC-based `invoke_method` has a deprecation notice recommending gRPC proxying, but `DaprClient` defaults to HTTP-based invocation (controlled by `DAPR_API_METHOD_INVOCATION_PROTOCOL`), so the deprecation does not apply to the usage shown.
- The section title "Resiliency for Service Calls" mentions circuit breaker policies in its intro text, but the YAML example only defines retry and timeout policies — no circuit breaker is configured. This is slightly misleading but not technically incorrect since the section demonstrates resiliency policies in general.
- All Kubernetes annotations, mTLS configuration YAML, and resiliency spec YAML were verified correct against official Dapr documentation.
