# Validation Summary: How to Create an EKS Cluster with eksctl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- eksctl
- Kubernetes
- kubectl
- AWS CLI
- AWS IAM and IRSA
- Amazon EKS managed and self-managed node groups
- Amazon EKS add-ons
- Amazon VPC CNI, CoreDNS, kube-proxy, and AWS EBS CSI Driver
- Amazon CloudWatch control plane logging

## Sources Consulted
- AWS eksctl installation options: https://docs.aws.amazon.com/eks/latest/eksctl/installation.html
- AWS Amazon EKS getting started with eksctl: https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html
- AWS eksctl creating and managing clusters: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html
- AWS Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS eksctl VPC configuration: https://docs.aws.amazon.com/eks/latest/eksctl/vpc-configuration.html
- AWS eksctl add-ons: https://docs.aws.amazon.com/eks/latest/eksctl/addons.html
- AWS eksctl CloudWatch cluster logging: https://docs.aws.amazon.com/eks/latest/eksctl/cloudwatch-cluster-logging.html
- AWS eksctl IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS Amazon EKS managed node group updates: https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- eksctl ClusterConfig schema source: https://raw.githubusercontent.com/eksctl-io/eksctl/main/pkg/apis/eksctl.io/v1alpha5/assets/schema.json

## Issues Found
- The Homebrew install commands used the older Weaveworks tap. Updated them to the AWS-maintained Homebrew tap documented by AWS: `brew tap aws/tap` and `brew install aws/tap/eksctl`.
- The Linux install command downloaded from the old `weaveworks/eksctl` GitHub release path. Updated it to the current `eksctl-io/eksctl` release path and the install flow documented by AWS.
- The production cluster example pinned Kubernetes `1.29`, which is not in standard Amazon EKS support as of this review date. Updated the example to `1.35`, the latest standard-support version listed in the official EKS lifecycle documentation.
- The production and add-on examples used IRSA-related policies without explicitly enabling the cluster IAM OIDC provider. Added `iam.withOIDC: true` so the EBS CSI add-on policy and later service account role examples work as described.
- The managed node group explanation said users get automatic AMI updates. Clarified this to managed node update workflows, because EKS applies updates automatically after an update is initiated rather than silently upgrading node groups whenever a new AMI is released.

## Review Notes
- The current eksctl schema still supports the ClusterConfig fields used in the article, including `managedNodeGroups`, node group `withAddonPolicies`, `addons`, `wellKnownPolicies.ebsCSIController`, `cloudWatch.clusterLogging.enableTypes`, `vpc.clusterEndpoints`, and `vpc.publicAccessCIDRs`.
- The linked related OneUptime posts exist in the repository at the referenced slugs.
- The local environment did not have `eksctl`, `aws`, or `kubectl` installed, so CLI validation was performed against official AWS/eksctl documentation and the published eksctl schema rather than local command help.
