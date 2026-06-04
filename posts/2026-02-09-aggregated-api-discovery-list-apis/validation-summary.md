# Validation Summary: How to Use Aggregated API Discovery to List All Cluster APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Discovery API
- Kubernetes aggregated discovery (`apidiscovery.k8s.io/v2`)
- kubectl and Kubernetes API access
- jq
- Go
- Kubernetes client-go discovery client

## Sources Consulted
- Kubernetes API overview, Discovery API and aggregated discovery: https://kubernetes.io/docs/concepts/overview/kubernetes-api/
- Kubernetes kubectl get reference (`--raw` option): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `k8s.io/api/apidiscovery/v2` Go API reference: https://pkg.go.dev/k8s.io/api/apidiscovery/v2
- Kubernetes `k8s.io/client-go/discovery` Go API reference: https://pkg.go.dev/k8s.io/client-go/discovery
- Kubernetes `k8s.io/client-go/discovery/cached/memory` Go API reference: https://pkg.go.dev/k8s.io/client-go/discovery/cached/memory

## Issues Found
- The post incorrectly used `kubectl get --raw /apis` as if it returned aggregated discovery data. Kubernetes returns the unaggregated discovery document from `/api` and `/apis` unless the request includes an `Accept` header for `apidiscovery.k8s.io`. Updated command examples to use `kubectl proxy` and `curl -H "Accept: application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList"`.
- The post described aggregated discovery as a single request for all APIs. Official Kubernetes documentation exposes aggregated discovery through two roots: `/api` for the core group and `/apis` for named groups. Updated the explanation and inventory script to account for both endpoints.
- The example response used `apidiscovery.k8s.io/v2beta1`. Aggregated discovery is stable as `apidiscovery.k8s.io/v2` in current Kubernetes documentation, so the example was updated to `v2`.
- The traditional discovery examples used `/apis/apps` and `/apis/batch` to list group resources. Resource discovery for a named group version uses paths such as `/apis/apps/v1` and `/apis/batch/v1`; the examples were corrected.
- The "Finding All Custom Resources" section treated dotted API group names as CRDs. That heuristic also matches many built-in and aggregated API groups, so the section was corrected to describe domain-qualified API groups and point readers to `kubectl get crds` when they need CRD-backed APIs specifically.
- The main Go example imported `context`, `metav1`, and `discovery` without using them, which would prevent the program from compiling. Removed the unused imports.

## Review Notes
The Go snippets use current client-go discovery methods such as `ServerGroups`, `ServerGroupsAndResources`, `ServerResourcesForGroupVersion`, and `memory.NewMemCacheClient`. `kubectl` was not installed in the local environment, so CLI behavior was verified against the official generated kubectl reference and Kubernetes API documentation rather than local `--help` output.
