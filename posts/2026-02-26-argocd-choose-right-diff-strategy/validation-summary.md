# Validation Summary: How to Choose the Right Diff Strategy in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Server-Side Diff
- Server-Side Apply
- Kubernetes Deployment manifests
- Argo CD `ignoreDifferences`
- Argo CD CLI

## Sources Consulted
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post used `syncPolicy.syncOptions: ServerSideApply=true` to enable server-side diff per application. That option enables server-side apply behavior, not the Server-Side Diff strategy. I changed the examples to use the documented application annotation `argocd.argoproj.io/compare-options: ServerSideDiff=true`.
- The post stated there was no per-application opt-out when server-side diff is enabled globally. Argo CD supports `argocd.argoproj.io/compare-options: ServerSideDiff=false`, so I corrected that statement.
- The global `controller.diff.server.side` configuration omitted the documented requirement to restart `argocd-application-controller`. I added that note.
- The post implied mutating admission webhook changes are handled by default. Argo CD Server-Side Diff does not include mutation webhooks by default, so I added the `IncludeMutationWebhook=true` caveat and narrowed the admission-controller wording.
- The Deployment example was not a valid `apps/v1` Deployment because it lacked a selector and matching pod-template labels. I added `spec.selector.matchLabels` and `spec.template.metadata.labels`.
- The example introduction referred to omitted resource requests, but the shown defaults were general API server defaults rather than resource-request defaults. I changed the wording to omitted optional fields.

## Review Notes
Server-Side Diff was introduced as beta in Argo CD 2.10 and is documented as stable since Argo CD 3.1. Kubernetes Server-Side Apply is stable and enabled by default since Kubernetes 1.22, although it existed before that as a beta feature.
