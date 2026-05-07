# Validation Summary: How to Configure NFS Storage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- PersistentVolume and PersistentVolumeClaim
- StorageClass
- NFS
- NFS CSI Driver
- Helm
- kubectl

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Security Context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Rancher NFS storage documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/provisioning-storage-examples/nfs-storage
- NFS CSI Driver repository README: https://github.com/kubernetes-csi/csi-driver-nfs
- NFS CSI Driver Helm chart documentation: https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/charts
- NFS CSI Driver parameters reference: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md

## Issues Found
- The troubleshooting command `kubectl logs -n kube-system -l app=csi-nfs-controller --tail=50` was incomplete because the `csi-nfs-controller` pod runs multiple containers in the official chart. I changed it to `kubectl logs -n kube-system -l app=csi-nfs-controller -c nfs --tail=50` so the command targets the CSI driver container directly and works reliably.
- The summary claimed that block storage cannot offer `ReadWriteMany`. That was too absolute. Kubernetes documents access mode support as backend- and driver-dependent, so I changed the wording to say that many block storage backends do not offer it.

## Review Notes
- The NFS server export example is functional, but it is intentionally permissive (`*`, `no_root_squash`, and `chmod 777`). Rancher’s own NFS guidance is more restrictive for production use, typically scoping exports to cluster node IPs or subnets.
