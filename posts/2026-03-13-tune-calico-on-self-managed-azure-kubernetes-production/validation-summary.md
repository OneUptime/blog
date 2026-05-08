# Validation Summary: Tune Calico on Self-Managed Azure Kubernetes for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source v3.x
- Kubernetes networking and IPAM
- Calico IPPool and FelixConfiguration resources
- Azure Virtual Network
- Azure Virtual Machines and Accelerated Networking
- Azure Network Security Groups
- Azure CLI

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Azure VM MTU documentation: https://learn.microsoft.com/en-us/azure/virtual-network/how-to-virtual-machine-mtu
- Azure Accelerated Networking overview: https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview
- Azure CLI network NIC documentation: https://learn.microsoft.com/en-us/cli/azure/network/nic
- Azure CLI NSG rule documentation: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post stated that Accelerated Networking can change Azure VM MTU expectations. I clarified that Accelerated Networking enables SR-IOV for lower latency and higher throughput, while MTU remains a separate setting that defaults to 1500 unless larger MTUs are explicitly configured and tested on supported paths.
- The Calico MTU command patched `vethMTU`, which is not the current FelixConfiguration field for VXLAN tunnel MTU. I changed it to `vxlanMTU` and clarified that 1450 is the IPv4 VXLAN value for a 1500-byte underlay.
- The VXLAN section implied Azure simply does not support BGP-based pod routing. I narrowed this to the accurate claim that Azure VNets do not automatically learn Calico pod CIDRs through BGP and that direct routing needs additional Azure route table or appliance configuration.
- The IPAM availability zone section claimed that zone-specific pools minimize cross-zone traffic. I corrected this to state that zone-specific pools help align pod address ranges with topology for operations, route planning, and observability, while workload placement requires Kubernetes scheduling and topology controls.
- The Felix tuning section tied Azure NSGs to Felix iptables management. I changed the explanation to focus on host firewall or iptables managers, which are the relevant systems that can interfere with Felix's iptables programming.
- The Felix patch used `reportingInterval`, which is not the current Calico Open Source FelixConfiguration field for usage reporting. I changed it to `usageReportingEnabled: false`.
- The Azure NSG examples used the singular `--source-address-prefix` form. I changed them to the current documented Azure CLI parameter `--source-address-prefixes`.
- The best-practice bullet said Azure VNets handle UDP better than IPIP. I changed it to the more precise Calico-documented rationale that VXLAN is supported in environments where IPIP is not, including Azure.

## Review Notes
The post remains a practical VXLAN-based guide. Calico documentation recommends avoiding encapsulation where the underlay can route workload IPs and recommends cross-subnet encapsulation in some environments to reduce overhead; the post's VXLAN Always example is still valid for simple self-managed Azure deployments where the VNet is not configured to route pod CIDRs directly.
