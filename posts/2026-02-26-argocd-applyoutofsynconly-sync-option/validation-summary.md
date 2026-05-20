# Validation Summary: How to Use the 'ApplyOutOfSyncOnly' Sync Option in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet manifests
- Kubernetes
- GitOps
- Argo CD CLI

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The CLI examples used `argocd app sync my-large-app --sync-option ApplyOutOfSyncOnly=true`. Current Argo CD command documentation exposes one-time selective sync on `argocd app sync` as `--apply-out-of-sync-only`; `--sync-option` is an `argocd app set` flag for changing application sync options. Updated both sync examples to use `--apply-out-of-sync-only`.
- The post stated that applying a Job spec might cause Kubernetes to restart it. That is misleading for Kubernetes Jobs; a normal apply of an unchanged Job does not restart a completed Job. Replaced the example with a more accurate statement about custom resources and controllers reacting to update requests.
- The ApplicationSet example used legacy template variables such as `{{path.basename}}` and `{{path}}`. Updated the example to the current documented Go template style with `goTemplate: true`, `{{.path.basename}}`, and `{{.path.path}}`.

## Review Notes
The core explanation of `ApplyOutOfSyncOnly=true`, Application-level `spec.syncPolicy.syncOptions`, auto-sync usage, `PruneLast=true`, `ServerSideApply=true`, and `CreateNamespace=true` matches the official Argo CD documentation. The performance numbers are illustrative rather than vendor-guaranteed benchmarks, so they should be treated as examples.
