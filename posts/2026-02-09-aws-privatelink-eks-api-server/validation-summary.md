# Validation Summary: How to Set Up AWS PrivateLink for EKS API Server Access from On-Premises

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes API server private endpoint
- AWS Site-to-Site VPN
- AWS Direct Connect
- Amazon VPC route tables and security groups
- Route 53 private DNS resolution
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- Amazon EKS User Guide: Cluster API server endpoint - https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Amazon EKS User Guide: Access Amazon EKS using AWS PrivateLink - https://docs.aws.amazon.com/eks/latest/userguide/vpc-interface-endpoints.html
- AWS CLI Command Reference: eks update-cluster-config - https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- AWS CLI Command Reference: directconnect create-private-virtual-interface - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-private-virtual-interface.html
- AWS CLI Command Reference: route53 create-hosted-zone - https://docs.aws.amazon.com/cli/latest/reference/route53/create-hosted-zone.html
- Terraform AWS Provider: aws_eks_cluster data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster
- Terraform AWS Provider: aws_security_group_rule resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule

## Issues Found
- The post incorrectly described AWS PrivateLink interface endpoints as the mechanism for Kubernetes API server access. AWS documentation states that Amazon EKS PrivateLink interface endpoints are for Amazon EKS management API actions and do not support Kubernetes API requests; the Kubernetes API server uses the EKS cluster private endpoint. Updated the title, description, explanation, section headings, Terraform label, monitoring text, and conclusion to describe private EKS API server access through a connected network.
- The post stated that the architecture uses an interface VPC endpoint for the EKS API server. Updated this to explain that the architecture uses the EKS cluster private endpoint and private network routing to the cluster VPC.
- The DNS examples used the full `https://` endpoint URL with `dig`, `nslookup`, and Route 53 CNAME creation. DNS tools and CNAME values require hostnames, not URLs. Added `ENDPOINT_HOST=${PRIVATE_ENDPOINT#https://}` and updated DNS and troubleshooting commands to use the hostname.
- The Route 53 private hosted zone section recommended creating a custom private hosted zone and CNAME for easier Kubernetes API access. EKS creates a managed private hosted zone for the cluster endpoint, and replacing the kubeconfig server with a custom CNAME can break Kubernetes API server certificate hostname validation. Replaced that guidance with forwarding the original EKS endpoint hostname through VPC DNS resolution.
- The cost-saving claim was too broad because private connectivity options can have their own costs. Qualified the statement to say potential cost savings when using options such as Direct Connect instead of internet routing.

## Review Notes
AWS CLI and Terraform binaries were not installed in the local environment, so command and configuration validation was performed against official AWS CLI and Terraform provider documentation. The Direct Connect, VPN, EKS endpoint configuration, EKS control plane logging, and security group command shapes are consistent with the referenced documentation, but real deployments still require environment-specific IDs, CIDRs, route table selection, DNS forwarding configuration, and IAM/RBAC access for `kubectl`.
