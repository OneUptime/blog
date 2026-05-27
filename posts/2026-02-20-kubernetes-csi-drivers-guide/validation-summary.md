# Validation Summary: Understanding Kubernetes CSI Drivers and How to Choose One

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Container Storage Interface (CSI)
- Kubernetes StorageClass, CSIDriver, CSINode, and VolumeAttachment resources
- Kubernetes CSI sidecars: external-provisioner, external-attacher, external-snapshotter, external-resizer, and node-driver-registrar
- AWS EBS CSI Driver
- Compute Engine persistent disk CSI Driver for GKE
- Longhorn CSI Driver
- Rook-Ceph / Ceph CSI RBD Driver
- Helm and kubectl
- OneUptime Kubernetes monitoring

## Sources Consulted
- Kubernetes CSI sidecar containers: https://kubernetes-csi.github.io/docs/sidecar-containers.html
- Kubernetes CSI external-provisioner: https://kubernetes-csi.github.io/docs/external-provisioner.html
- Kubernetes CSI external-attacher: https://kubernetes-csi.github.io/docs/external-attacher.html
- Kubernetes CSI node-driver-registrar: https://kubernetes-csi.github.io/docs/node-driver-registrar.html
- Kubernetes volumes / CSI documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Storage API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- AWS EBS CSI Driver installation documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/install.md
- AWS EBS CSI Driver StorageClass parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS EBS CSI Driver Helm chart values: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/charts/aws-ebs-csi-driver/values.yaml
- Google Cloud Compute Engine persistent disk CSI Driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Longhorn StorageClass parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Rook-Ceph CSI driver documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook-Ceph RBD StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- OneUptime Kubernetes agent documentation: https://oneuptime.com/docs/en/monitor/kubernetes-agent

## Issues Found
- The CSI architecture diagram showed the Kubernetes API server calling `CreateVolume` directly. Updated the diagram so the external provisioner watches PVCs through the API server and calls `CreateVolume`, and the API server is shown as the source of `VolumeAttachment` objects for the external attacher workflow.
- The Longhorn StorageClass comment described `staleReplicaTimeout` as striped storage. Changed the comment to explain that the configured value removes stale replicas after 48 hours.
- The Rook-Ceph RBD StorageClass omitted controller publish, controller expansion, and filesystem parameters used by current Rook examples when attach and expansion secrets are required. Added the matching `controller-expand`, `controller-publish`, and `csi.storage.k8s.io/fstype` parameters.
- The installation section said most CSI drivers are installed via Helm. Changed this to "many" because CSI drivers are also commonly distributed as managed add-ons, operators, or raw manifests.
- The decision matrix described Longhorn/Ceph replication as application-managed. Changed it to storage-system-managed because replication is handled by the storage system rather than by the workload application.

## Review Notes
- The AWS EBS CSI Helm command uses a current chart value path for IRSA annotations, but AWS currently recommends EKS Pod Identity for EKS where available.
- Local `helm`, `kubectl`, and `ruby` binaries were not installed in the review environment, so command validation was performed against official documentation instead of local CLI help output.
