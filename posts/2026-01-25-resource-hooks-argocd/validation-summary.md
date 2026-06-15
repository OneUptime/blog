# Validation Summary: How to Configure Resource Hooks in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks
- Argo CD sync phases and sync waves
- Kubernetes Jobs, Pods, ConfigMaps, Secrets, and PersistentVolumeClaims
- kubectl CLI
- Argo CD CLI
- Helm templating
- Slack and PagerDuty webhook-style notifications

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The sync lifecycle diagram incorrectly showed `Skip` as a phase reached after `Sync`. Argo CD documents `Skip` as a hook annotation value that tells Argo CD to skip applying the manifest. Updated the diagram and table wording to describe `Skip` accurately.
- The sync lifecycle diagram only showed `SyncFail` after `Sync`. Argo CD documents `SyncFail` as running when the sync operation fails. Updated the diagram to show failure paths from `PreSync`, `Sync`, and `PostSync`.
- The failure notification example used `$PAGERDUTY_URL` without defining it in the Job environment. Added a `PAGERDUTY_URL` environment variable sourced from the same `pagerduty-credentials` Secret.
- The section titled "Hook Weights" used non-standard terminology for the `argocd.argoproj.io/sync-wave` annotation. Renamed it to "Sync Waves" to match Argo CD documentation.

## Review Notes
The examples are intentionally illustrative and use placeholder images, service names, and Secret keys. The local environment did not have `argocd` or `kubectl` installed, so CLI validation was performed against official command references rather than local `--help` output.
