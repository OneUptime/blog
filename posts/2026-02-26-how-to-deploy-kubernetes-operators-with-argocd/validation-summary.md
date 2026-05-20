# Validation Summary: How to Deploy Kubernetes Operators with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Operators
- Kubernetes CustomResourceDefinitions and Custom Resources
- Helm charts in Argo CD
- Argo CD sync waves, sync options, custom health checks, pruning, and CLI commands

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/sync-options/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Garbage Collection documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/

## Issues Found
- The Application examples combined `ServerSideApply=true` with `Replace=true`. Argo CD documents that `Replace=true` takes precedence over `ServerSideApply=true` and can be destructive because it uses `kubectl replace/create`. I removed `Replace=true` from the operator and CRD Application examples so the documented server-side apply behavior is actually used.
- The finalizer section said `PrunePropagationPolicy=foreground` allows Argo CD to delete resources with finalizers. That option controls Kubernetes deletion propagation for pruned resources; it does not remove custom finalizers. I changed the text to explain that the operator must remove its own finalizers and added `PruneLast=true` with foreground propagation as pruning-order guidance.

## Review Notes
- The Argo CD CLI examples use valid commands and flags, but the local environment did not have the `argocd` binary installed, so command verification was done against the official command reference.
- The local environment did not have Helm installed, so Helm-specific fields were verified against Argo CD's official Helm integration documentation.
