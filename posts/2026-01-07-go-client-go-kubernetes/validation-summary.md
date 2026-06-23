# Validation Summary: How to Use client-go for Kubernetes API Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Kubernetes API
- Kubernetes client-go
- Kubernetes typed clientsets
- Kubernetes dynamic client and unstructured objects
- Informers and shared informer factories
- Work queues
- Kubernetes API pagination
- Kubernetes patch, update, and deletion semantics

## Sources Consulted
- client-go package documentation: https://pkg.go.dev/k8s.io/client-go
- client-go installation documentation: https://github.com/kubernetes/client-go/blob/master/INSTALL.md
- client-go workqueue package documentation: https://pkg.go.dev/k8s.io/client-go/util/workqueue
- client-go out-of-cluster configuration example: https://pkg.go.dev/k8s.io/client-go/examples/out-of-cluster-client-configuration
- Kubernetes API concepts documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes sample-controller client-go overview: https://github.com/kubernetes/sample-controller/blob/master/docs/controller-client-go.md
- client-go module metadata for the current latest release: https://raw.githubusercontent.com/kubernetes/client-go/v0.36.2/go.mod

## Issues Found
- The prerequisites said Go 1.21 or later was sufficient while the setup commands use `@latest`. The current latest client-go module advertises a newer Go requirement in its `go.mod`, so the prerequisite was changed to tell readers to use a Go version supported by the selected client-go release or pin an appropriate `v0.x.y` version.
- The `PatchDeploymentImage` function comment incorrectly said it used JSON Patch while the code used `types.StrategicMergePatchType`. The comment was corrected to say strategic merge patch.
- The `AddDeploymentAnnotation` example used JSON Patch against `/metadata/annotations/<key>`, which can fail if annotations are absent and requires JSON Pointer escaping for annotation keys containing `/` or `~`. It was changed to use `types.MergePatchType` with a partial metadata annotation object.
- The Pod informer snippet imported `k8s.io/apimachinery/pkg/util/wait` but did not use it. The unused import was removed.
- The Pod informer delete handler directly type-asserted deleted objects as `*corev1.Pod`. Informer delete handlers may receive `cache.DeletedFinalStateUnknown` tombstones, so tombstone handling was added.
- The work queue controller used deprecated untyped workqueue APIs. It was updated to `workqueue.TypedRateLimitingInterface[string]`, `NewTypedRateLimitingQueue`, and `NewTypedItemExponentialFailureRateLimiter[string]`.
- The work queue controller created a shared informer factory but never started it before waiting for cache synchronization. A factory field was added to the controller and `c.factory.Start(ctx.Done())` now runs before `WaitForCacheSync`.
- The work queue controller used `cache.MetaNamespaceKeyFunc` for delete events, which does not handle tombstones. It was changed to `cache.DeletionHandlingMetaNamespaceKeyFunc`.
- The complete Pod monitor example imported `fmt` but did not use it. The unused import was removed.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. I could not compile the Go snippets locally because the `go` tool is not installed in this environment, so syntax and API review was performed against official package documentation and Kubernetes documentation.
