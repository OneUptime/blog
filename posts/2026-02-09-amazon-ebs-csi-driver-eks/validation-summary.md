# Validation Summary: How to Configure Amazon EBS CSI Driver for EKS Persistent Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon EBS CSI Driver
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes VolumeSnapshots
- AWS IAM Roles for Service Accounts (IRSA)
- eksctl, AWS CLI, Helm, kubectl

## Sources Consulted
- Amazon EKS: Use Kubernetes volume storage with Amazon EBS - https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EKS: Create a storage class - https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Amazon EKS: Enable snapshot functionality for CSI volumes - https://docs.aws.amazon.com/eks/latest/userguide/csi-snapshot-controller.html
- Amazon EKS: AWS add-ons - https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
- AWS Containers Blog: Amazon EKS now supports Kubernetes 1.23 - https://aws.amazon.com/blogs/containers/amazon-eks-now-supports-kubernetes-1-23/
- Kubernetes: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes: Volume Snapshots - https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes API Reference: StatefulSet - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes CSI Developer Documentation: Snapshot Controller - https://kubernetes-csi.github.io/docs/snapshot-controller.html

## Issues Found
- The opening statement said EKS no longer includes the in-tree EBS plugin as of Kubernetes 1.23. Updated it to the more accurate CSI migration behavior for EKS 1.23 and later.
- The IAM setup used a custom inline policy and an unused OIDC variable. Replaced it with the current AWS managed `AmazonEBSCSIDriverPolicyV2` guidance and added the OIDC association command.
- Bare `ACCOUNT_ID` placeholders in executable commands were replaced with an `ACCOUNT_ID` variable populated from AWS STS.
- The EKS add-on IAM role example created a service account instead of only the role needed by the managed add-on. Added `--role-only`.
- The Helm install example referenced a pre-created service account without ensuring it was annotated for IRSA. Updated the Helm values to create the service account with the EKS role annotation.
- StorageClass examples used `fsType`; current EBS CSI documentation uses `csi.storage.k8s.io/fstype`. Updated all StorageClass snippets.
- The PostgreSQL section created a standalone PVC but the StatefulSet used `volumeClaimTemplates`, producing a different PVC name. Updated the StatefulSet to mount the named PVC and added the missing headless Service manifest.
- The apply commands omitted the PVC manifest. Added `kubectl apply -f postgres-pvc.yaml`.
- The manual filesystem expansion example used `resize2fs` against a device path from inside the container, which is not a reliable or generally correct Kubernetes/EBS CSI procedure. Replaced it with PVC and pod event inspection.
- Snapshot installation used manifests from the upstream `master` branch. Replaced this with the Amazon EKS managed `snapshot-controller` add-on, which includes the required CRDs.
- The restored PostgreSQL pod omitted required PostgreSQL environment variables. Added `POSTGRES_PASSWORD` and `PGDATA`.
- The KMS encryption example did not mention required KMS permissions for customer managed keys. Added a note that the EBS CSI driver IAM role needs the required KMS permissions.

## Review Notes
The tutorial is technically relevant and now aligns with current EKS managed add-on guidance. Future improvements could mention EKS Pod Identity, which AWS now suggests, but IRSA remains a supported configuration path.
