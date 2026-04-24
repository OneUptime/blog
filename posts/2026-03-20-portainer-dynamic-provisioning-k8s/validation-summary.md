# Validation Summary: How to Configure Dynamic Provisioning for Kubernetes Storage in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes `StorageClass`
- Kubernetes PersistentVolumes (PVs)
- Kubernetes PersistentVolumeClaims (PVCs)
- Rancher Local Path Provisioner
- NFS Subdir External Provisioner
- `kubectl`

## Sources Consulted
- Portainer Kubernetes Volumes documentation - https://docs.portainer.io/user/kubernetes/volumes
- Portainer Kubernetes Setup documentation - https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer kubectl shell documentation - https://docs.portainer.io/user/kubernetes/kubectl
- Portainer Add a new application using a form documentation - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Kubernetes Dynamic Volume Provisioning documentation - https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/
- Kubernetes Storage Classes documentation - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Change the default StorageClass documentation - https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Rancher Local Path Provisioner README - https://github.com/rancher/local-path-provisioner
- Kubernetes SIGs NFS Subdir External Provisioner README - https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner

## Issues Found
- The introduction and Step 2 implied Portainer can create and manage `StorageClass` objects directly from a dedicated storage-class form. Current Portainer docs show Portainer listing available storage classes under **Volumes** → **Storage**, while creation is done via manifests or the Portainer `kubectl` shell. I corrected the wording and navigation.
- The original Portainer UI example recommended `kubernetes.io/no-provisioner` for local dynamic provisioning. Kubernetes docs state that `kubernetes.io/no-provisioner` does not support automatic provisioning for local volumes. I removed that guidance and kept the working `rancher.io/local-path` example.
- The sample `StorageClass` manifest already marked itself as default, which made Step 3 redundant. I removed the default annotation from the manifest so the later default-setting step is accurate.
- The Step 3 verification example showed a separate `DEFAULT` column. Current Kubernetes documentation shows the default class marked as `(default)` in the `NAME` column, so I corrected the verification guidance.
- Step 4 referred to a Portainer storage toggle that does not match the current documentation. I updated it to Portainer's **Available storage options** section and clarified that default-class behavior is controlled by Kubernetes.
- Step 5 used outdated or incorrect Portainer UI labels such as **Add application**, **Persisting data**, and raw Kubernetes access modes. I updated the instructions to match current Portainer documentation for **Add with form**, **Persisted folders**, storage location selection, and data access policy.
- The NFS `StorageClass` example incorrectly put the NFS server and export path in the `StorageClass` parameters. The upstream NFS Subdir External Provisioner documentation configures those values in the provisioner deployment, not in the `StorageClass`. I replaced the example with a valid `StorageClass` snippet using `onDelete`.
- The prerequisites listed plain `NFS` as though it were itself a dynamic provisioner. I corrected this to the NFS Subdir External Provisioner.

## Review Notes
- Portainer UI labels can vary slightly between releases; this review was aligned to the current Portainer documentation available on April 24, 2026.
- The Kubernetes default `StorageClass` behavior depends on the `DefaultStorageClass` admission controller being enabled, which is standard on most clusters but not universal.
- Commands and manifests were verified against official documentation, but they were not executed against a live Kubernetes cluster in this workspace.
