# Validation Summary: How to Migrate Kubernetes Storage from In-Tree Plugins to CSI Drivers

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, and StatefulSets
- Kubernetes CSI migration
- Kubernetes VolumeSnapshot API
- AWS EBS CSI driver
- GCP Persistent Disk CSI driver
- Azure Disk CSI driver
- PrometheusRule monitoring
- kubectl, jq, Helm, and AWS CLI

## Sources Consulted
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Feature Gates documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes Removed Feature Gates documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StatefulSet concepts documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EKS StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS managed policy reference for AmazonEBSCSIDriverPolicyV2: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEBSCSIDriverPolicyV2.html
- AWS EBS CSI driver Helm chart values: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/charts/aws-ebs-csi-driver/values.yaml

## Issues Found
- The introduction said Kubernetes is still only deprecating in-tree plugins. Updated it to reflect that several provider-specific in-tree plugins have already been removed from current Kubernetes releases.
- The audit command checked vSphere PVs but omitted the vSphere in-tree provisioner from the StorageClass audit. Added `kubernetes.io/vsphere-volume`.
- The AWS EBS CSI install example created an incomplete custom IAM policy and used Helm values that are no longer present in the current chart. Replaced it with attachment of the AWS managed EBS CSI policy and current service account values.
- The CSIMigration section instructed users to add feature gates that are stable, GA, or removed in current Kubernetes releases, and the kubeadm ConfigMap example placed kubelet options in an invalid location. Replaced that with prerequisite checks and current CSIMigration guidance.
- The snapshot wait commands used `condition=readytouse`, and the PVC wait commands used `condition=bound`. Replaced them with `jsonpath` waits for `.status.readyToUse` and `.status.phase`.
- The data-copy section implied every snapshot is automatically application-consistent. Added a note to quiesce or stop writers when application consistency matters.
- The StatefulSet examples omitted required pod template labels matching `.spec.selector`. Added matching labels.
- The StatefulSet rolling migration script used an undefined `PVC_NAME` variable and scaled in a way that would delete the wrong pods. Added `CLAIM_TEMPLATE`, used the StatefulSet PVC naming convention, and changed the loop to migrate from the highest ordinal downward.
- The cleanup section treated legacy in-tree PV fields as evidence that CSIMigration failed. Clarified that this check only applies to manual data-copy migrations and added vSphere to the check.
- The Prometheus `CSIDriverPodDown` rule matched non-running phase series in a way that could alert incorrectly. Restricted it to the `Running` phase and grouped by pod.
- The conclusion still referenced enabling CSIMigration feature gates and unqualified cleanup. Updated it to match the corrected migration guidance.

## Review Notes
The guide is now technically valid as a general migration tutorial. Provider-specific production migrations still require environment-specific checks, especially IAM role binding for the AWS EBS CSI driver, VolumeSnapshotClass availability, snapshot controller installation, storage driver snapshot support, and application-specific quiescing procedures.
