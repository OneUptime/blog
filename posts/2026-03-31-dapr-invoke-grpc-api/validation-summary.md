# Validation Summary: How to Invoke Services Using Dapr gRPC API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, gRPC proxy mode)
- gRPC (Go client, protobuf)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Kubernetes (Dapr sidecar annotations)
- grpcurl (CLI testing tool)
- Go (`google.golang.org/grpc`, `google.golang.org/grpc/metadata`)

## Sources Consulted
- Dapr docs: How-To: Invoke services using gRPC — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/
- Dapr Go SDK client package — https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK source (invoke.go) — https://github.com/dapr/go-sdk/blob/main/client/invoke.go
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- gRPC-Go package docs — https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go insecure credentials package — https://pkg.go.dev/google.golang.org/grpc/credentials/insecure

## Issues Found

1. **`InvokeMethod` fourth parameter was incorrect**: The code passed `"application/json"` (a content type) as the fourth argument to `client.InvokeMethod`. The actual signature is `InvokeMethod(ctx, appID, methodName, verb string)` where the fourth parameter is the HTTP verb (e.g., `"post"`, `"get"`). Changed `"application/json"` to `"post"`.

2. **Missing `"fmt"` import**: The first Go code example used `fmt.Println` but did not include `"fmt"` in the import block. Added `"fmt"` to the imports.

3. **Deprecated `grpc.WithInsecure()`**: The gRPC proxy example used `grpc.WithInsecure()`, which is deprecated in gRPC-Go and will be removed in gRPC 2.0. Replaced with `grpc.WithTransportCredentials(insecure.NewCredentials())` which requires the `google.golang.org/grpc/credentials/insecure` package.

4. **Incorrect code fence language for diagram**: The architecture diagram used ` ```json ` as the code fence language, but the content is a text diagram, not JSON. Changed to ` ```text `.

## Review Notes
- The `grpc.Dial` function itself is also deprecated in newer gRPC-Go versions in favor of `grpc.NewClient`, but it still works and is widely used in examples. This could be updated in a future revision.
- The `InvokeMethod` call as corrected (with verb `"post"`) performs a simple invocation without a request body. For sending data, `InvokeMethodWithContent` should be used instead with a `DataContent` struct. The current example is valid for a no-body invocation but readers may want to see `InvokeMethodWithContent` for real-world use cases.
- All Kubernetes annotations, the `dapr-app-id` metadata header, the default gRPC sidecar port (50001), and the grpcurl command syntax are correct.
