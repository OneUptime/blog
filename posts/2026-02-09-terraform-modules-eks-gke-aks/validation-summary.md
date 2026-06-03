# Validation Summary: How to Manage K8s Cluster Infra with Terraform Modules for EKS, GKE, and AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform modules
- AWS EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- Kubernetes
- Terraform CLI workspaces

## Sources Consulted
- Terraform AWS provider `aws_eks_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider `aws_eks_node_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS `NodegroupScalingConfig` API reference: https://docs.aws.amazon.com/eks/latest/APIReference/API_NodegroupScalingConfig.html
- Terraform Google provider `google_container_cluster` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- GKE release schedule and version support: https://docs.cloud.google.com/kubernetes-engine/docs/release-schedule
- Terraform AzureRM provider `azurerm_kubernetes_cluster` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster.html
- AKS supported Kubernetes versions: https://learn.microsoft.com/azure/aks/supported-kubernetes-versions
- Terraform `workspace new` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new

## Issues Found
- The EKS, GKE, and AKS module snippets defaulted to Kubernetes `1.28`, which is stale for a 2026 guide. Updated the defaults to `1.33`, a currently supportable minor version across the managed Kubernetes services checked.
- The EKS snippet referenced `aws_subnet.private[*].id` without defining that resource in the module. Replaced it with a `subnet_ids` input and updated the unified module example to pass `aws_subnet_ids`.
- The GKE snippet referenced `google_compute_network.vpc` and `google_compute_subnetwork.subnet` without defining those resources. Replaced them with `network` and `subnetwork` inputs and updated the unified module example.
- The AKS snippet referenced `azurerm_subnet.aks.id` without defining that resource. Replaced it with a `subnet_id` input and updated the unified module example.
- The AKS snippet used the older AzureRM provider argument `enable_auto_scaling`. Updated it to the current `auto_scaling_enabled` argument.
- The EKS explanation implied the managed node group scaling configuration provided automatic scaling by itself. Clarified that it sets capacity bounds and Kubernetes-driven scaling requires Cluster Autoscaler or Karpenter.
- The GKE explanation said GKE uses workload identity instead of IAM roles. Clarified that Workload Identity Federation for GKE lets Kubernetes service accounts access Google Cloud IAM permissions.

## Review Notes
The examples remain illustrative rather than complete production modules. A future revision could add provider version constraints, full VPC/subnet creation examples, private endpoint-only options, node service accounts, release channel strategy for GKE, and explicit autoscaler/Karpenter installation guidance.
