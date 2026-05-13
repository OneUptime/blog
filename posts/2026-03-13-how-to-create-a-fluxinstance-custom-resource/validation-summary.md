# Validation Summary: How to Create a FluxInstance Custom Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Operator
- FluxInstance custom resource
- Kubernetes custom resources
- GitOps synchronization
- GitRepository and OCIRepository sources
- kubectl

## Sources Consulted
- Flux Operator FluxInstance API reference: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator cluster sync configuration: https://fluxoperator.dev/docs/instance/sync/
- Flux Operator instance customization guide: https://fluxoperator.dev/docs/instance/customization/
- Flux official installation guide, Bootstrap with Flux Operator: https://fluxcd.io/flux/installation/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The distribution examples used `2.4.0`, which is a stale pinned Flux version for a current Flux Operator guide. Updated the examples to `2.8.x`, matching the current Flux Operator documentation's semver-range examples and preserving automatic patch upgrades.
- The components list omitted `source-watcher`, which is a supported FluxInstance component in current Flux Operator documentation. Added `source-watcher` and noted that it requires Flux v2.7.0 or later.
- The cluster type comment listed only `kubernetes` and `openshift`. Current Flux Operator documentation also supports `azure`, `aws`, and `gcp`. Updated the comment.

## Review Notes
- The `kubectl apply`, `kubectl get`, `kubectl describe`, `kubectl edit`, and `kubectl delete` commands are syntactically valid.
- The sync examples use supported FluxInstance `sync` fields for `GitRepository` and `OCIRepository`.
- The OCI sync example assumes the `ghcr-auth` pull secret already exists; a future improvement could show the registry secret creation command, but the example is technically valid as written.
