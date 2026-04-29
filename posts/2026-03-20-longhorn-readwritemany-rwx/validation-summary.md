# Validation Summary: How to Set Up Longhorn ReadWriteMany (RWX) Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Longhorn
- Kubernetes
- PersistentVolumeClaim (PVC)
- StorageClass
- NFSv4 / ReadWriteMany (RWX)
- `kubectl`

## Sources Consulted
- Longhorn RWX volumes documentation: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn StorageClass parameters reference: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The StorageClass used `accessModeConversion: "false"`, which is not a documented Longhorn StorageClass parameter for generic RWX volumes. It was replaced with `migratable: "false"` to match Longhorn's documented RWX requirement for non-migratable shared filesystem volumes.
- The original Step 1 implied that share-manager pods should exist before any RWX workload is running. Longhorn only creates share-manager pods for RWX volumes that are actively in use, so the step was corrected to describe prerequisites accurately and to use the fully qualified `settings.longhorn.io` resource.
- The architecture description said Longhorn simply exposes the volume as NFS, but Longhorn also creates a corresponding Service for each RWX volume. The wording was updated to reflect the documented Service-backed NFS endpoint.
- The cross-node verification example assumed Deployment replicas would automatically land on different nodes. The commands were corrected to instruct readers to first identify pods on different nodes, because default scheduling does not guarantee that spread.
- The troubleshooting section told readers to look for a share-manager pod when a PVC is still `Pending`. That was inaccurate because the share-manager pod is created only after the RWX volume is attached for use. The guidance was updated to check PVC events and StorageClass configuration first.
- The share-manager log command relied on a specific label selector that was not documented in the Longhorn user docs consulted. It was replaced with a command based on the documented `share-manager-<volume-name>` pod naming pattern.
- The network troubleshooting and best-practices text referred only to the share-manager pod. Longhorn documents a corresponding Service for each RWX volume, so those references were updated to mention the share-manager Service or pod endpoint.

## Review Notes
- The post uses `nginx:1.24` for the sample workload. This is sufficient for demonstrating RWX mounts, but it is not material to the Longhorn setup itself.
- `reclaimPolicy: Retain` and `volumeBindingMode: Immediate` are valid Kubernetes StorageClass fields; they are configuration choices rather than Longhorn RWX requirements.
