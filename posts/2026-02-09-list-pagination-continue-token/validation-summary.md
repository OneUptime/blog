# Validation Summary: How to Use List Pagination with continue Token for Large Resource Lists

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API
- kubectl
- Go
- client-go
- HTTP API requests with curl

## Sources Consulted
- Kubernetes API Concepts, "Retrieving large results sets in chunks": https://kubernetes.io/docs/reference/using-api/api-concepts/#retrieving-large-results-sets-in-chunks
- Kubernetes generated kubectl command reference for `kubectl get` and `--chunk-size`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get
- Kubernetes kubectl overview: https://kubernetes.io/docs/concepts/overview/kubectl/
- Go package documentation for `k8s.io/apimachinery/pkg/apis/meta/v1` `ListOptions` and `ListMeta`: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1
- Go package documentation for `k8s.io/apimachinery/pkg/api/errors` `IsResourceExpired`: https://pkg.go.dev/k8s.io/apimachinery/pkg/api/errors

## Issues Found
- The kubectl section said `--chunk-size` enables pagination. Official kubectl docs show `kubectl get` has a default `--chunk-size` of 500 and `0` disables chunking, so the wording was corrected to say the flag controls pagination.
- The client-go example printed `continueToken[:20]`, which could panic because continue tokens are opaque and the API does not guarantee a minimum string length. The example now truncates only when the token is longer than 20 characters.
- The raw `curl` example interpolated the continue token directly into the URL. Because Kubernetes continue tokens are opaque, the example now uses `curl -G --data-urlencode` to URL-encode the `continue` query parameter.
- The resource expiration example used an ambiguous `errors.IsResourceExpired` reference and reset `continueToken` but then returned the error, so it did not actually retry. The example now references the Kubernetes API errors package as `apierrors`, updates `listOptions.Continue` inside the loop, and continues after resetting the token.

## Review Notes
- The main pagination behavior is accurate: Kubernetes supports `limit` and `continue` for chunked list requests, returns the continue token in list metadata, preserves a consistent `resourceVersion` across chunks, and expires continue tokens after a short time, returning `410 Gone` / ResourceExpired.
- In real controller code, informers or listers are usually preferred for ongoing reconciliation loops. Direct paginated list calls remain appropriate for one-off tools, batch scans, and custom administrative workflows.
