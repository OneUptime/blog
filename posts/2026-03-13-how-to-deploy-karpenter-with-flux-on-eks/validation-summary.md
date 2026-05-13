# Validation Summary: How to Deploy Karpenter with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Karpenter
- Amazon EKS
- Kubernetes
- Flux
- Helm
- AWS IAM
- AWS CLI
- eksctl

## Sources Consulted
- Karpenter v1.12 Getting Started with Karpenter: https://karpenter.sh/v1.12/getting-started/getting-started-with-karpenter/
- Karpenter v1.12 Compatibility: https://karpenter.sh/v1.12/upgrading/compatibility/
- Karpenter v1.12 Settings reference: https://karpenter.sh/v1.12/reference/settings/
- Karpenter v1.12 NodePools documentation: https://karpenter.sh/v1.12/concepts/nodepools/
- Karpenter v1.12 NodeClasses documentation: https://karpenter.sh/v1.12/concepts/nodeclasses/
- Karpenter CloudFormation permissions reference: https://karpenter.sh/docs/reference/cloudformation/
- Karpenter Helm chart values for v1.12.1: https://raw.githubusercontent.com/aws/karpenter-provider-aws/v1.12.1/charts/karpenter/values.yaml
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Amazon EKS Karpenter best practices: https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html

## Issues Found
- The post pinned Karpenter 0.37.0 while using stable `karpenter.sh/v1` and `karpenter.k8s.aws/v1` resources. Updated the tutorial to Karpenter 1.12.1 and the Flux HelmRelease semver range to `1.12.*`.
- The prerequisite EKS version was listed as 1.25 or later, which does not match the current Karpenter v1.12 compatibility matrix. Updated it to 1.29 or later.
- The HelmRelease used top-level `resources`, but the current Karpenter chart expects controller container resources under `controller.resources`. Moved the resource settings under `controller.resources`.
- The HelmRelease configured `settings.interruptionQueue` without creating the required SQS queue and EventBridge rules. Removed the setting so interruption handling remains disabled unless separately provisioned.
- The controller IAM policy omitted current discovery and instance profile read permissions used by Karpenter. Added missing EC2 describe actions, `ec2:DeleteLaunchTemplate`, `iam:GetInstanceProfile`, `iam:ListInstanceProfiles`, and `eks:DescribeCluster`.
- The post allowed spot capacity in the NodePool but did not mention the EC2 Spot service-linked role. Added the AWS CLI command to create it if it does not already exist.
- The EC2NodeClass used `spec.role` while the guide manually created an instance profile. Changed it to `spec.instanceProfile` so the configuration consistently uses the pre-created instance profile.

## Review Notes
The IAM policy in the post is intentionally simplified and broad compared with Karpenter's official scoped CloudFormation policies. For production use, prefer the official scoped policies or equivalent least-privilege IAM conditions.
