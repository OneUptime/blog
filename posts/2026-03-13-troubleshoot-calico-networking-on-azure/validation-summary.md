# Validation Summary: Troubleshoot Calico Networking on Azure

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Azure Virtual Network
- Azure Network Security Groups
- Azure route tables and user-defined routes
- Azure CLI
- kubectl
- calicoctl
- VXLAN

## Sources Consulted
- Microsoft Learn: Create, change, or delete Azure network interfaces - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Microsoft Learn: Azure virtual network traffic routing - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Microsoft Learn: Azure network security groups overview/default security rules - https://learn.microsoft.com/en-us/azure/architecture/networking/guide/network-level-segmentation
- Microsoft Learn: az network nsg rule command reference - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn: Route network traffic with a route table - https://learn.microsoft.com/en-us/azure/virtual-network/tutorial-create-route-table
- Microsoft Learn: Azure Instance Metadata Service - https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
- Calico documentation: Azure - https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: System requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Configure IP autodetection - https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: BlockAffinity resource - https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl logs - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction said NSGs block all unlisted traffic. Azure NSGs include default VirtualNetwork allow rules, although custom rules can override them. Updated the wording to describe default source/destination validation and custom NSG rule behavior accurately.
- The native routing section described the symptom as "all modes except VXLAN configured." Azure blocks IP-in-IP, and Calico documents VXLAN as the supported overlay mode on Azure. Updated the symptom to specifically describe VXLAN disabled with Azure UDR/native routing configured.
- The command `calicoctl ipam show --show-blocks | grep worker-2` does not reliably show the node that owns each block in current documented output. Replaced it with a Kubernetes query against Calico BlockAffinity resources, which include node and CIDR fields.
- The Felix CrashLoopBackOff section listed Azure IMDS interference as a common Felix failure. IMDS is a VM-local metadata endpoint and not a Felix requirement. Replaced that bullet with the Azure-relevant node IP autodetection failure mode.
- The DNS section advised allowing UDP 53 in the NSG. CoreDNS failures inside the cluster are usually pod/service networking, network policy, or node firewall issues rather than an Azure NSG port 53 issue. Updated the guidance to check cross-node traffic first and then UDP/TCP 53 policy/firewall blocks.

## Review Notes
The Azure CLI examples use current command groups and flags according to Microsoft Learn. Calico VXLAN on UDP 4789, Azure IP forwarding requirements for routed traffic, Calico IP autodetection settings, and kubectl command forms were verified against official documentation. The Azure CLI was not installed in the local environment, so CLI syntax was checked against Microsoft Learn rather than local `az --help` output.
