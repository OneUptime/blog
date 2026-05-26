# Validation Summary: How to Deploy Cluster Autoscaler with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure guide

## Technologies Covered
- Terraform
- Kubernetes Cluster Autoscaler
- Helm
- Amazon EKS
- AWS IAM and Auto Scaling Groups
- Google Kubernetes Engine
- Azure Kubernetes Service
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubernetes Autoscaler AWS cloud provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Kubernetes Cluster Autoscaler Helm chart values and templates: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/charts/cluster-autoscaler
- Kubernetes Cluster Autoscaler metrics source and metrics proposal: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/metrics/metrics.go and https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/proposals/metrics.md
- HashiCorp Google provider `google_container_cluster` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- HashiCorp Google provider `google_container_node_pool` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Google Cloud GKE cluster autoscaler documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- HashiCorp AzureRM provider `azurerm_kubernetes_cluster` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster

## Issues Found
- The Cluster Autoscaler Helm chart version was outdated. Updated the EKS Helm release from `9.35.0` to `9.57.0`, the current upstream chart version checked during validation.
- The GKE section said the standalone autoscaler could be deployed for more control. Updated this to clarify that GKE normally uses its managed cluster autoscaler configured through Terraform.
- The GKE cluster-level autoscaling comment was imprecise. Changed it to refer to node auto-provisioning, which is what the `cluster_autoscaling` block configures at the cluster level.
- The AKS example used the older AzureRM provider field `enable_auto_scaling`. Updated it to `auto_scaling_enabled`, the current field name in AzureRM 4.x.
- The AKS OS disk comment incorrectly referred to a temporary name. Updated it to describe `os_disk_size_gb` as the OS disk size.

## Review Notes
The snippets are illustrative and depend on surrounding provider configuration, variables, cluster versions, CRDs, and provider versions, so they were reviewed against official documentation rather than run as a standalone Terraform module. The EKS managed node group example uses `terraform-aws-modules/eks/aws` v19 syntax; a future refresh could update the module version and syntax together.
