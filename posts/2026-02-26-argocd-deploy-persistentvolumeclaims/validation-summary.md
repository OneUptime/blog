# Validation Summary: How to Deploy PersistentVolumeClaims with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, sync options, hooks, sync waves, and diff customization
- Kubernetes PersistentVolumeClaims and PersistentVolumes
- Kubernetes StorageClasses and dynamic provisioning
- AWS EBS CSI driver StorageClass parameters
- Kubernetes VolumeSnapshots
- Kustomize overlays
- kubectl

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Well-Known Labels, Annotations and Taints reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Amazon EKS StorageClass parameters reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html

## Issues Found
- The StorageClass example used the removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Changed it to the current AWS EBS CSI provisioner `ebs.csi.aws.com`.
- The same StorageClass example used `type: gp3` with `iopsPerGB`. Replaced it with explicit `iops` and `throughput` parameters for a gp3 example.
- The `PrunePropagationPolicy=orphan` comment implied it directly keeps PVCs when a parent is deleted. Reworded it to accurately describe orphan cascading behavior during pruning.
- The PVC diff section described all ignored fields as status fields and only listed the deprecated storage provisioner annotation. Reworded the description and added the current `volume.kubernetes.io/storage-provisioner` annotation while retaining the deprecated beta annotation for older clusters.

## Review Notes
- The PostgreSQL Deployment example is syntactically valid for a single replica, but a StatefulSet is usually the stronger production pattern for databases.
- The VolumeSnapshot hook is structurally valid, but a real cluster also needs the snapshot CRDs, CSI snapshot controller, a suitable VolumeSnapshotClass, and RBAC for the hook service account.
- The `Prune=false` annotation prevents Argo CD pruning of the PVC object, but backup and reclaim-policy choices are still required because GitOps manifests do not protect the volume's data.
