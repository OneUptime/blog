# Validation Summary: How to Create EKS Clusters with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Amazon EKS
- Kubernetes
- Managed node groups
- EKS Fargate profiles
- IAM Roles for Service Accounts (IRSA)
- Helm charts
- EKS access entries
- EKS managed add-ons

## Sources Consulted
- AWS CDK `aws_eks.Cluster` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.Cluster.html
- AWS CDK `ClusterProps` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.ClusterProps.html
- AWS CDK `KubernetesVersion` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.KubernetesVersion.html
- AWS CDK `NodegroupAmiType` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.NodegroupAmiType.html
- AWS CDK `AccessEntry` and `AccessPolicy` API references: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.AccessEntry.html and https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.AccessPolicy.html
- AWS CDK `AlbControllerVersion` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.AlbControllerVersion.html
- AWS CDK `CfnAddon` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.CfnAddon.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS managed node group documentation: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EKS managed node group update documentation: https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- Amazon EKS AL2 AMI deprecation FAQ: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- Amazon EKS AWS Load Balancer Controller Helm installation guide: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS `aws-auth` ConfigMap deprecation guidance: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- AWS CloudFormation `AWS::EKS::Addon` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-eks-addon.html

## Issues Found
- The cluster example used `eks.KubernetesVersion.V1_29`, which is no longer available for creating new EKS clusters on June 3, 2026. Updated it to `eks.KubernetesVersion.V1_34`, which is in current EKS standard support.
- The `aws-eks` cluster example omitted the required matching kubectl Lambda layer for Kubernetes 1.34. Added `@aws-cdk/lambda-layer-kubectl-v34` and `kubectlLayer: new KubectlV34Layer(...)`.
- The node group examples used `eks.NodegroupAmiType.AL2_X86_64`. Amazon EKS stopped publishing AL2 optimized AMIs after Kubernetes 1.32, so updated both node groups to `AL2023_X86_64_STANDARD`.
- The DynamoDB IRSA policy used an invalid IAM ARN namespace for a DynamoDB table. Replaced it with a DynamoDB table ARN using the stack region and account.
- The AWS Load Balancer Controller Helm example set `serviceAccount.create=false` but did not create the required service account or attach the required IAM permissions. Replaced that incomplete standalone Helm installation with CDK's `albController` cluster option.
- The access-management example used `cluster.awsAuth.addRoleMapping`, while AWS marks the `aws-auth` ConfigMap as deprecated for IAM principal access management. Updated the cluster to `API_AND_CONFIG_MAP` authentication mode and replaced the mappings with EKS access entries and managed EKS access policies.

## Review Notes
- TypeScript API usage for the corrected CDK snippets was checked against `aws-cdk-lib@2.257.0` and `@aws-cdk/lambda-layer-kubectl-v34@2.2.2` in a temporary compile harness.
- The Cluster Autoscaler Helm chart still requires suitable service account/IAM permissions in a real production deployment. The existing snippet is structurally valid CDK/Helm usage, but a future revision could add the IRSA policy for the autoscaler controller.
- The linked OneUptime KMS and Route 53 posts returned HTTP 200 during review.
