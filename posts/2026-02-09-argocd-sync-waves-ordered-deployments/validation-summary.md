# Validation Summary: How to Implement ArgoCD Sync Waves for Ordered Multi-Resource Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync waves
- Argo CD resource hooks
- Argo CD CLI
- Kubernetes Deployments, StatefulSets, Services, Jobs, CRDs, and Ingress
- cert-manager custom resources

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_hooks/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_get/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The introduction said Kubernetes applies resources in parallel by default. Changed this to the more accurate statement that Kubernetes does not enforce dependencies between arbitrary manifests by default.
- The sync-wave explanation said resources in the same wave deploy in parallel. Updated it to match Argo CD's documented ordering by phase, wave, kind, and name.
- The basic StatefulSet and Deployment examples were missing required `apps/v1` selectors and pod-template labels. Added matching selectors and labels.
- The StatefulSet example used a governing Service in the same wave. Moved the Service to an earlier wave and made it headless so it matches StatefulSet requirements.
- The hook type list omitted delete hooks available in current Argo CD documentation. Added `PreDelete` and `PostDelete`.
- The hook descriptions for `Sync` and `PostSync` were oversimplified. Updated them to match Argo CD phase behavior.
- The non-critical hook example used unsupported `argocd.argoproj.io/sync-options: HookFailed=Ignore`. Replaced it with a `SyncFail` cleanup hook and clarified that failing `PreSync`, `Sync`, or `PostSync` hooks fail the sync operation.
- The blue-green snippets were missing required selectors, pod-template labels, pod specs, and a Service for the smoke-test target. Added minimal valid workload fields and Service definitions.
- The `argocd app sync --dry-run` text implied it previews execution order. Updated it to say it previews apply without affecting the cluster, which matches the CLI documentation.
- A debugging command comment claimed a jq query showed the stuck wave, but it only shows the operation phase. Updated the comment.

## Review Notes
Some examples remain intentionally abbreviated to focus on sync-wave ordering rather than complete production manifests. The post now avoids unsupported Argo CD options and uses required Kubernetes workload fields where examples are intended to be copyable.
