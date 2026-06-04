# Validation Summary: How to Configure NFS Persistent Volumes with Dynamic Provisioning on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass
- NFS volumes
- NFS Subdir External Provisioner
- Helm
- kubectl
- Prometheus node-exporter

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volumes documentation for NFS volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- NFS Subdir External Provisioner upstream README: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- NFS Subdir External Provisioner Helm chart values and templates: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/tree/master/charts/nfs-subdir-external-provisioner
- Kubernetes image registry migration notice: https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/

## Issues Found
- The post used legacy `k8s.gcr.io` image references. Updated the NFS server image to `registry.k8s.io/volume-nfs:0.8` and the provisioner image to `registry.k8s.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2`, matching the Kubernetes registry migration guidance and the upstream provisioner manifest.
- The Helm install created a StorageClass while the next section also created a StorageClass named `nfs-dynamic`, and the provisioner names could differ. Updated the Helm command to disable chart-managed StorageClass creation and set `storageClass.provisionerName=nfs-provisioner`, so the later StorageClass manifest binds to the installed provisioner.
- The manual RBAC manifest was missing `nodes` permissions and the leader-election `endpoints` Role/RoleBinding present in the upstream deployment. Added those rules so the provisioner can run with leader election enabled.
- The StorageClass set `allowVolumeExpansion: true`, but the upstream NFS Subdir External Provisioner documents resize/expansion as unsupported. Changed it to `false`.
- The troubleshooting section used an unprivileged BusyBox pod to run `mount -t nfs`, which would normally fail because mounting requires node/container privileges and NFS client support. Replaced it with a check that verifies the provisioner can see its mounted `/persistentvolumes` export.
- The post implied PVC requested capacity behaves like an enforced allocation. Added a note that the NFS Subdir External Provisioner records the requested size but does not enforce per-volume quotas on the backing NFS share.

## Review Notes
The guide is technically valid after edits. Future improvements could mention that NFS workloads still need application-level file locking semantics where concurrent writes target the same files, and that namespaces such as `logging` and `monitoring` must exist before applying examples that reference them.
