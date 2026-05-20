# Validation Summary: How to Use Server-Side Diff in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes server-side apply
- Kubernetes dry-run apply
- Argo CD sync options and compare options
- Kubernetes admission webhooks
- Kubernetes HPA-managed Deployment replicas

## Sources Consulted
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The post used `ServerSideApply=true` as the per-Application way to enable server-side diff. Argo CD documents server-side diff as an Application compare option: `argocd.argoproj.io/compare-options: ServerSideDiff=true`. I updated the Application example and clarified that `ServerSideApply=true` is a separate sync option for server-side apply.
- The post claimed mutation webhook output is included by default. Argo CD documents that server-side diff does not include mutating webhook changes by default; `IncludeMutationWebhook=true` must be set. I updated the explanation and example.
- The post included undocumented system-level resource customizations such as `resource.customizations.useServerSideDiff.*`. I replaced that section with the documented mutation-webhook compare option.
- The internal workflow claimed Argo CD only considers fields it manages based on `managedFields`. Argo CD server-side diff compares the predicted live object from dry-run server-side apply against live state. I corrected the workflow and added the documented caching behavior.
- The Istio sidecar example was misleading because Istio sidecar injection mutates Pods, not the Deployment object Argo CD normally diffs. I replaced it with a generic managed-resource mutating webhook example.
- The HPA example incorrectly said server-side diff would ignore replica differences based on field ownership. I corrected it to recommend `ignoreDifferences` for `/spec/replicas` when HPA manages the field.
- The field-manager section used the undocumented `controller.diff.server.side.manager` setting. I replaced it with the documented `argocd.argoproj.io/client-side-apply-migration-manager` annotation and clarified its migration-only purpose.
- The conflict-handling section used `managedNamespaceMetadata` and `ServerSideApply.ForceConflicts=true` as conflict forcing mechanisms. `managedNamespaceMetadata` is namespace metadata management, and `ServerSideApply.ForceConflicts=true` is not a documented Argo CD sync option. I updated the section to describe the current documented `ServerSideApply=true` behavior.
- The monitoring commands checked `.status.sync.comparedTo.source`, which does not verify server-side diff. I updated the commands to use `argocd app diff --server-side-diff` and inspect the compare-options annotation.
- The PromQL example filtered `apiserver_request_total` by a `client` label, which is not part of the documented stable API server request metric labels. I changed it to monitor dry-run PATCH request volume with the documented `dry_run` label.

## Review Notes
- Server-side diff is stable in Argo CD 3.1 and later, but older Argo CD release documentation describes it as beta. A future revision could include a short version note if the target Argo CD version range matters.
