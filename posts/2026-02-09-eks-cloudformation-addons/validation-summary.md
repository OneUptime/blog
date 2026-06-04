# Validation Summary: How to Create EKS Clusters with CloudFormation Custom Resources and Add-Ons

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS CloudFormation
- AWS CloudFormation custom resources
- Amazon EKS managed add-ons
- IAM Roles for Service Accounts (IRSA)
- Amazon VPC CNI
- CoreDNS
- kube-proxy
- Amazon EBS CSI Driver
- AWS CLI
- Kubernetes kubeconfig exec authentication

## Sources Consulted
- AWS CloudFormation `AWS::EKS::Cluster` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eks-cluster.html
- AWS CloudFormation `AWS::EKS::Addon` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eks-addon.html
- AWS CloudFormation `AWS::EKS::Nodegroup` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eks-nodegroup.html
- AWS CloudFormation `AWS::IAM::OIDCProvider` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-oidcprovider.html
- Amazon EKS add-ons user guide: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS optimized AMI deprecation guidance: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- Amazon EKS security groups for Pods guidance: https://docs.aws.amazon.com/eks/latest/userguide/security-groups-pods-deployment.html
- Kubernetes kubeconfig exec authentication reference: https://kubernetes.io/docs/reference/access-authn-authz/authentication/

## Issues Found
- The template defaulted to Kubernetes `1.28`, which is no longer in EKS standard support as of June 4, 2026. Updated the default to `1.35`, one of the currently documented EKS standard-support versions.
- The add-on examples pinned versions from the EKS 1.28 timeframe. Removed the hard-coded add-on versions so CloudFormation/EKS can select compatible defaults, and added a note to use `aws eks describe-addon-versions` when pinning versions.
- The managed node group used `AL2_x86_64`, but AWS no longer publishes EKS-optimized Amazon Linux 2 AMIs for Kubernetes 1.33 and later. Updated the managed node group AMI type to `AL2023_x86_64_STANDARD`.
- The VPC CNI add-on configuration enabled `ENABLE_POD_ENI`, but the cluster role lacked the `AmazonEKSVPCResourceController` policy required for security groups for Pods. Added the managed policy to the EKS cluster IAM role.
- The IRSA trust policy used the OIDC provider resource reference as the condition key, which resolves to an ARN. IAM OIDC trust policy condition keys must use the issuer host/path without `https://`. Rewrote the trust policy to use the OIDC provider ARN for `Principal.Federated` and the issuer host/path for `aud` and `sub` conditions.
- The OIDC provider snippet included a fixed thumbprint. CloudFormation now documents `ThumbprintList` as optional and IAM can retrieve the top intermediate CA thumbprint, so the fixed value was removed to avoid stale thumbprint guidance.
- The generated kubeconfig used `client.authentication.k8s.io/v1beta1`. Updated it to `client.authentication.k8s.io/v1` and added the required `interactiveMode: Never` field.

## Review Notes
The snippets are still illustrative partial templates in several sections, so they should be combined carefully before deployment. If the author later wants pinned add-on versions, those should be selected per Kubernetes minor version and AWS Region with `aws eks describe-addon-versions`.
