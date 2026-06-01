# Validation Summary: How to Create Inbound NAT Rules on Azure Load Balancer for RDP Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Load Balancer
- Azure CLI
- Azure inbound NAT rules
- Azure Virtual Machines and VM Scale Sets
- Network Security Groups
- RDP and SSH port forwarding
- Azure Bastion

## Sources Consulted
- Microsoft Learn: Inbound NAT rules - Azure Load Balancer: https://learn.microsoft.com/en-us/azure/load-balancer/inbound-nat-rules
- Microsoft Learn: Manage inbound NAT rules for Azure Load Balancer: https://learn.microsoft.com/en-us/azure/load-balancer/manage-inbound-nat-rules
- Microsoft Learn: Azure CLI `az network lb inbound-nat-rule`: https://learn.microsoft.com/en-us/cli/azure/network/lb/inbound-nat-rule
- Microsoft Learn: Azure CLI `az network nic ip-config inbound-nat-rule`: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/inbound-nat-rule
- Microsoft Learn: Azure CLI `az network public-ip`: https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn: Azure CLI `az vm`: https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI `az network nsg rule`: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule

## Issues Found
- The post described the NSG rule as allowing RDP traffic "from the load balancer." For inbound NAT, the relevant security restriction is the original admin source IP range to the VM's backend RDP port. Updated the Step 5 wording and troubleshooting note accordingly.
- The VM Scale Sets section recommended inbound NAT pools. Microsoft now recommends inbound NAT rule V2 for Standard Load Balancer deployments targeting multiple virtual machines or VMSS, and inbound NAT pools are retiring. Updated the section to use `az network lb inbound-nat-rule create` with `--backend-pool-name`, `--frontend-port-range-start`, and `--frontend-port-range-end`.
- The explanation that NAT rules are always one-to-one was too broad because inbound NAT rule V2 can target a backend pool. Narrowed that statement to single-VM NAT rules.

## Review Notes
The Azure CLI command shapes for creating the public IP, load balancer, single-VM inbound NAT rules, NIC NAT-rule associations, NSG rule, and verification commands match current Microsoft CLI reference syntax. The local environment did not have Azure CLI installed, so command validation was performed against official Microsoft Learn documentation rather than local `az --help`.
