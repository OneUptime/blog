# Validation Summary: How to Set Up EFS CSI Driver for EKS Shared Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon EFS
- Amazon EFS CSI Driver
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- AWS CLI
- eksctl
- Helm
- AWS IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Amazon EKS documentation: Use elastic file system storage with Amazon EFS - https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- Amazon EKS documentation: Understand the Kubernetes version lifecycle on EKS - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EFS documentation: Managing mount targets - https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html
- Amazon EFS documentation: Managing automatic backups of EFS file systems - https://docs.aws.amazon.com/efs/latest/ug/automatic-backups.html
- Amazon EFS CSI Driver GitHub repository and Helm chart templates - https://github.com/kubernetes-sigs/aws-efs-csi-driver
- Amazon EFS CSI Driver dynamic and static provisioning examples - https://github.com/kubernetes-sigs/aws-efs-csi-driver/tree/master/examples/kubernetes

## Issues Found
- The prerequisite listed "Kubernetes 1.23 or later." Amazon EKS no longer supports Kubernetes 1.23 as of the validation date, so this was changed to "A supported EKS cluster version."
- The EFS filesystem creation flow created mount targets immediately after creating the file system. EFS mount targets should be created after the file system reaches the `available` lifecycle state, so a wait loop was added.
- The mount target loop used every EKS cluster subnet. EFS permits only one mount target per Availability Zone for Regional file systems, so the command was changed to select one subnet per Availability Zone before creating mount targets.
- The benefits list said "Automatic backups" without noting that backups must be enabled when not using the console defaults. This was changed to "Optional automatic backups."
- The Helm verification text said to expect "a controller pod." The current Helm chart defaults to multiple controller replicas, so the wording was changed to "controller pods."

## Review Notes
The Kubernetes manifests, StorageClass parameters for EFS access point dynamic provisioning, PVC access mode, static provisioning `volumeHandle` example, Helm install command, AWS managed IAM policy ARN, and troubleshooting commands are consistent with the current official documentation and upstream EFS CSI driver chart. The post could optionally mention that dynamic provisioning is not supported for Fargate nodes, but this is a caveat rather than an error in the current EC2-node oriented walkthrough.
