# Validation Summary: How to Set Up AKS with Virtual Nodes Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- AKS Virtual Nodes
- Azure Container Instances (ACI)
- AzureRM provider
- Kubernetes
- KEDA
- Helm

## Sources Consulted
- Microsoft Learn: AKS virtual nodes overview - https://learn.microsoft.com/en-us/azure/aks/virtual-nodes
- Microsoft Learn: AKS virtual nodes with Azure CLI - https://learn.microsoft.com/en-us/azure/aks/virtual-nodes-cli
- Microsoft Learn: Supported Kubernetes versions in AKS - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Deploy container groups to a virtual network - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-vnet
- Terraform Registry: `azurerm_kubernetes_cluster` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Registry: `azurerm_subnet` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Terraform Registry: `azurerm_role_assignment` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- KEDA docs: ScaledObject specification - https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA docs: Azure Service Bus scaler - https://keda.sh/docs/2.19/scalers/azure-service-bus/
- Microsoft Learn: Virtual nodes on Azure Container Instances - https://learn.microsoft.com/en-gb/azure/container-instances/container-instances-virtual-nodes

## Issues Found
- The post pinned AKS to Kubernetes `1.28`, which is no longer a supported AKS version as of May 7, 2026. I updated the example to `1.35`, which is a current supported GA minor version.
- The delegated ACI subnet example only included `Microsoft.Network/virtualNetworks/subnets/join/action`. Current AzureRM subnet examples for `Microsoft.ContainerInstance/containerGroups` include both `join/action` and `prepareNetworkPolicies/action`, so I updated the delegation block accordingly.
- The AKS virtual-node setup omitted the required subnet RBAC assignment for the virtual-node connector identity. Current AKS virtual-node guidance still requires granting `Network Contributor` on the delegated subnet, so I added an `azurerm_role_assignment` example using the connector identity exported by `aci_connector_linux`.
- The pod scheduling YAML used the deprecated `beta.kubernetes.io/os` selector and an outdated toleration pattern. I updated it to match current AKS virtual-node documentation: `kubernetes.io/os: linux`, `type: virtual-kubelet`, `virtual-kubelet.io/provider` with `operator: Exists`, and the `azure.com/aci` toleration.
- The KEDA example lacked a valid Service Bus authentication reference. I added `connectionFromEnv` so the trigger aligns with current KEDA Azure Service Bus scaler documentation.
- The HPA section incorrectly implied that replicas automatically spill from regular nodes to virtual nodes when VM-backed nodes are full. I corrected the wording and example so it accurately describes scaling a deployment that is already configured to target virtual nodes.
- The deploy command used `kubectl apply -f burst-deployment.yaml` even though the file path shown in the post was `kubernetes/burst-deployment.yaml`. I corrected the command to use the same path.
- The conclusion overstated some limitations and included unsupported startup-time numbers. I corrected it to reflect documented limitations: no DaemonSets, no Kubernetes PV/PVC support on virtual nodes, Azure Files inline volumes still possible, and fast provisioning without asserting specific timings.
- The introduction could be confused with Microsoft's newer Helm-based "virtual nodes on Azure Container Instances" offering. I added a clarifying sentence that this post uses the AKS virtual-nodes add-on exposed by `aci_connector_linux`.

## Review Notes
- The post is now technically correct for the AKS virtual-nodes add-on path exposed by the AzureRM/OpenTofu `aci_connector_linux` block.
- Microsoft also documents a newer Helm-based "virtual nodes on Azure Container Instances" implementation separately. This post does not cover that path, so future updates should re-check whether AzureRM adds first-class support for it.
- The pinned Kubernetes version is date-sensitive. A future revalidation should confirm that `1.35` is still supported, or switch the example to a then-current supported GA version.
