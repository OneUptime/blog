# Validation Summary: How to Troubleshoot Calico on Azure Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Azure Virtual Machines
- Azure Virtual Network
- Azure Network Security Groups
- Azure route tables / user-defined routes
- Azure CLI
- kubectl
- calicoctl

## Sources Consulted
- Calico Azure documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Azure network interface IP forwarding documentation: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Azure CLI az vm nic reference: https://learn.microsoft.com/en-us/cli/azure/vm/nic
- Azure CLI az network nsg rule reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule

## Issues Found
- The `calicoctl patch` command used `--type merge`, but current Calico documentation lists JSON merge patch as not implemented for `calicoctl patch`. I changed the command to use the supported default patch form with `--patch`.
- The diagnostic comment said `calicoctl node status` checks "BGP/VXLAN peer status." Calico VXLAN mode does not require BGP, and `calicoctl node status` reports Calico node and BGP peer status. I updated the wording to avoid implying VXLAN peers are shown there.
- The route-table example used one cluster-wide Pod CIDR route pointing to one node IP. For non-overlay routing in Azure, routes need to target the appropriate node for each node Pod CIDR. I changed the example to show one route per node Pod CIDR.

## Review Notes
- Calico's official Azure documentation states that Calico VXLAN mode is supported on Azure and that IPIP packets are blocked by the Azure network fabric.
- Azure documentation confirms that IP forwarding must be enabled on the VM network interface for forwarded traffic, and Azure CLI supports this through `az network nic update --ip-forwarding true`.
- Calico documentation confirms VXLAN uses UDP 4789 and Typha uses TCP 5473 by default.
