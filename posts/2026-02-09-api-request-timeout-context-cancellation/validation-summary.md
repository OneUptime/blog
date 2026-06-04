# Validation Summary: How to Handle API Request Timeout and Context Cancellation in client-go

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Go `context` package
- Kubernetes client-go
- Kubernetes API watches and `resourceVersion`
- Kubernetes API error helpers
- Kubernetes REST client configuration

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- Kubernetes client-go REST config documentation: https://pkg.go.dev/k8s.io/client-go/rest
- Kubernetes client-go typed CoreV1 client documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/core/v1
- Kubernetes API error helper documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/api/errors
- Kubernetes API concepts and watch semantics: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes client-go cache/Reflector documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache

## Issues Found
- The cancellable controller example stored a `context.Context` in the `Controller` struct. Go's official context guidance says contexts should be passed explicitly to functions rather than stored in structs. Updated the example so the controller stores only the cancel function and passes the context into `watchPods`.
- The client timeout example imported `k8s.io/client-go/rest` but did not use it. Removed the unused import so the snippet no longer suggests code that would fail Go's unused-import check.
- The raw watch reconnection example restarted watches without preserving a `resourceVersion`, which can miss changes between watch attempts. Updated the example to track the last observed resource version and use it when reconnecting.
- The best-practice item saying to never pass `context.Background()` directly was too absolute. Updated it to recommend passing caller-provided contexts through controller operations or deriving contexts with timeout/cancel.

## Review Notes
The examples use current client-go method signatures that accept `context.Context` for `Get`, `List`, `Watch`, `Update`, and `UpdateStatus`. For production controllers, shared informers or reflectors are usually preferable to hand-rolled raw watch loops because client-go handles list/watch synchronization and reconnection behavior for you.
