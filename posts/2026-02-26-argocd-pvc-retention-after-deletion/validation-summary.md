# Validation Summary: How to Handle PVC Retention After ArgoCD Application Deletion

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes StatefulSets
- kubectl
- AWS EBS CSI StorageClass examples

## Sources Consulted
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/
- Argo CD App Deletion: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Change the Reclaim Policy of a PersistentVolume: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy

## Issues Found
- The post said PVCs could be created by volume expansion. Volume expansion resizes an existing PVC/PV rather than creating a new PVC, so this was changed to refer to operators or external provisioners.
- The post described application-level `Prune=false` as protecting all PVCs from deletion. Argo CD documents `Prune=false` as a prune/sync control, while `Delete=false` is the resource-level sync option for preserving resources during application deletion. The wording was corrected and a clarification was added.
- The pre-deletion strategy claimed that removing PVC manifests from Git and syncing without pruning makes PVCs untracked and safe from application deletion. That is not reliably true because live resources can still carry Argo CD tracking metadata. The example was replaced with applying `Prune=false,Delete=false` to the PVC before deleting the app.
- The StatefulSet section recommended `ignoreDifferences` to exclude PVCs from sync/prune operations. Argo CD `ignoreDifferences` controls diffing and, with `RespectIgnoreDifferences=true`, selected sync fields; it does not exclude resources from pruning or application deletion. The example was replaced with Kubernetes `persistentVolumeClaimRetentionPolicy` plus Argo CD `Prune=false,Delete=false` annotations on the `volumeClaimTemplates`.
- The summary conflated `Prune=false` with deletion protection and stated Argo CD cascade deletion overrides Kubernetes StatefulSet PVC retention unconditionally. It was corrected to distinguish `Delete=false` for application deletion, `Prune=false` for sync pruning, and the conditional risk for tracked PVCs.

## Review Notes
The backup script is a simplified operational example. In a production version, it should document credentials, quiescing application writes, backup consistency for databases, and cleanup of completed backup Jobs.
