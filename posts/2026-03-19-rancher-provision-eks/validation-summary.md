# Validation Summary: How to Provision an EKS Cluster from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Amazon EKS
- AWS IAM
- Amazon VPC
- Amazon EC2 managed node groups
- Amazon EBS CSI driver
- Kubernetes
- `kubectl`
- AWS CLI

## Sources Consulted
- Rancher: Creating an EKS Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/eks
- Rancher: EKS Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/eks-cluster-configuration
- Rancher: Managing Cloud Credentials: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/manage-cloud-credentials
- Amazon EKS: Create an Amazon EKS cluster: https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html
- Amazon EKS: View Amazon EKS networking requirements for VPC and subnets: https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html
- Amazon EKS: Send control plane logs to CloudWatch Logs: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- Amazon EKS: Create a managed node group for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html
- AWS CLI: `create-nodegroup`: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- Amazon EKS: Create nodes with optimized Amazon Linux AMIs: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon EKS: Use Kubernetes volume storage with Amazon EBS: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EKS: Create an IAM OIDC provider for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html

## Issues Found
- The IAM policy example was not a reliable or current representation of Rancher's required EKS permissions. I removed the sample policy and replaced it with guidance to use Rancher's documented minimum EKS permissions, because Rancher now documents separate requirements for core EKS provisioning, the EBS CSI add-on, and IPv6 provisioning.
- The prerequisites implied that an EC2 instance role for the Rancher server could be used in place of the AWS cloud credential. I changed this to the documented access key ID and secret access key flow used for Rancher cloud credentials.
- The new-VPC instructions claimed the Rancher workflow includes specifying a CIDR block. I removed that claim because the Rancher EKS documentation describes Rancher generating the VPC and subnets automatically, but does not document a CIDR input in this workflow.
- The API endpoint section omitted Rancher's private-only endpoint behavior. I added the required caveat that private-only endpoint clusters need either Rancher network reachability or a post-provisioning registration command.
- The node disk section implied a direct Rancher disk type setting. I corrected this to note that EBS volume type configuration belongs in a custom launch template.
- The AMI section was outdated. I changed it to reflect current EKS behavior: AL2023 is the default for newly created managed node groups on newer EKS versions, AL2 is still available, Bottlerocket is supported, and Ubuntu requires a properly configured custom AMI or launch template rather than a built-in AMI type selection.
- The storage section implied the EBS CSI driver is simply provided by EKS. I changed it to the accurate operational guidance: verify the Amazon EBS CSI driver is installed if you plan to use EBS-backed volumes.
- The IRSA section incorrectly suggested the OIDC provider is typically configured during EKS creation and used a command that only prints cluster OIDC metadata. I replaced it with the AWS-documented verification flow that checks for an actual IAM OIDC provider and noted that standard IPv4 EKS clusters do not enable this automatically.

## Review Notes
- On EKS 1.30 and later, newly created managed node groups default to Amazon Linux 2023 rather than Amazon Linux 2.
- Rancher documents additional IAM permissions when it is expected to install the Amazon EBS CSI add-on or provision IPv6 clusters.
- AWS now suggests EKS Pod Identities for some new integrations, but IRSA remains supported and technically valid for this post.
