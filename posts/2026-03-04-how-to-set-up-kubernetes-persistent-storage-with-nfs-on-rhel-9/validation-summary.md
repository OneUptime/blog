# Validation Summary: How to Set Up Kubernetes Persistent Storage with NFS on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NFS
- firewalld
- Kubernetes StorageClass
- Kubernetes PersistentVolumeClaim
- Kubernetes Deployment
- Kubernetes NFS CSI Driver
- Helm

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying an NFS server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- Kubernetes NFS CSI Driver README: https://github.com/kubernetes-csi/csi-driver-nfs
- Kubernetes NFS CSI Driver Helm chart documentation: https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/charts
- Kubernetes NFS CSI Driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Kubernetes NFS CSI Driver dynamic provisioning example: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/deploy/example/README.md
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The StorageClass did not specify an NFS protocol version. The RHEL 9 firewall example in the post opens only the `nfs` firewalld service, which is sufficient for an NFSv4-only mount path but not for a generic NFSv3 setup. Added `mountOptions: - nfsvers=4.1` to align the Kubernetes client mount with the RHEL NFSv4 firewall guidance and the upstream NFS CSI dynamic provisioning example.

## Review Notes
- The NFS export, `nfs-utils`, `exportfs`, `nfs-server`, Helm chart repository, CSI provisioner name, StorageClass fields, PVC access mode, and Deployment volume mount syntax were consistent with the consulted documentation.
- The NFS export uses broad access (`*`), `chmod 777`, and `no_root_squash`. These can be appropriate for a simple lab tutorial but should be narrowed for production environments.
