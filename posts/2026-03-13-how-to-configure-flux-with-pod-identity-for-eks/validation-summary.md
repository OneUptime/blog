# Validation Summary: How to Configure Flux with Pod Identity for EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- EKS Pod Identity
- AWS IAM and STS
- AWS CLI
- Flux controllers and Flux custom resources
- Kubernetes service accounts and deployments
- Terraform AWS provider
- SOPS with AWS KMS

## Sources Consulted
- Amazon EKS User Guide: Learn how EKS Pod Identity grants pods access to AWS services - https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
- Amazon EKS User Guide: Set up the Amazon EKS Pod Identity Agent - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-agent-setup.html
- Amazon EKS User Guide: Assign an IAM role to a Kubernetes service account - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-association.html
- Amazon EKS User Guide: Create IAM role with trust policy required by EKS Pod Identity - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-role.html
- AWS CLI Command Reference: create-pod-identity-association - https://docs.aws.amazon.com/cli/latest/reference/eks/create-pod-identity-association.html
- AWS Containers Blog: Amazon EKS Pod Identity streamlines cross account access - https://aws.amazon.com/blogs/containers/amazon-eks-pod-identity-streamlines-cross-account-access/
- Flux documentation: Amazon Web Services integration - https://fluxcd.io/flux/integrations/aws/
- Flux documentation: ImageRepository - https://fluxcd.io/flux/components/image/imagerepositories/
- Flux documentation: Bucket sources - https://fluxcd.io/flux/components/source/buckets/
- Flux documentation: Kustomization and SOPS decryption - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Terraform AWS provider: aws_eks_pod_identity_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_pod_identity_association
- AWS CloudFormation Template Reference: AWS::EKS::PodIdentityAssociation - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eks-podidentityassociation.html

## Issues Found
- The prerequisite claimed Kubernetes 1.24 or later was sufficient. AWS documents EKS Pod Identity support in terms of supported EKS cluster/platform versions and eligible Linux EC2 worker nodes, so the prerequisite was corrected.
- The Pod Identity Agent install command pinned a specific add-on version. This can become stale and is not necessary for the basic CLI command, so the version pin was removed.
- The ECR role was incorrectly attached to `source-controller`, but Flux `ImageRepository` resources are reconciled by `image-reflector-controller`. The post now creates, attaches, associates, restarts, verifies, and logs the `image-reflector-controller` separately for ECR access.
- The Terraform example omitted the Pod Identity association for `image-reflector-controller`. It now includes that association.
- The cross-account example was incomplete for current EKS Pod Identity role chaining. It now grants the source Pod Identity role permission to assume the target role and uses `--target-role-arn` on `aws eks create-pod-identity-association`.
- The cross-account target role trust policy referenced the wrong Flux controller role for the ECR example and did not include `sts:TagSession`. It now trusts `flux-image-reflector-controller-role` and permits both `sts:AssumeRole` and `sts:TagSession`.
- The verification text said only `source-controller` access was being checked while the example also checks image repository reconciliation. The wording was corrected.

## Review Notes
The custom IAM policies named `FluxECRReadOnly`, `FluxS3ReadOnly`, and `FluxKMSDecrypt` are placeholders and must exist before running the commands. For KMS-backed SOPS decryption, ensure the policy includes the relevant KMS permissions, commonly `kms:Decrypt` and `kms:DescribeKey`, and that the KMS key policy permits the role.
