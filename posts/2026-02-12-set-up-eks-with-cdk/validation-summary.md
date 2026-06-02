# Validation Summary: How to Set Up EKS with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Amazon EKS
- Kubernetes
- TypeScript
- Amazon VPC CNI, CoreDNS, kube-proxy, and Amazon EBS CSI EKS add-ons
- IAM Roles for Service Accounts (IRSA)
- EKS access entries
- Helm charts
- AWS CLI and kubectl

## Sources Consulted
- AWS CDK v2 `aws_eks.ClusterProps` and `KubernetesVersion`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.ClusterProps.html
- AWS CDK v2 `aws_eks.NodegroupAmiType`: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_eks/NodegroupAmiType.html
- AWS CDK v2 `aws_eks.CfnAddon` and `CfnAddonProps`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.CfnAddon.html
- AWS CDK v2 `aws_eks.AuthenticationMode`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.AuthenticationMode.html
- AWS CloudFormation `AWS::EKS::Addon`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eks-addon.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS VPC CNI add-on versions: https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- Amazon EKS AL2 to AL2023 guidance: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html
- Amazon EKS add-on IAM roles: https://docs.aws.amazon.com/eks/latest/userguide/add-ons-iam.html
- Amazon EKS EBS CSI add-on guidance: https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
- Amazon EKS AWS Load Balancer Controller Helm installation: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS access entries and `aws-auth` deprecation guidance: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html and https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html
- AWS CDK v2 `HelmChartOptions`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.HelmChartOptions.html

## Issues Found
- The cluster example used Kubernetes 1.29 and `@aws-cdk/lambda-layer-kubectl-v29`. Amazon EKS 1.29 has passed extended support by the 2026-06-02 review date, while the current AWS docs list 1.35, 1.34, and 1.33 in standard support. Updated the examples to `eks.KubernetesVersion.V1_35` and `KubectlV35Layer`.
- The managed node group used `eks.NodegroupAmiType.AL2_X86_64`. AWS has stopped publishing EKS-optimized AL2 AMIs, and AL2023 is the current supported option for EKS 1.33 and later. Updated the example to `AL2023_X86_64_STANDARD`.
- The custom service account policy example called `appSa.role.addToPolicy(...)`, but current CDK types expose `role` as `IRole`, where `addToPrincipalPolicy(...)` is the supported method. Updated the snippet.
- The VPC CNI add-on pinned `v1.16.0-eksbuild.1`, which is outdated for the current EKS add-on table. Updated it to the current documented `v1.19.5-eksbuild.3`.
- The EBS CSI add-on was labeled IRSA but used the EKS Pod Identity service principal `pods.eks.amazonaws.com`. Updated the role trust policy to use `iam.OpenIdConnectPrincipal` with the `ebs-csi-controller-sa` service account subject, and updated the managed policy to `AmazonEBSCSIDriverPolicyV2`.
- The AWS Load Balancer Controller Helm chart set `serviceAccount.create: false` without creating the service account or attaching the controller IAM policy. Added a CDK service account, attached the referenced controller policy ARN, and added a dependency so Helm runs after the service account exists.
- The cluster access example used `cluster.awsAuth.addRoleMapping`, but AWS now deprecates the `aws-auth` ConfigMap in favor of EKS access entries. Updated the example to `cluster.grantAccess(...)` with EKS access policies and set the cluster authentication mode to `API_AND_CONFIG_MAP` so access entries are supported.

## Review Notes
- The AWS Load Balancer Controller policy ARN in the example is account-specific and assumes the `AWSLoadBalancerControllerIAMPolicy` policy has already been created from the official controller policy document.
- I compiled a representative TypeScript stack assembled from the corrected snippets against current `aws-cdk-lib`, `constructs`, `@aws-cdk/lambda-layer-kubectl-v35`, and `typescript`; it passed `tsc --noEmit`.
