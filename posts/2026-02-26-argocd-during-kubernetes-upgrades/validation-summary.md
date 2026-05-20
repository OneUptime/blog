# Validation Summary: How to Handle ArgoCD During Kubernetes Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- PodDisruptionBudget
- Argo CD sync windows and automated sync
- Fairwinds Pluto
- kubectl and argocd CLI

## Sources Consulted
- Argo CD tested Kubernetes versions: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/installation/
- Argo CD tested Kubernetes versions: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/installation/
- Argo CD sync windows: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD app set command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Fairwinds Pluto quickstart: https://pluto.docs.fairwinds.com/quickstart/
- Fairwinds Pluto installation: https://pluto.docs.fairwinds.com/installation/

## Issues Found
- The Argo CD compatibility comments for 2.10.x and 2.11.x did not match the official tested Kubernetes version tables. Updated 2.10.x to Kubernetes 1.25-1.28 and 2.11.x to Kubernetes 1.25-1.29.
- The Kubernetes deprecation examples used "deprecated in" where the listed version was actually the removal version for PodSecurityPolicy, Ingress v1beta1, and CronJob v1beta1. Updated the comments to distinguish deprecated and removed versions.
- The auto-sync workflow re-enabled automated sync on every application, including applications that may have been manual before the maintenance window. Added a pre-upgrade capture of apps with automated sync enabled and changed the restore command to re-enable only those apps.
- The PDB explanation implied PDBs always keep one replica running during drains. Clarified that this applies to multi-replica components and that single-replica workloads with `minAvailable: 1` can block voluntary evictions.

## Review Notes
The remaining commands and snippets are generally valid for the documented use case. For future improvement, the backup examples could be expanded to cover Applications in any namespace and to preserve the exact previous sync policy options such as prune and self-heal.
