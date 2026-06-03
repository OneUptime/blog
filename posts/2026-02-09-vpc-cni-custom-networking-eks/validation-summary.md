# Validation Summary: How to Configure VPC CNI Custom Networking for EKS Pod IP Ranges

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon VPC CNI plugin for Kubernetes
- Kubernetes DaemonSets, Pods, and NetworkPolicy
- AWS VPC subnets, CIDR blocks, route tables, and security groups
- ENIConfig custom resources
- AWS CLI
- Terraform

## Sources Consulted
- Amazon EKS Best Practices: Custom Networking: https://docs.aws.amazon.com/eks/latest/best-practices/custom-networking.html
- Amazon EKS User Guide: Customize the secondary network interface in Amazon EKS nodes: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network-tutorial.html
- Amazon EKS User Guide: Amazon VPC CNI add-on configuration: https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html
- AWS CLI Command Reference: eks create-nodegroup: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- AWS CLI Command Reference: eks describe-addon-configuration: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html
- Amazon VPC CNI for Kubernetes GitHub documentation: https://github.com/aws/amazon-vpc-cni-k8s
- HashiCorp Terraform AWS Provider: aws_eks_addon: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon
- RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space: https://www.rfc-editor.org/rfc/rfc6598

## Issues Found
- The /24 capacity example said a subnet supports 4-5 nodes at 50 pods per node. Updated it to about 4 nodes after accounting for AWS-reserved subnet addresses.
- The RFC 6598 wording described 100.64.0.0/16 as the designated range. Clarified that 100.64.0.0/16 is within the RFC 6598 100.64.0.0/10 Shared Address Space and that users must still check for local conflicts.
- The security group example created a pod security group but continued using a placeholder ID. Updated the command to capture the created security group ID and reuse it in subsequent rules.
- The security group and routing discussion implied ENIConfig security groups and pod subnet routes are always used for external pod egress. Clarified default AWS_VPC_K8S_CNI_EXTERNALSNAT=false behavior, where off-VPC traffic is SNATed through the node primary network interface.
- The CNI log commands omitted the container name. Added `-c aws-node` for current multi-container aws-node pods.
- The monitoring command used `vpc.amazonaws.com/pod-eni`, which is a pod ENI resource for security groups for pods rather than a normal custom networking IP availability metric. Replaced it with CNI IPAM logs and subnet available-IP checks.
- The Terraform example attempted to manage the existing `aws-node` DaemonSet with an incomplete `kubernetes_daemonset_v1` resource. Replaced it with an `aws_eks_addon` configuration using `configuration_values` for the VPC CNI environment variables.
- The Terraform example created pod subnets from a secondary CIDR but did not associate the secondary CIDR block. Added an `aws_vpc_ipv4_cidr_block_association` resource and subnet dependency.

## Review Notes
The article is technically valid after the fixes. The examples still use placeholder IDs and assume Linux EC2 nodes with the Amazon VPC CNI; production implementations should also verify VPC CNI version compatibility, current EKS add-on schema for the selected add-on version, max-pods settings, and whether prefix delegation or EKS Auto Mode changes the intended setup.
