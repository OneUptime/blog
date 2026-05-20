# Validation Summary: How to Use SyncFail Hooks for Cleanup After Failed Syncs in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync hooks and sync waves
- Kubernetes Jobs
- Kubernetes RBAC
- kubectl
- Slack incoming webhooks
- PagerDuty Events API v2

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-waves/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- PagerDuty Events API v2 alert event documentation: https://developer.pagerduty.com/docs/send-alert-event
- PagerDuty Events API v2 routing key documentation: https://support.pagerduty.com/main/docs/rulesets-advanced-configuration

## Issues Found
- The post said SyncFail hooks run as Kubernetes Jobs. Argo CD hooks can be any Kubernetes resource kind, though Jobs are common for one-off actions, so the wording was corrected.
- The cleanup example used `kubectl scale ... --ignore-not-found`, but current `kubectl scale` does not support `--ignore-not-found`. The unsupported flag was removed and the existing `|| true` keeps the cleanup script tolerant of a missing canary deployment.
- The cleanup RBAC example did not include `deletecollection` for label-selector deletes. The Role was updated because `kubectl delete ... -l ...` may use collection deletion.
- The cleanup RBAC example granted only `update` on `deployments/scale`. The Role was updated to include `get`, `update`, and `patch`, which better matches `kubectl scale` behavior and the scale subresource verbs.
- The debug job used `serviceAccountName: debug-sa` without noting required permissions. A short note was added that the ServiceAccount needs access to list Pods and Events and read Pod logs.

## Review Notes
The examples use `latest` container image tags for brevity. For production use, pin image tags or digests so failure-handling hooks remain reproducible.
