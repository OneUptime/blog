# Validation Summary: How to Set Up Flux CD on Amazon EKS with Karpenter

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Amazon EKS
- Karpenter NodePool and EC2NodeClass APIs
- AWS IAM roles, policies, and IRSA
- Amazon SQS and Amazon EventBridge interruption handling
- Kubernetes manifests and kubectl workflows

## Sources Consulted
- Karpenter v1.0 NodeClasses documentation: https://karpenter.sh/v1.0/concepts/nodeclasses/
- Karpenter v1.0 NodePools documentation: https://karpenter.sh/v1.0/concepts/nodepools/
- Karpenter v1.0 CloudFormation/IAM and interruption queue reference: https://karpenter.sh/docs/reference/cloudformation/
- Karpenter v1.0 compatibility matrix: https://karpenter.sh/v1.0/upgrading/compatibility/
- Karpenter metrics reference: https://karpenter.sh/v1.0/reference/metrics/
- Karpenter AMI management guidance: https://karpenter.sh/docs/tasks/managing-amis/
- Flux HelmRelease guide and API reference: https://fluxcd.io/flux/guides/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository source documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Amazon EKS access entries documentation: https://docs.aws.amazon.com/eks/latest/userguide/creating-access-entries.html
- AWS CLI SQS set-queue-attributes reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/set-queue-attributes.html

## Issues Found
- The prerequisites said Kubernetes 1.27 or later without bounding that statement to the selected Karpenter release. Updated it to reference the Karpenter compatibility matrix and the supported Kubernetes range for Karpenter 1.0.x.
- The controller IAM policy was shown as JSON but the following command referenced `karpenter-controller-policy.json`. Wrapped the policy in a `cat > karpenter-controller-policy.json` heredoc so the command sequence is executable.
- The node role was created but not authorized to join the EKS cluster. Added an EKS access entry for the Karpenter node role and updated troubleshooting to mention access entries as well as `aws-auth` for older clusters.
- The EC2NodeClass used `role` while the guide explicitly created a pre-provisioned instance profile. Changed the EC2NodeClass to use `instanceProfile` and added `iam:GetInstanceProfile` permission for that profile.
- The SQS interruption handling step created only the queue. Added queue policy creation plus EventBridge rules and targets for AWS Health events, Spot interruption warnings, rebalance recommendations, and EC2 instance state-change notifications.
- The Helm values put resource requests and limits at top-level `resources`, but the Karpenter chart expects them under `controller.resources`. Moved the values to the correct path.
- The Karpenter metric names for created nodes, terminated nodes, and disrupted node claims were missing the `_total` suffix. Updated them to current metric names.

## Review Notes
- The post uses `al2023@latest`, which is valid, but Karpenter recommends pinning AMI aliases in production instead of using `@latest`.
- The Flux OCI HelmRepository example remains valid, though Flux notes that OCI HelmRepository support is in maintenance mode and OCIRepository is preferred for newer OCI workflows.
