# Validation Summary: How to Use Git Submodules with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller `GitRepository`
- Flux kustomize-controller `Kustomization`
- Git submodules
- Kubernetes manifests
- Kustomize overlays
- Kubernetes Secrets

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `create secret git` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl kustomize` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The Flux Kustomization example used `targetNamespace: default` while applying resources intended for `app-namespace`. This would override namespaced resources such as `NetworkPolicy` and `ResourceQuota` into the wrong namespace, so the field was removed.
- The same Flux Kustomization example health-checked a `Namespace`. Flux documentation lists supported built-in health check kinds and does not include `Namespace`, so the unsupported health check was removed.
- The Kustomize overlay renamed only the `Namespace` object with a JSON patch. That would not reliably move the namespaced resources from the shared base into `my-service`, so the overlay now uses `namespace: my-service`.
- The HTTPS Secret example mentioned a deploy key in a `username`/`password` Secret. Flux uses `username`/`password` or `bearerToken` for HTTPS, while SSH keys are configured separately, so the comment now refers to a personal access token.
- The SSH authentication guidance did not mention Flux's documented limitation around deploy keys and submodules on common Git providers. The post now recommends HTTPS token authentication or an SSH key for a bot user that can access the main repository and all submodules.
- The troubleshooting command attempted to base64-decode the entire `.data` map from a Secret. It now decodes individual Secret fields with JSONPath.

## Review Notes
The core `spec.recurseSubmodules: true` guidance is current for `source.toolkit.fluxcd.io/v1`. Flux's `include` feature is also worth considering in future revisions because it supports separate authentication and source reconciliation for shared repositories, but the submodule workflow described here remains valid.
