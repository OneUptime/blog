# Validation Summary: How to Deploy AWS Resources with ACK and Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Controllers for Kubernetes (ACK)
- Flux CD GitRepository, HelmRepository, HelmRelease, Kustomization, and Alert resources
- Amazon S3, Amazon RDS, and Amazon EC2/VPC ACK custom resources
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- AWS IAM and AWS CLI
- Kubernetes custom resources and service accounts

## Sources Consulted
- ACK controller installation documentation: https://aws-controllers-k8s.github.io/community/docs/user-docs/install/
- ACK Helm chart values reference: https://aws-controllers-k8s.github.io/docs/guides/helm-values/
- ACK S3 Bucket API reference: https://aws-controllers-k8s.github.io/community/reference/s3/v1alpha1/bucket/
- ACK RDS DBInstance API reference: https://aws-controllers-k8s.github.io/community/reference/rds/v1alpha1/dbinstance/
- ACK EC2 VPC API reference: https://aws-controllers-k8s.github.io/community/reference/ec2/v1alpha1/vpc/
- ACK EC2 VPC tutorial and resource reference examples: https://aws-controllers-k8s.github.io/community/docs/tutorials/ec2-example/
- ACK resource conditions documentation: https://aws-controllers-k8s.github.io/community/docs/user-docs/resource-crud/
- ACK IAM permissions documentation: https://aws-controllers-k8s.github.io/docs/guides/configure-iam
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization API and health check documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/

## Issues Found
- The ACK Helm repository URL pointed to `https://aws-controllers-k8s.github.io/community/helm`, which returned 404 and is not the current documented chart source. Updated the Flux `HelmRepository` to use `type: oci` and `oci://public.ecr.aws/aws-controllers-k8s`.
- The ACK controller examples created `HelmRelease` resources in `ack-system` without creating the namespace. Added an `ack-system` Namespace manifest before the controller releases.
- The S3 Bucket `publicAccessBlock` fields used incorrect capitalization (`blockPublicAcls`, `ignorePublicAcls`). Updated them to the ACK API field names `blockPublicACLs` and `ignorePublicACLs`.
- The EC2 VPC example used `cidrBlock`, but ACK VPC requires `cidrBlocks` as an array. Updated the VPC manifest accordingly.
- The subnet example referenced a hard-coded `vpcID` while creating a VPC in the same workflow. Updated it to use ACK's `vpcRef` so the manifest works declaratively in GitOps.
- The RDS password secret reference omitted the namespace. Added `namespace: default` to match ACK's documented `masterUserPassword` reference shape and the example resource namespace.
- The Flux Kustomization set `wait: true` and `healthChecks` together, but Flux ignores `healthChecks` when `wait` is true. Removed `wait` and added `healthCheckExprs` using ACK's `ACK.ResourceSynced` and `ACK.Terminal` conditions.
- The Kustomization depended on a non-existent `ack-controllers` Kustomization. Removed the invalid dependency from the snippet and clarified that Flux dependencies apply between separate Kustomization resources.
- The IRSA section said to create an IAM trust policy but showed a Kubernetes ServiceAccount. Reworded it to describe creating or configuring the service account.
- The hand-written S3 IAM policy was likely incomplete for ACK reconciliation and KMS-backed bucket encryption. Replaced it with the ACK-documented pattern of attaching the service controller's recommended policy ARN.
- The Flux Alert used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation lists Alert under `notification.toolkit.fluxcd.io/v1beta3`. Updated the Alert apiVersion.

## Review Notes
- The ACK controller chart version ranges are examples and should be checked against the selected controller release cadence before production use.
- The recommended ACK IAM policies are broad by design; production deployments should scope them down after confirming the exact resources and AWS APIs the controller needs.
