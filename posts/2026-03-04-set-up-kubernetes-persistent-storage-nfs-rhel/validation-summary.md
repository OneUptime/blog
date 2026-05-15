# Validation Summary: How to Set Up Kubernetes Persistent Storage with NFS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- NFS server and client utilities
- firewalld
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes NFS volumes
- Helm
- NFS Subdir External Provisioner

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying an NFS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- Kubernetes documentation, "Persistent Volumes": https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes documentation, "Volumes - nfs": https://kubernetes.io/docs/concepts/storage/volumes/#nfs
- kubernetes-sigs nfs-subdir-external-provisioner repository: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- NFS Subdirectory External Provisioner Helm chart README: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/blob/master/charts/nfs-subdir-external-provisioner/README.md
- Helm documentation, "helm repo add": https://helm.sh/docs/helm/helm_repo_add/
- Helm documentation, "helm install": https://helm.sh/docs/helm/helm_install/

## Issues Found
- The static PersistentVolume section created `/srv/nfs/k8s/pv-{1,2,3}` without saying that this command must run on the NFS server. I updated the comment to make the execution location explicit.
- The static PersistentVolume subdirectories were created as root-owned directories with default permissions, which can prevent non-root workloads from writing even though the parent export was made writable. I added `chown nobody:nobody` and `chmod 777` for the PV subdirectories to match the permissions model used earlier in the tutorial.

## Review Notes
- The NFS export, `nfs-utils`, `nfs-server`, `exportfs`, and firewalld service commands are consistent with Red Hat's RHEL 9 NFS documentation.
- The Kubernetes PersistentVolume, PersistentVolumeClaim, and Pod manifests use current `v1` API fields and valid NFS/PVC volume syntax.
- The NFS Subdir External Provisioner Helm repository, chart name, and `nfs.server`, `nfs.path`, `storageClass.name`, and `storageClass.defaultClass` values match the upstream chart documentation.
- The tutorial uses permissive `no_root_squash` and `0777` permissions for simplicity. That is functional for a lab or trusted network, but production deployments should use tighter export rules, identity mapping, and workload-specific permissions.
