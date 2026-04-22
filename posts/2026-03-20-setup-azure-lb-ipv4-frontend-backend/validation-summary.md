# Validation Summary: How to Set Up Azure Load Balancer with IPv4 Frontend and Backend Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Load Balancer
- Azure Standard Load Balancer SKU
- Azure public IPv4 addresses
- Azure backend pools
- Azure Load Balancer health probes
- Azure Load Balancer rules and outbound rules
- Azure Network Security Groups
- Azure CLI
- Azure Virtual Machines and network interfaces

## Sources Consulted
- Azure Load Balancer SKUs: https://learn.microsoft.com/en-us/azure/load-balancer/skus
- Quickstart: Create a public load balancer using Azure CLI: https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-public-cli
- Troubleshoot Azure Load Balancer, Standard external load balancer inbound connectivity: https://learn.microsoft.com/en-us/troubleshoot/azure/load-balancer/load-balancer-troubleshoot
- Azure Load Balancer outbound rules: https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Source Network Address Translation for Azure Load Balancer outbound connections: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections
- Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Azure CLI reference for `az network lb`: https://learn.microsoft.com/en-us/cli/azure/network/lb
- Azure CLI reference for `az network lb rule`: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Azure CLI reference for `az network lb outbound-rule`: https://learn.microsoft.com/en-us/cli/azure/network/lb/outbound-rule
- Azure CLI reference for `az network lb frontend-ip`: https://learn.microsoft.com/en-us/cli/azure/network/lb/frontend-ip
- Azure CLI reference for `az network lb probe`: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Azure CLI reference for `az network public-ip`: https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Azure CLI reference for `az network vnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Azure CLI reference for `az network nic`: https://learn.microsoft.com/en-us/cli/azure/network/nic
- Azure CLI reference for `az network nsg` and `az network nsg rule`: https://learn.microsoft.com/en-us/cli/azure/network/nsg
- Azure CLI reference for `az vm`: https://learn.microsoft.com/en-us/cli/azure/vm

## Issues Found
- The introduction said Standard SKU supports HA ports without noting the scope. Microsoft documents HA ports as available for internal Standard Load Balancers, so the text now says "HA ports for internal load balancers."
- The VNet example used older singular flag names for address prefixes. Updated `--address-prefix` and `--subnet-prefix` to the current documented `--address-prefixes` and `--subnet-prefixes`.
- The backend VM NICs were not associated with a network security group. Standard Load Balancer and Standard public IP inbound traffic is closed unless an NSG explicitly allows it, so the post now creates an NSG, allows inbound TCP 80 and 443, and attaches the NSG to each NIC.
- The load-balancing rules left implicit outbound SNAT enabled even though the post later creates an explicit outbound rule. Added `--disable-outbound-snat true` to the HTTP and HTTPS rules to align with Azure outbound rule guidance.
- The HTTPS rule did not enable TCP reset even though the conclusion recommends TCP reset for idle cleanup. Added `--enable-tcp-reset true` to the HTTPS TCP rule.
- The outbound rule command used `--backend-pool-name`, which is not a valid parameter for `az network lb outbound-rule create`. Changed it to the documented `--address-pool backend-pool` parameter.
- The conclusion overstated the resources required for every Standard Load Balancer and omitted the NSG requirement for inbound Standard Load Balancer traffic. Updated it to describe an inbound traffic setup and mention the NSG.

## Review Notes
The load balancer infrastructure commands are now aligned with current Microsoft documentation. The backend VMs still need an application or web server that listens on the configured ports and returns a successful response from `/health`; otherwise the HTTP health probe will mark them unhealthy.
