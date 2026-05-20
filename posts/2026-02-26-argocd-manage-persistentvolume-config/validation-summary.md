# Validation Summary: How to Manage PersistentVolume Configurations with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes StatefulSets
- AWS EBS CSI driver
- Prometheus and PrometheusRule alerting

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD orphaned resources monitoring documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Kubernetes PersistentVolumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html

## Issues Found
- The post used `argocd.argoproj.io/sync-options: Delete=false` as the protection against pruning when a PVC is removed from Git. Argo CD documents `Prune=false` as the sync option for preventing pruning, while `Delete=false` applies to cleanup during Application deletion. Updated PVC examples and explanatory text to use `Prune=false,Delete=false`.
- The Application examples disabled automated pruning but did not include an application-level `Prune=false` sync option for manual prune protection. Added `Prune=false` to the relevant `syncOptions`.
- The PVC finalizer section implied `kubernetes.io/pvc-protection` was a general deletion-prevention control. Kubernetes uses it to delay deletion of PVCs that are actively in use. Updated the text to clarify its scope.
- The AppProject sync-window example claimed it could deny only automatic pruning of PVCs. Argo CD sync windows apply to syncs for matching applications, not to a specific resource kind or prune action. Replaced the snippet with project-level orphaned resource warnings.
- The StatefulSet section stated that deleting a StatefulSet does not delete PVCs without mentioning the newer `persistentVolumeClaimRetentionPolicy`. Updated the statement to say this is the default behavior and noted the policy can change it.
- The AWS EBS sample used a volume ID containing non-hexadecimal characters. Replaced it with a plausible hexadecimal EBS volume ID.

## Review Notes
The Prometheus volume metrics used in the post are currently documented by Kubernetes as alpha kubelet metrics. The alert examples are syntactically reasonable, but production rules may need label filtering or aggregation depending on the Prometheus scrape configuration and storage driver behavior.
