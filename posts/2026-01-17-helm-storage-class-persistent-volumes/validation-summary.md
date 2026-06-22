# Validation Summary: Deploying Storage Classes and Persistent Volumes with Helm

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Helm
- Kubernetes StorageClass, PersistentVolume, PersistentVolumeClaim, and VolumeSnapshot APIs
- CSI drivers
- AWS EBS CSI Driver
- AWS EFS CSI Driver
- Kubernetes CSI NFS Driver
- Longhorn
- Rook-Ceph
- Prometheus / kube-state-metrics

## Sources Consulted
- Helm chart values for AWS EBS CSI Driver: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/charts/aws-ebs-csi-driver/values.yaml
- AWS EBS CSI Driver storage class parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS AmazonEBSCSIDriverPolicyV2 managed policy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEBSCSIDriverPolicyV2.html
- Helm chart values for AWS EFS CSI Driver: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/charts/aws-efs-csi-driver/values.yaml
- AWS EFS CSI Driver IAM policy example: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/iam-policy-example.json
- Helm chart values for Kubernetes CSI NFS Driver: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/charts/v4.12.0/csi-driver-nfs/values.yaml
- Longhorn Helm chart values and StorageClass example: https://github.com/longhorn/charts/blob/master/charts/longhorn/values.yaml and https://github.com/longhorn/longhorn/blob/v1.10.0/examples/storageclass.yaml
- Rook-Ceph Helm chart values and CR examples: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml, https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml, https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml, and https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/storageclass.yaml
- Rook CephCluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph releases page: https://docs.ceph.com/en/latest/releases/
- Kubernetes CSI external-snapshotter manifests: https://github.com/kubernetes-csi/external-snapshotter/tree/master/deploy/kubernetes/snapshot-controller
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- The EBS IAM policy example was an older custom policy and did not include current snapshot-restore permissions required after AWS changed CreateVolume authorization for restoring from snapshots. Replaced it with attachment of the current AWS managed `AmazonEBSCSIDriverPolicyV2`.
- The NFS CSI Helm values placed `server` and `share` directly under `storageClass`; the official chart expects them under `storageClass.parameters`. Moved those keys and updated controller/node resource settings to the chart's per-container resource structure.
- The Rook-Ceph operator values used obsolete CSI keys (`enableRbdDriver`, `enableCephfsDriver`, `enableGrpcMetrics`, and `csiRBDProvisionerResource`) that are not present in the current chart. Replaced them with current `csi.installCsiOperator` and `csi.serviceMonitor.enabled` settings.
- The Ceph cluster example pinned `quay.io/ceph/ceph:v18.2.0`, while Reef has reached end of life as of 2026. Updated the example to the current active Ceph Tentacle release image `v20.2.2`.
- The Rook-Ceph StorageClass examples referenced pools/filesystems that were not created in the post. Added the required `CephBlockPool` and `CephFilesystem` resources and aligned the CephFS `fsName` and `pool` values with Rook's current examples.
- The Helm StorageClass template used `default true` for `allowVolumeExpansion`, which would override an explicit `false` value. Replaced it with a `hasKey` check and also avoided rendering an empty `annotations:` field.
- The snapshot controller section showed a Helm values file but no official install command. Replaced it with the official external-snapshotter CRD, RBAC, and controller manifests.
- The Prometheus alert used non-standard `csi_plugin_count`. Replaced it with a kube-state-metrics deployment availability alert for the EBS CSI controller.
- The troubleshooting section referenced `deployment/csi-controller`, which is not the AWS EBS CSI Helm deployment name. Updated it to `deployment/ebs-csi-controller`.

## Review Notes
The examples are now aligned with current official chart values and Kubernetes APIs. Some snippets still assume provider-specific prerequisites exist, such as EKS IRSA roles, EFS IAM permissions, Prometheus Operator CRDs, and Rook cluster sizing requirements.
