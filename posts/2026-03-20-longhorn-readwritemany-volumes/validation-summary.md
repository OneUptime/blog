# Validation Summary: How to Configure Longhorn ReadWriteMany (RWX) Volumes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- PersistentVolumeClaims (PVCs)
- StorageClass
- NFSv4.1
- kubectl

## Sources Consulted
- Longhorn ReadWriteMany (RWX) Volume docs: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn Storage Class Parameters docs: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn installation requirements and NFSv4 client setup: https://longhorn.io/docs/latest/deploy/install/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/

## Issues Found
- The Deployment manifest was invalid because `apps/v1` Deployments require `.spec.selector` to match `.spec.template.metadata.labels`. I added the missing pod-template labels so the example can be created successfully.
- The StorageClass snippet incorrectly implied that `nfsOptions` enables RWX. Longhorn RWX is driven by the PVC access mode, and Longhorn already uses NFSv4.1 for RWX volumes by default. I removed the misleading override and updated the best-practices note to explain that any `nfsOptions` override must provide the complete desired option set.
- The prerequisites and troubleshooting guidance referred to the `nfsd` kernel module, which is the kernel NFS server module. Longhorn RWX requires NFSv4 client support on each node instead. I updated the prerequisites and troubleshooting commands to check NFSv4.1 client support and mounted NFS details.
- The verification commands omitted the `my-app` namespace for `kubectl exec`, which would fail unless the current context namespace was already set to `my-app`. I added the namespace flags and adjusted the verification text so the commands match what they actually verify.
- The original prerequisites omitted Longhorn's documented requirement that node hostnames be unique in the cluster. I added that requirement and also made the workload namespace assumption explicit.

## Review Notes
- Native Longhorn RWX support is documented as available since Longhorn v1.1.0, which matches the post's version floor.
- Current Longhorn 1.11.1 installation docs require Kubernetes `>= v1.25`. This post is specifically about RWX configuration rather than Longhorn installation, but readers using current Longhorn releases should still ensure their cluster meets that requirement.
