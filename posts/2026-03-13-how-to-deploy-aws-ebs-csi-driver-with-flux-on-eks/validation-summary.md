# Validation Summary: How to Deploy AWS EBS CSI Driver with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS EBS CSI Driver
- IAM Roles for Service Accounts (IRSA)
- AWS IAM
- Kubernetes StorageClass, PersistentVolumeClaim, VolumeSnapshot, and VolumeSnapshotClass
- Flux Kustomization, HelmRepository, and HelmRelease
- Helm

## Sources Consulted
- Amazon EKS User Guide: Use Kubernetes volume storage with Amazon EBS: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- AWS EBS CSI Driver installation documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/install.md
- AWS EBS CSI Driver Helm chart values and templates: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/charts/aws-ebs-csi-driver
- AWS EBS CSI Driver Chart.yaml: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/charts/aws-ebs-csi-driver/Chart.yaml
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/

## Issues Found
- The post used an outdated custom IAM policy example and attached it as an account-local policy. AWS now documents the managed `AmazonEBSCSIDriverPolicyV2` policy for the EBS CSI driver. I changed the IAM section to use `arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicyV2` and noted that customer-managed KMS keys need an additional key-scoped KMS policy.
- The post described snapshot support without listing the CSI snapshot CRDs and snapshot controller as prerequisites. AWS and Kubernetes documentation state these are required for VolumeSnapshot functionality. I added the prerequisite.
- The HelmRelease pinned chart version `2.28.x`, which is outside the current AWS EBS CSI driver support window. I updated it to `2.59.x`, matching the current chart line published with driver `v1.59.0`.
- The Flux Kustomization example set `wait: true` while also defining explicit `healthChecks`. Flux documents that `spec.healthChecks` is ignored when `spec.wait` is true. I removed `wait: true` so the listed Deployment and DaemonSet health checks are honored.

## Review Notes
The remaining Kubernetes manifests and Flux resources use current API versions and valid fields. The snapshot examples assume the snapshot CRDs/controller are installed before the EBS CSI driver, which is now stated in the prerequisites.
