# Validation Summary: How to Use AWS EKS-compatible Networking with Talos Linux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Talos Linux
- Kubernetes
- AWS VPC CNI
- Amazon EC2 ENIs and secondary IP addresses
- Helm
- AWS IAM
- Kubernetes NetworkPolicy
- EKS Security Groups for Pods

## Sources Consulted
- Talos Linux configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos Linux CNI guide: https://www.talos.dev/latest/kubernetes-guides/network/deploying-cilium/
- Amazon EKS VPC CNI best practices: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon VPC CNI GitHub repository and README: https://github.com/aws/amazon-vpc-cni-k8s
- AmazonEKS_CNI_Policy managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEKS_CNI_Policy.html
- Amazon EKS network policy configuration docs: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy-configure.html
- Amazon EKS Security Groups for Pods docs: https://docs.aws.amazon.com/eks/latest/userguide/security-groups-pods-deployment.html
- AWS Containers Blog on VPC CNI prefix delegation: https://aws.amazon.com/blogs/containers/amazon-vpc-cni-increases-pods-per-node-limits/

## Issues Found
- The introduction implied pod-level security groups are available on self-managed Talos clusters by installing VPC CNI. Updated the wording because AWS Security Groups for Pods depends on the EKS-managed VPC resource controller and is not generally available on self-managed Talos just from installing the CNI.
- The post described Calico and Flannel as always overlay CNIs. Updated the wording because Flannel is commonly overlay-based, but Calico can be configured without an overlay.
- The IAM policy omitted `ec2:DescribeSubnets` and `ec2:DescribeSecurityGroups`, and treated `ec2:CreateTags` as a general `"Resource": "*"`. Updated the policy to match the current AWS managed `AmazonEKS_CNI_Policy` structure for IPv4 clusters.
- The Helm example pinned VPC CNI `v1.15.1`, which is outdated. Updated the image tags to `v1.21.1`, the latest release shown by the official VPC CNI repository during review.
- The ENI inspection command used `grpc-health-probe`, which checks health but does not show ENI allocation details. Replaced it with the VPC CNI introspection endpoint at `localhost:61679/v1/enis`.
- The NetworkPolicy section did not mention the self-managed cluster requirement for the Amazon network policy controller. Added that caveat while keeping the existing Helm enablement command.

## Review Notes
The guide is technically valid after the fixes. For production use, readers should still confirm Kubernetes, Talos, and VPC CNI version compatibility for their exact cluster version, and should consider using a dedicated IAM role for the CNI instead of broad node-role permissions where their identity setup supports it.
