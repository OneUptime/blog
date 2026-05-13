# Validation Summary: How to Use Annotations to Prevent Pruning in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2 Kustomization
- Flux kustomize-controller pruning and garbage collection
- Kubernetes annotations
- Kustomize patches
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux FAQ on disabling garbage collection with the prune annotation: https://fluxcd.io/flux/faq/
- Flux kustomize-controller source constants for enabled/disabled annotation values: https://github.com/fluxcd/kustomize-controller/blob/main/api/v1/kustomization_types.go
- Flux kustomize-controller pruning implementation: https://github.com/fluxcd/kustomize-controller/blob/main/internal/controller/kustomization_controller.go
- Kubernetes Kustomize documentation for patches and patch targets: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The verification commands used `kubectl get ... -o jsonpath='{.metadata.annotations}' | jq .`. Kubernetes JSONPath output for a map is not JSON, so piping it to `jq` is unreliable and can fail. Changed the commands to query the specific escaped annotation key directly and updated the expected output to `disabled`.

## Review Notes
Flux also supports using a label with the same `kustomize.toolkit.fluxcd.io/prune: disabled` key/value to disable pruning, but the post is intentionally focused on annotations. The lowercase `disabled` value used in the examples matches Flux controller constants and Flux FAQ examples.
