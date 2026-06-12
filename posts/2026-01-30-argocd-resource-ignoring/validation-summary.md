# Validation Summary: How to Create ArgoCD Resource Ignoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Application CRD
- Argo CD diff customization and sync options
- Kubernetes metadata and managed fields
- JSON Pointer
- JQ path expressions
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Reconcile Optimization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/reconcile/
- Argo CD Application CRD manifest: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/crds/application-crd.yaml
- Kubernetes declarative object management documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/
- RFC 6901 JSON Pointer: https://datatracker.ietf.org/doc/html/rfc6901

## Issues Found
- The introduction said ignore rules prevent unnecessary reconciliation loops. Application-level `ignoreDifferences` controls diff/sync status, while reconcile optimization has separate system-level behavior. Changed this to "unnecessary sync attempts."
- The common scenarios list described `lastAppliedConfiguration` as a timestamp added by Kubernetes. Kubernetes documentation identifies `kubectl.kubernetes.io/last-applied-configuration` as an annotation written by `kubectl apply`. Updated the wording accordingly.
- Two complete Argo CD `Application` examples omitted `spec.project`, which is required by the Application CRD. Added `project: default`.
- The metadata ignore example included `.metadata.managedFields` even though Argo CD already supports `managedFieldsManagers` for managed-field ownership and Argo CD's resource-update optimization ignores `managedFields` by default. Removed the redundant field ignore.
- Webhook `caBundle` JQ expressions used `.webhooks[]`. Updated them to `.webhooks[]?.clientConfig.caBundle`, matching the optional traversal style in the Argo CD documentation and avoiding errors when the list is absent or null.

## Review Notes
- The Argo CD CLI commands could not be checked with a local `argocd --help` because the CLI is not installed in this environment, so they were verified against the official Argo CD command reference.
- All fenced YAML snippets were parsed successfully with PyYAML after the edits.
- The updated webhook JQ expression was checked locally with `jq`.
