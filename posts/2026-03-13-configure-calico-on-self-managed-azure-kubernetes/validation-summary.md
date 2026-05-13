# Validation Summary: Configure Calico on Self-Managed Azure Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes and kubeadm
- Azure Virtual Machines
- Azure Virtual Network and Network Security Groups
- Azure Instance Metadata Service
- Azure Route Server and User Defined Routes
- CoreDNS and Azure Private DNS

## Sources Consulted
- Calico quickstart guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IP pool documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico calicoctl datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes container runtime prerequisites: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Azure CLI NSG rule reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure Instance Metadata Service documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
- Azure service tags overview: https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Azure Route Server overview: https://learn.microsoft.com/en-us/azure/architecture/example-scenario/networking/manage-routing-azure-route-server
- Azure Route Server configuration documentation: https://learn.microsoft.com/en-us/azure/route-server/configure-route-server

## Issues Found
- The Calico install commands used v3.27.0 and omitted the separate Project Calico CRD install step shown in current Calico quickstart documentation. Updated the commands to v3.32.0 and added the `v1_crd_projectcalico_org.yaml` install command before installing the Tigera operator.
- The introduction said Calico could peer with Azure's virtual network gateway. Azure documentation positions BGP peering for Azure Route Server with NVAs, while VPN Gateway BGP is for VPN/on-premises or VNet-to-VNet peers. Reworded the claim to refer to User Defined Routes and Azure Route Server designs for non-overlay architectures.
- The Azure NSG examples used singular option names and left the direction implicit. Updated the examples to the documented Azure CLI option names, including `--destination-port-ranges`, `--source-address-prefixes`, `--destination-address-prefixes`, and explicit `--direction Inbound`.
- The verification section claimed to apply first network policies but only deployed a connectivity test workload. Renamed the section and text to reflect the actual commands.
- The calicoctl verification commands did not configure calicoctl for the Kubernetes API datastore. Added `DATASTORE_TYPE=kubernetes` and `KUBECONFIG=$HOME/.kube/config`, matching Calico documentation.
- The best-practices section described Azure Private DNS as a replacement for in-cluster DNS. Kubernetes service discovery is handled by CoreDNS; Azure Private DNS is appropriate for private Azure zones or custom internal domains. Updated the wording accordingly.

## Review Notes
The post remains version-specific to Calico v3.32.0. Future reviews should refresh the Calico version and verify whether the current operator quickstart still requires the same CRD and operator manifest sequence.
