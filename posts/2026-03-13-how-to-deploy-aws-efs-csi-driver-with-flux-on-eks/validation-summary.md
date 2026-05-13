# Validation Summary: How to Deploy AWS EFS CSI Driver with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- Amazon EFS
- AWS EFS CSI Driver
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, Deployments, and ServiceAccounts
- Flux Kustomization and HelmRelease
- Helm
- AWS IAM roles for service accounts
- AWS CLI

## Sources Consulted
- AWS EKS documentation: Use elastic file system storage with Amazon EFS: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- AWS Managed Policy Reference: AmazonEFSCSIDriverPolicy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEFSCSIDriverPolicy.html
- AWS EFS CSI Driver upstream repository and installation documentation: https://github.com/kubernetes-sigs/aws-efs-csi-driver
- AWS EFS CSI Driver Helm chart values: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/charts/aws-efs-csi-driver/values.yaml
- AWS EFS CSI Driver storage class parameters: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/parameters.md
- AWS EFS CSI Driver file system creation guide: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/efs-create-filesystem.md
- AWS EFS CSI Driver Helm chart repository index: https://kubernetes-sigs.github.io/aws-efs-csi-driver/index.yaml
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The introductory EBS comparison said EBS block storage is limited to a single pod. Changed this to say EBS is typically attached to a single node, which is the more accurate Kubernetes storage distinction compared with EFS ReadWriteMany semantics.
- The custom IAM policy used tag conditions that did not match AWS's managed AmazonEFSCSIDriverPolicy and could deny access point tag-on-create authorization. Updated the CreateAccessPoint, TagResource, and DeleteAccessPoint conditions to match the AWS managed policy pattern.
- The IRSA trust policy used an exact `efs-csi-controller-sa` subject. Updated it to the current AWS EKS documented `efs-csi-*` wildcard with `StringLike`.
- The HelmRelease pinned the older `2.5.x` chart line. Updated it to the current `4.2.x` chart line from the upstream Helm repository.
- The Helm values used `node.tolerateAllTaints`, which is not a current chart value. Replaced it with `node.tolerations` using `operator: Exists`.
- The Flux Kustomization set `wait: true` while also defining `healthChecks`; Flux ignores explicit health checks when `wait` is true. Changed `wait` to `false` so the listed Deployment and DaemonSet health checks are used.

## Review Notes
- The AWS EKS documentation now recommends EKS Pod Identities for new installs, while the post uses IAM roles for service accounts. IRSA remains documented and valid.
- The AWS EFS CSI driver also supports Amazon S3 Files starting in v3.0.0, but this post is scoped to EFS only.
