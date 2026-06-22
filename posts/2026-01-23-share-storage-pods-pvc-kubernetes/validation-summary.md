# Validation Summary: How to Share Storage Between Pods Using PersistentVolumeClaim

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes access modes: RWO, ROX, RWX, RWOP
- NFS
- AWS EFS CSI driver
- GCP Filestore CSI driver
- Azure Files
- CephFS
- Python file locking with fcntl
- kubectl troubleshooting commands

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes image registry freeze announcement: https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/
- Kubernetes v1.26 removals and GlusterFS in-tree driver removal: https://kubernetes.io/blog/2022/11/18/upcoming-changes-in-kubernetes-1-26/
- Amazon EKS EFS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- Amazon EFS CSI driver upstream documentation: https://github.com/kubernetes-sigs/aws-efs-csi-driver
- Google Cloud GKE Filestore CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
- Google Cloud GKE persistent volume access modes documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes
- Docker Hub documentation for itsthenetwork/nfs-server-alpine: https://hub.docker.com/r/itsthenetwork/nfs-server-alpine/

## Issues Found
- The post said PersistentVolumes support three access modes. Kubernetes now documents four access modes, including stable `ReadWriteOncePod` (`RWOP`). Added `ReadWriteOncePod` to the access mode table.
- The storage backend table listed GlusterFS as a current RWX option without a caveat. The in-tree GlusterFS plugin was deprecated in Kubernetes 1.25 and removed in Kubernetes 1.26. Updated the table to mark GlusterFS as legacy/CSI-only.
- The in-cluster NFS example used `k8s.gcr.io/volume-nfs:0.8`, which no longer has a pullable manifest and relies on the deprecated Kubernetes image registry. Replaced it with `itsthenetwork/nfs-server-alpine:12`, a pullable NFSv4 test image, and adjusted the environment variable, ports, and exported path accordingly.
- The NFS PersistentVolume used a cluster DNS name for `spec.nfs.server`. Since the NFS mount is performed by the node, cluster DNS names might not resolve there. Updated the example to use the NFS Service `clusterIP` as a placeholder.
- The troubleshooting section used `ping` for NFS connectivity and showed an unprivileged BusyBox pod manually mounting NFS. Replaced the connectivity check with a TCP port check to 2049 and changed the manual mount example to run from a node with NFS client tools.

## Review Notes
- The EFS and Filestore examples are directionally correct, but real deployments still require provider-specific prerequisites such as IAM permissions, installed CSI drivers, network access, and existing file systems or quota.
- The sample concurrent writer command demonstrates shared writes but does not guarantee application-level consistency. The later file-locking section correctly calls out locking or per-pod files for concurrent writes.
