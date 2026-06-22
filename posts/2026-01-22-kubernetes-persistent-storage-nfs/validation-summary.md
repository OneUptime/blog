# Validation Summary: How to Set Up Persistent Storage with NFS in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass
- Kubernetes NFS volumes
- NFS server exports
- NFS Subdir External Provisioner
- Helm
- kubectl
- Kubernetes NetworkPolicy
- Linux systemd package and service commands

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volumes documentation for NFS: https://kubernetes.io/docs/concepts/storage/volumes/#nfs
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes node debugging with kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes SIGs NFS Subdir External Provisioner documentation: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- NFS exports manual page: https://man7.org/linux/man-pages/man5/exports.5.html

## Issues Found
- The post described ReadWriteOnce as a single-pod use case. Kubernetes defines ReadWriteOnce as read-write mount by a single node, and multiple pods on the same node can still use the volume. Updated the access-mode table to avoid implying single-pod enforcement.
- The NFS client verification command created `/mnt/nfs-test` but mounted the share at `/mnt`. Updated the mount, list, and unmount commands to use the same test directory.
- The troubleshooting example used `kubectl debug` with `busybox` and then ran `mount` directly. Current Kubernetes node-debug documentation mounts the node filesystem at `/host`, and `chroot /host` requires a privileged/sysadmin debug profile. Updated the example to use `ubuntu`, `--profile=sysadmin`, `chroot /host`, and a node-local mount path.
- The export restriction example used pod and service CIDR ranges. Kubernetes NFS PV mounts are performed from cluster nodes, so NFS exports should normally allow node IP ranges. Updated the example to use a node subnet and clarified the earlier export comment.
- The NetworkPolicy section implied NetworkPolicy alone could restrict NFS storage access. Kubernetes NetworkPolicy applies to selected pod traffic, while NFS volume mounts are node-level storage operations. Added a caveat to also enforce host firewall, cloud security group, or NFS export restrictions for node IP ranges.

## Review Notes
The remaining Kubernetes manifests use current API versions and valid fields. The NFS Subdir External Provisioner examples match the upstream project naming, image repository, provisioner name, Helm repository, and StorageClass parameters. The guide still uses permissive demonstration permissions such as `chmod 777` and `no_root_squash`; these are common for simple lab setups but should be tightened for production environments.
