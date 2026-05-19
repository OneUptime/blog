# Validation Summary: How to Configure Kubernetes Storage Classes on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass, PersistentVolume, and PersistentVolumeClaim
- Kubernetes StatefulSet volumeClaimTemplates
- Rancher Local Path Provisioner
- NFS and nfs-subdir-external-provisioner
- Helm
- Ubuntu NFS server packages

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Change the default StorageClass documentation: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Rancher local-path-provisioner README and stable deployment manifest: https://github.com/rancher/local-path-provisioner
- NFS Subdir External Provisioner README and Helm chart README: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- Helm installation documentation: https://helm.sh/docs/v3/intro/install/

## Issues Found
- The local-path provisioner install command used the `master` branch manifest. Changed it to Rancher's current stable manifest URL (`v0.0.36`) so the guide installs a pinned release rather than development branch content.
- The NFS `ReadWriteMany` explanation said multiple pods can mount the same volume simultaneously. Clarified that RWX is specifically for mounting read-write by many nodes; multiple pods alone is not the defining distinction from `ReadWriteOnce`.
- The custom local-path StorageClass example set `allowVolumeExpansion: true`. Removed that line because Rancher local-path-provisioner currently notes that it does not support enforcing volume capacity limits, so advertising PVC expansion for this provisioner is misleading.
- The section on multiple default StorageClasses said PVC requests without an explicit class will fail. Updated it to match Kubernetes documentation: Kubernetes uses the most recently created default StorageClass, although administrators should still keep only one default.

## Review Notes
- `kubectl` and `helm` were not installed in the local review environment, so command verification was performed against official Kubernetes, Helm, and upstream project documentation rather than local `--help` output.
- The NFS provisioner chart defaults to `storageClass.accessModes: ReadWriteOnce`, but the post's explicit claims about NFS supporting `ReadWriteMany` are correct for NFS-backed volumes when the provisioner/storage class is configured accordingly.
