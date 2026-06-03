# Validation Summary: How to Use Spot Node Pools on EKS, GKE, and AKS for Cost Savings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Amazon EKS managed node groups
- AWS EC2 Spot Instances
- AWS Node Termination Handler
- Google Kubernetes Engine Spot VM node pools
- Google Cloud Spot VMs
- Azure Kubernetes Service Spot node pools
- Azure Spot VMs
- Terraform
- Helm
- AWS CLI, gcloud CLI, Azure CLI, BigQuery CLI

## Sources Consulted
- Amazon EKS eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html
- Amazon EKS managed node group capacity types: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EC2 Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS Node Termination Handler GitHub project: https://github.com/aws/aws-node-termination-handler
- Google Kubernetes Engine Spot VMs documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Google Compute Engine Spot VMs documentation: https://docs.cloud.google.com/compute/docs/instances/spot
- gcloud container node-pools create reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Azure AKS Spot node pool documentation: https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Azure AKS node auto-drain documentation: https://learn.microsoft.com/en-us/azure/aks/node-auto-drain
- Azure Spot Virtual Machines documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Terraform AWS EKS node group resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform Google container node pool resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Terraform Azure Kubernetes cluster node pool resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool

## Issues Found
- The GCP behavior section described legacy preemptible VMs as if they were the recommended GKE Spot VM path. Updated it to explain that Spot VMs replace preemptible VMs, do not have the 24-hour maximum runtime, and use a best-effort shutdown period up to 30 seconds.
- The eksctl managed node group example used `capacityType: SPOT`, which is the EKS API/Terraform concept rather than the eksctl config field shown in current eksctl docs. Changed it to `spot: true`.
- The EKS explanation said EKS automatically chooses the best Spot price. Updated this to reflect EKS managed node group Spot allocation strategies, which optimize capacity or price and capacity depending on Kubernetes version.
- The EKS interruption section implied AWS Node Termination Handler is required for managed node groups. Updated it to note that EKS managed node groups already handle Spot rebalancing and interruption draining on a best-effort basis, while Node Termination Handler is useful for self-managed nodes or additional EC2 events.
- The GKE interruption section said GKE drains nodes and that a PodDisruptionBudget ensures availability during those drains. Updated it to describe graceful node shutdown timing and to clarify that Spot VM reclamation is involuntary and can exceed PodDisruptionBudget guarantees.
- The AKS examples used a custom `spot=true:NoSchedule` taint and `capacity-type=spot` label for scheduling. Updated the CLI, Terraform, and workload examples to use AKS's documented `kubernetes.azure.com/scalesetpriority=spot:NoSchedule` taint and `kubernetes.azure.com/scalesetpriority=spot` label.
- The AKS section linked to a non-existent Azure Spot Eviction Handler manifest. Replaced the install command with current AKS node auto-drain behavior, which handles Spot VM Preempt events by cordoning and draining on a best-effort basis without extra configuration.

## Review Notes
The remaining examples are illustrative and assume surrounding infrastructure exists, such as clusters, IAM roles, subnets, Terraform provider configuration, and billing exports. The monitoring commands are directionally valid but may need account-specific dimensions or fields for production cost reporting.
