# Validation Summary: How to Use Dapr Service Invocation with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- gRPC (underlying transport and error handling via `google.golang.org/grpc/status`)

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (client/invoke.go, client/client.go, service/common/type.go, service/common/service.go, service/http/service.go, service/grpc/service.go)
- Dapr Go SDK package docs: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK service package docs: https://pkg.go.dev/github.com/dapr/go-sdk/service/common

## Issues Found

### 1. `InvokeMethodWithCustomContent` — incorrect signature with extra `meta` parameter
**What was wrong:** The blog passed a 7th argument `meta map[string][]string` to `InvokeMethodWithCustomContent`. The actual SDK method signature is `InvokeMethodWithCustomContent(ctx, appID, methodName, verb, contentType string, content interface{}) ([]byte, error)` — it takes 6 parameters, not 7. There is no metadata/headers parameter.
**What was changed:** Removed the `meta` variable declaration and the extra argument from the method call. Renamed the section from "Invocation with Custom Headers" to "Invocation with Custom Content" since the method handles custom content types, not custom HTTP headers.
**Why:** The original code would not compile. The method does not accept metadata; custom headers must be passed via gRPC context metadata if needed.

### 2. `s.Start()` return value not checked
**What was wrong:** The handler registration example called `s.Start()` without checking its returned error. Both the HTTP and gRPC service `Start()` methods return `error`.
**What was changed:** Changed `s.Start()` to `log.Fatal(s.Start())` to properly handle the error.
**Why:** Ignoring the error from `Start()` means the service could silently fail to bind or listen, making debugging difficult.

## Review Notes
- The handler registration section uses `daprd.NewService(":8080")` but does not show the import for `daprd`. If using the HTTP service (`github.com/dapr/go-sdk/service/http`), `NewService` returns `common.Service` (no error). If using the gRPC service (`github.com/dapr/go-sdk/service/grpc`), it returns `(common.Service, error)`. The path parameter pattern `"/products/{id}"` only works with the HTTP service variant (which uses `chi` router). The code as written is consistent with the HTTP service import.
- The error handling section uses `status.FromError(err)` from `google.golang.org/grpc/status` but does not show the import. This is a standard gRPC pattern and is correct since the Dapr Go SDK client communicates over gRPC.
- All verified API signatures (`InvokeMethod`, `InvokeMethodWithContent`, `DataContent`, `InvocationEvent`, `Content`) are correct and current.
