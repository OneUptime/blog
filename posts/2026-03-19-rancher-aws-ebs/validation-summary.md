# Validation Summary: How to Configure AWS EBS Storage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Amazon EBS
- AWS EBS CSI driver
- Helm
- Kubernetes `StorageClass`, `PersistentVolumeClaim`, `StatefulSet`, and `VolumeSnapshot`
- AWS IAM
- AWS KMS

## Sources Consulted
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- AWS EBS CSI Driver installation guide: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/install.md
- AWS EBS CSI Driver `StorageClass` parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS managed policy reference for `AmazonEBSCSIDriverPolicy`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEBSCSIDriverPolicy.html
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- AWS EBS CSI Helm chart controller template: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/charts/aws-ebs-csi-driver/templates/controller.yaml

## Issues Found
- The introduction said Rancher supports both the in-tree EBS driver and the EBS CSI driver and implied both were current setup paths. Kubernetes has deprecated and removed the in-tree `awsElasticBlockStore` driver for new use, so I changed the post to recommend the EBS CSI driver for new storage classes and describe the in-tree path only as a migration case.
- The prerequisites were too broad for current EBS CSI behavior. I updated them to require Linux worker nodes on EC2, which matches the current driver limitations documented by AWS.
- The IAM section mixed node-role guidance with an EKS IRSA-style install command. I rewrote the text so EKS uses the service account role and self-managed EC2 clusters use the instance profile, then expanded the example permissions to cover current driver operations such as volume modification and the related describe calls.
- The post enabled `allowVolumeExpansion` but the sample IAM policy did not include the permissions needed for expansion. I added `ec2:ModifyVolume` and `ec2:DescribeVolumesModifications`, along with the other current describe actions used by the driver.
- The encrypted volume section used a customer-managed KMS key without mentioning the required KMS permissions. I added the required `kms:Decrypt`, `kms:GenerateDataKeyWithoutPlaintext`, and `kms:CreateGrant` note.
- The Helm install example used an EKS-specific IRSA annotation as if it were required for every cluster. I changed the main command to the generic supported Helm install and moved the IRSA annotation to an EKS-only note.
- The `StorageClass` examples used `fsType`, but the current AWS EBS CSI driver documents `csi.storage.k8s.io/fstype` as the supported parameter key. I updated all affected storage classes to use the CSI parameter.
- The standalone PVC example used a `WaitForFirstConsumer` storage class without explaining that the claim would remain `Pending` until a pod consumed it. I added that clarification.
- The StatefulSet example omitted the required headless Service referenced by `serviceName`, and the step did not include the apply command that later steps depended on. I added the Service manifest, the `kubectl apply` command, and a readiness note so the example is runnable as written.
- The snapshot example targeted `ebs-claim`, which would not be bound in the documented flow because no pod consumes it. I changed the snapshot source to the bound PVC created by the StatefulSet, added a note to wait for that PVC to bind, and adjusted the restore PVC size to match that snapshot source.
- The snapshot section did not mention that snapshot CRDs and the snapshot controller must already be installed. I added that prerequisite because the EBS CSI Helm chart no longer installs those components.
- The monitoring command used `kubectl logs` with a label selector that would not reliably target the multi-container controller deployment. I changed it to log from `deployment/ebs-csi-controller` and specify the `ebs-plugin` container explicitly.

## Review Notes
- AWS recommends the managed EKS add-on on EKS clusters, but the Helm-based installation path used in the post remains supported for self-managed deployments and fits the Rancher-focused workflow.
- `allowedTopologies` is still valid, but with `WaitForFirstConsumer` it is usually only needed when you intentionally want to restrict provisioning to a subset of Availability Zones.
- No live cluster execution was performed in this environment; the review was documentation-based and focused on API, manifest, and command correctness.
