# Validation Summary: How to Manage Dapr CRDs with GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Component, Configuration, Resiliency, Subscription CRDs)
- ArgoCD (Application resource, CLI)
- Flux v2 (GitRepository, Kustomization)
- Kustomize (overlays, strategic merge patches)
- Kubernetes (kubectl, CI validation)
- Git / GitHub Actions

## Sources Consulted
- Dapr Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr state store Redis component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- ArgoCD Application spec: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#applications
- Flux GitRepository spec: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization spec: https://fluxcd.io/flux/components/kustomize/kustomizations/
- kubectl global flags: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **Incorrect kubectl flag `--kube-context`**: In the CI validation section, the command used `--kube-context staging`. The correct kubectl global flag is `--context`, not `--kube-context`. The `--kube-context` flag is a convention used by Helm and some other tools but is not recognized by kubectl. Changed to `--context staging`.

## Review Notes
- The ArgoCD Application manifest uses `apiVersion: argoproj.io/v1alpha1`, which is the current and correct API version for ArgoCD Application resources.
- The Flux resources use `source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1`, which are the current stable GA API versions.
- The Dapr Component CRDs correctly use `apiVersion: dapr.io/v1alpha1` with proper field names (`redisHost`, `enableTLS`, `state.redis` type).
- The Kustomize overlay patch replaces the entire `metadata` list (since Kubernetes strategic merge patches on lists use the list-level replacement strategy by default for unkeyed lists). This is the expected behavior for overriding component metadata per environment.
- The "Making Changes Through Git" section shows both automatic sync (via push to main) and manual sync trigger (`argocd app sync`). This is technically correct — the manual command forces immediate sync rather than waiting for the next poll cycle.
