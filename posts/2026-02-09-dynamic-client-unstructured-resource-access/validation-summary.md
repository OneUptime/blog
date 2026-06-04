# Validation Summary: How to Use Dynamic Client in client-go for Unstructured Resource Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Go
- client-go dynamic client
- Kubernetes discovery client
- Kubernetes unstructured API objects
- Custom Resources and CRDs

## Sources Consulted
- k8s.io/client-go/dynamic package documentation: https://pkg.go.dev/k8s.io/client-go/dynamic
- k8s.io/apimachinery/pkg/apis/meta/v1/unstructured package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1/unstructured
- k8s.io/apimachinery/pkg/runtime package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime
- k8s.io/client-go/discovery package documentation: https://pkg.go.dev/k8s.io/client-go/discovery
- k8s.io/apimachinery/pkg/watch package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/watch
- Kubernetes client-go repository: https://github.com/kubernetes/client-go

## Issues Found
- The structured-to-unstructured conversion example used `runtime.DefaultUnstructuredConverter.ToUnstructured(pod, &unstructuredObj.Object)`, but the current `UnstructuredConverter` API returns `(map[string]interface{}, error)` from `ToUnstructured(obj)`. Updated the example to capture the returned map and build an `unstructured.Unstructured` from it.
- The conversion example referenced `corev1.Pod` without importing `k8s.io/api/core/v1`. Added the missing import to the snippet.
- The runtime discovery example used `rest.Config` and `strings.Contains` without importing `k8s.io/client-go/rest` and `strings`. Added the missing imports to the snippet.
- The watch example asserted every watch event object as `*unstructured.Unstructured`. Kubernetes watch error events can carry a different runtime object, so the example could panic. Updated the code to check the type assertion and continue on unexpected object types.

## Review Notes
The post's main explanation of dynamic clients, GVR usage, namespace scoping, CRUD operations, nested unstructured helpers, discovery, and typed/unstructured conversion is consistent with current Kubernetes Go package documentation. Several snippets are still presented as tutorial fragments rather than a single standalone Go file, so a reader would need to combine imports when assembling a full program.
