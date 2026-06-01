# Validation Summary: How to Use Karpenter for EKS Node Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes
- Karpenter
- Helm
- eksctl
- AWS IAM and IRSA
- Amazon EC2 Spot and interruption handling

## Sources Consulted
- Karpenter Getting Started with Karpenter: https://karpenter.sh/docs/getting-started/getting-started-with-karpenter/
- Karpenter Compatibility Matrix: https://karpenter.sh/docs/upgrading/compatibility/
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter EC2NodeClasses documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- Karpenter Disruption documentation: https://karpenter.sh/docs/concepts/disruption/
- Amazon EKS Karpenter best practices: https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html
- eksctl IAM service accounts documentation: https://eksctl.io/usage/iamserviceaccounts/

## Issues Found
- The post used Karpenter 0.35.0 and v1beta1 NodePool / EC2NodeClass manifests. Updated the guide to Karpenter 1.12.1 and current v1 APIs because current Karpenter documentation serves NodePool and EC2NodeClass as v1.
- The prerequisite said Kubernetes 1.25 or later. Updated it to say the EKS cluster must run a Kubernetes version supported by the chosen Karpenter release; Karpenter 1.12 supports Kubernetes 1.29 and later.
- The IAM setup referenced a single `KarpenterControllerPolicy-${CLUSTER_NAME}` policy that was never created and does not match the current official install flow. Replaced it with the official CloudFormation-backed setup and current controller policy attachments.
- The Helm install was missing `--create-namespace` and the service account role annotation needed when the IRSA role is created separately with `--role-only`. Added both.
- The NodePool example used deprecated v1beta1 fields and `WhenUnderutilized`, which is not the current v1 consolidation policy name. Updated it to `karpenter.sh/v1`, `nodeClassRef.group`, `WhenEmptyOrUnderutilized`, and `consolidateAfter`.
- The NodePool example placed `expireAfter` under `spec.disruption`. Moved it under `spec.template.spec`, where current Karpenter documentation defines it.
- The EC2NodeClass example used `karpenter.k8s.aws/v1beta1`, Amazon Linux 2 defaults, and a hard-coded node role name. Updated it to `karpenter.k8s.aws/v1`, Amazon Linux 2023 AMI alias selection, and variables rendered with `envsubst`.
- The subnet and security group tagging commands hard-coded `my-cluster`. Updated them to use `${CLUSTER_NAME}` consistently.

## Review Notes
The post is now aligned with Karpenter v1.12 documentation as of 2026-06-01. For production use, the AMI alias should remain pinned to a tested AL2023 version instead of using `@latest`; the updated guide derives a versioned alias from the EKS optimized AMI name.
