# Validation Summary: How to Set Up AKS with kubenet Networking Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- Azure networking
- Azure route tables
- Azure managed identities and RBAC
- Kubernetes NetworkPolicy
- Calico

## Sources Consulted
- Microsoft Learn: AKS kubenet networking: https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn: AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Azure CLI `az aks get-credentials`: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-get-credentials
- Microsoft Learn: Azure CLI `az network route-table route list`: https://learn.microsoft.com/en-us/cli/azure/network/route-table/route?view=azure-cli-latest#az-network-route-table-route-list
- Terraform AzureRM provider docs: `azurerm_kubernetes_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster.html.markdown
- Terraform AzureRM provider docs: `azurerm_kubernetes_cluster_node_pool`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster_node_pool.html.markdown
- Terraform AzureRM provider docs: `azurerm_route_table`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/route_table.html.markdown
- Kubernetes docs: Namespaces and the `kubernetes.io/metadata.name` label: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes docs: `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The route table example used the outdated AzureRM argument `disable_bgp_route_propagation`; it was updated to `bgp_route_propagation_enabled`, which is the current provider field.
- The AKS cluster example used a system-assigned identity plus a post-creation role assignment. For AKS kubenet with a user-provided subnet and route table when using OpenTofu or other non-CLI clients, current AKS docs require a user-assigned managed identity with permissions granted before cluster creation. The post was updated accordingly.
- The AKS identity permissions were incomplete. The post originally granted `Network Contributor` only on the route table, but AKS also needs access to the subnet. The post now grants `Network Contributor` on both the subnet and the route table.
- The cluster resource did not depend on the subnet-to-route-table association or the precreated role assignments, which could allow OpenTofu to attempt cluster creation too early. `depends_on` was added so the ordering matches AKS requirements.
- The AKS HCL used outdated autoscaling field names. `enable_auto_scaling` was updated to `auto_scaling_enabled` for the current AzureRM provider schema.
- The post hardcoded Kubernetes `1.28`, which is no longer a supported AKS version as of May 7, 2026. It was changed to `var.kubernetes_version` with guidance to use a supported minor version such as `1.35`.
- The `max_pods` comment incorrectly implied kubenet is capped at 110 pods per node. The docs now reflect that 110 is the default and kubenet is configurable up to 250.
- The NetworkPolicy example matched on a namespace label `name: ingress-nginx`, which Kubernetes does not add automatically. It was corrected to `kubernetes.io/metadata.name: ingress-nginx`.
- The validation command used `http://backend-service` from the default namespace, which would not resolve to a Service in the `production` namespace. It was corrected to use the service FQDN.
- The conclusion implied the only required RBAC grant was on the route table and did not reflect the current managed-identity requirement. It was corrected, and a kubenet retirement note was added for accuracy.

## Review Notes
- Kubenet in AKS is scheduled for retirement on March 31, 2028. The post now mentions this, but readers should still prefer Azure CNI Overlay for new long-lived deployments.
- AKS role assignments can take time to propagate in Azure. Even with the corrected resource ordering, a freshly created identity can still be subject to Azure RBAC propagation delay during `tofu apply`.
