# Validation Summary: How to Fix ArgoCD Stuck in 'Syncing' State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- Kubernetes Jobs
- Kubernetes admission webhooks
- Kubernetes PodDisruptionBudgets
- Prometheus metrics

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app terminate-op` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_terminate-op/
- Argo CD Sync Applications with Kubectl: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/sync-kubectl/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD High Availability: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Pod Disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The hook discovery command used `kubectl get jobs -l argocd.argoproj.io/hook`, but `argocd.argoproj.io/hook` is an annotation, not a label. Changed it to inspect Job YAML for the hook annotation.
- The Job pod log command used the older `job-name` selector. Updated it to the current Kubernetes Job label `batch.kubernetes.io/job-name`.
- The sync wave inspection command used `argocd app resources my-app -o wide`, but current `argocd app resources` supports `tree` and `tree=detailed` output, not `wide`. Replaced it with `argocd app manifests` and a search for the sync-wave annotation.
- The controller sharding recovery command only scaled the StatefulSet. Argo CD documentation requires `ARGOCD_CONTROLLER_REPLICAS` to match the controller replica count for StatefulSet-based sharding, so the example was changed to a StatefulSet manifest showing both settings.
- The webhook section implied webhook issues make all apply operations hang indefinitely. Kubernetes admission webhooks use timeouts and only affect matching requests, so the text now says matching apply operations can be delayed or fail after the webhook timeout.
- The stale operation patch removed `/status/operationState`, which is reported status rather than the requested operation. Changed the last-resort patch to remove `/operation`.
- The PDB section incorrectly said a PDB can prevent Deployments from rolling out. Kubernetes documents that workload controllers are not limited by PDBs during rolling updates, so the section now describes eviction-based operations such as node drains.
- The prevention and summary text referred to generic resource health check timeouts. Reworded this to Kubernetes-level deadlines such as `activeDeadlineSeconds` on Jobs and `progressDeadlineSeconds` on Deployments.
- The sync retry recommendation implied retries prevent hanging syncs. Reworded it to apply to transient sync failures.

## Review Notes
The post remains version-neutral. Some behaviors, such as controller sharding and CLI output formats, can vary across Argo CD releases, so future updates should re-check these commands against the Argo CD version the post intends to target.
