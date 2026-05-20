# Validation Summary: How to Handle ArgoCD During Node Maintenance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Pod Disruption Budgets
- Kubernetes node cordon, drain, and uncordon operations
- Argo CD notifications
- Argo CD sync windows
- Kubernetes Jobs

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes API-initiated eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/

## Issues Found
- The post said draining a node evicts all pods. Kubernetes drain does not delete mirror pods, ignores DaemonSet pods when `--ignore-daemonsets` is used, and requires `--force` for unmanaged pods. Updated the explanation to describe eligible workload pods and the important exceptions.
- The Mermaid diagram implied guaranteed Argo CD downtime after pod eviction. Updated it to "possible brief ArgoCD downtime" because HA deployments may continue serving.
- The application-controller HA comment described scaling as leader-election active/passive behavior. Current Argo CD HA documentation describes controller scaling and sharding requirements, so the comment was changed to avoid the incorrect "only the leader is active" claim.
- The anti-affinity Deployment example omitted the required Deployment selector and matching pod template labels. Added those fields so the manifest is structurally valid.
- The non-HA maintenance procedure disabled auto-sync on every application and then re-enabled auto-sync on every application, which could turn originally manual applications into automated applications. Changed the snippet to record only applications that already had automated sync and restore only that list.
- The notification example claimed it delayed alerts for 10 minutes and was maintenance-window aware, but the shown Argo CD trigger only used `oncePer`. Updated the surrounding text and comments to accurately describe repeat-alert suppression.
- The sync-window explanation said Argo CD would fight pod rescheduling. Kubernetes performs rescheduling; Argo CD sync windows block sync operations, including automated syncs. Updated the wording to reflect that.
- The monitoring command used `deployment/argocd-application-controller`, but the application controller is installed as a StatefulSet. Updated the log command to `statefulset/argocd-application-controller`.
- The post-maintenance validation used `grep` against tabular output, which could count headers or miss status combinations. Replaced it with JSON output and `jq` filters for health and sync status.
- The pending-pod check was labeled as an orphaned-resource check. Updated the label to accurately describe pending pods.
- The Kubernetes Job attempted to read an admin password from `/var/run/secrets/argocd/admin-password`, which is not mounted there by default. Replaced the login flow with `argocd --core`, using the Job service account and Kubernetes API access.

## Review Notes
- The examples assume `jq` is available on the operator workstation for JSON filtering.
- The Job image tag should normally match the installed Argo CD version; the post keeps the author's explicit `v2.10.0` example but this may be updated by operators for newer installations.
- PDBs with `minAvailable: 1` intentionally block voluntary disruption for single-replica components, so they should be paired with enough replicas or HA manifests.
