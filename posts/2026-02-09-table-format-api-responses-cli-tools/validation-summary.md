# Validation Summary: How to Use Table Format API Responses for Custom CLI Tools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes API
- Kubernetes Table responses (`meta.k8s.io/v1`)
- kubectl
- Go
- client-go

## Sources Consulted
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl proxy reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_proxy/
- Go package documentation for `k8s.io/apimachinery/pkg/apis/meta/v1`: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1
- Go package documentation for `k8s.io/client-go/rest`: https://pkg.go.dev/k8s.io/client-go/rest

## Issues Found
- The raw API command used `kubectl get --raw` with `-H`, but the official `kubectl get` reference documents `--raw` as a URI option and does not provide a header flag. Changed the example to use `kubectl proxy` plus `curl -H` so the `Accept` header is actually sent.
- The first Go program imported unused packages, which would prevent it from compiling. Removed the unused imports from that program.
- The default Table response example showed each row object as a partial `Pod`. Kubernetes TableOptions default to metadata-only row objects, so the sample row object was changed to `PartialObjectMetadata`.
- The post claimed Table format works for any resource type. Kubernetes documentation notes that some extension APIs might not serve Table responses and clients should use a fallback media type when needed. Updated the wording and best practices to reflect that caveat.
- The grouped-resource path helper always inserted `namespaces/<namespace>` for non-core resources, even when the namespace was empty. Updated the path construction to handle cluster-scoped or all-namespace requests.
- The `includeObject` example ignored decode errors and type-asserted `row.Object.Object` directly. Updated it to check `Into` errors, read `row.Object.Raw`, decode JSON into `corev1.Pod`, and guard against pods with no containers.
- The filtered table example ignored errors from `result.Into(table)`. Updated it to return decode errors.
- The generic lister used `client.AppsV1().RESTClient()` for every non-core group, which only works for the apps API group. Replaced it with a REST client configured from the supplied `GroupVersionResource`.
- The column definition caching advice was too absolute. Updated it to recommend caching per resource type and API version during a run.
- The custom-resource extensibility claim was too broad. Updated it to apply to custom resources and extension APIs that serve Table responses.

## Review Notes
The examples still assume the surrounding snippets have the usual Kubernetes/client-go imports available where not shown. Production clients that must support every API should include `application/json` as a fallback in the `Accept` header and handle non-Table responses.
