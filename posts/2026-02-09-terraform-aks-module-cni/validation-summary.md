# Validation Summary: Using Terraform Modules to Deploy AKS Clusters with Azure CNI Networking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Kubernetes Service (AKS)
- Azure CNI networking
- Azure CNI Overlay
- Kubenet
- Kubernetes NetworkPolicy
- Azure Network Policy Manager
- Calico
- Cilium
- Azure private clusters

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- HashiCorp AzureRM provider source documentation for `azurerm_kubernetes_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_kubernetes_cluster_node_pool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- HashiCorp AzureRM provider source documentation for `azurerm_kubernetes_cluster_node_pool`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster_node_pool.html.markdown
- Microsoft Learn, Azure CNI networking overview for AKS: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overview
- Microsoft Learn, IP address planning for AKS: https://learn.microsoft.com/en-us/azure/aks/concepts-network-ip-address-planning
- Microsoft Learn, Secure traffic between pods with network policies in AKS: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn, Private AKS clusters: https://learn.microsoft.com/en-us/azure/aks/private-clusters
- Microsoft Learn, Supported Kubernetes versions in AKS: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn, Configure kubenet networking in AKS: https://learn.microsoft.com/en-us/azure/aks/configure-kubenet

## Issues Found
- The post used Kubernetes `1.29`, which is outside regular AKS support and past its LTS end date as of the validation date. Updated the examples to `1.35`, a supported AKS minor version.
- The Terraform snippets used `enable_auto_scaling`, which is not the current AzureRM v4 argument name. Updated the default node pool and additional node pool examples to `auto_scaling_enabled`.
- The AKS Azure AD RBAC block included `managed = true`, which is not present in the current AzureRM provider schema. Removed that argument and kept `azure_rbac_enabled = true`.
- The post described kubenet as a primary current option without mentioning its retirement. Added the AKS kubenet retirement date and guidance to use Azure CNI for new production designs.
- The post stated that a `/22` subnet has 1,022 usable IPs. Azure reserves five addresses in each subnet, so corrected this to 1,019 usable IPs.
- The IP planning section said Kubernetes services require addresses from the node subnet. Corrected the wording to distinguish service CIDR usage from VNet IPs consumed by node, pod, internal load balancer, upgrade, and scaling needs.
- The internal load balancer subnet description implied AKS automatically uses the separate subnet. Clarified that internal load balancer front-end IPs come from the node subnet by default unless the Kubernetes annotation and identity permissions are configured.
- The network policy explanation incorrectly said policies are enforced by Azure network infrastructure rather than node-level policy engines. Corrected it to state that enforcement is handled by the configured AKS policy engine, such as Azure NPM, Calico, or Cilium.
- The private cluster snippet included `authorized_ip_ranges = []`, but authorized IP ranges apply only to the public API server endpoint. Removed the block and added a note explaining the limitation.
- The Azure CNI Overlay troubleshooting note implied overlay retains directly routable pod IPs. Corrected it to recommend overlay only when directly routable pod IPs are not required.
- The conclusion implied pod-level NSG targeting. Corrected it to describe direct pod connectivity and subnet-level network controls.

## Review Notes
Azure Network Policy Manager is still usable in the shown configuration, but Microsoft recommends Cilium for new deployments and has announced Azure NPM retirement dates. A future modernization pass could convert the module to Azure CNI Powered by Cilium, but that would require additional configuration such as `network_data_plane = "cilium"` and either overlay mode or a pod subnet.
