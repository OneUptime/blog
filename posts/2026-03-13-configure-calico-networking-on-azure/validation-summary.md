# Validation Summary: Configure Calico Networking on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Azure Virtual Network
- Azure VM NIC IP Forwarding
- Azure Network Security Groups
- Azure route tables and user-defined routes
- Helm
- Azure CLI

## Sources Consulted
- Calico Open Source documentation: Azure configuration on public clouds: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico Open Source documentation: Install using Helm: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Open Source documentation: Helm installation reference: https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico Open Source documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source documentation: Customize Calico configuration / Use VXLAN: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico Open Source documentation: IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Microsoft Learn: Create, change, or delete Azure network interfaces / IP forwarding: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Microsoft Learn: Azure CLI az network route-table route: https://learn.microsoft.com/en-us/cli/azure/network/route-table/route
- Microsoft Learn: Azure CLI az network nsg rule: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule

## Issues Found
- The introduction stated that Azure IP Forwarding is required for Calico overlay traffic. Microsoft documents IP Forwarding as needed when a NIC forwards traffic for IPs not assigned to it, and Calico's Azure documentation specifically lists it for Azure user-defined routes. Updated the text to distinguish VXLAN overlay from Azure UDR forwarding.
- The Helm installation example installed the Tigera operator but did not configure VXLAN at install time. Updated the example to install the Calico CRDs first and pass a `values.yaml` that sets `calicoNetwork.bgp: Disabled` and an operator-managed VXLAN IP pool.
- The optional native routing section suggested disabling encapsulation on an IPPool. Calico's Azure documentation describes the non-overlay Azure path as Azure user-defined routes with Calico networking disabled via `CALICO_NETWORKING_BACKEND=none`. Updated the section title, explanation, and configuration snippet accordingly.
- The conclusion and architecture diagram used "native routing" terminology. Updated them to refer to Azure user-defined routes to match Calico's documented Azure guidance.

## Review Notes
The Azure CLI commands for NIC IP forwarding, NSG rule creation, and route creation use current documented flags. The NSG rule assumes the NSG does not already allow intra-subnet UDP 4789 traffic through broader rules.
