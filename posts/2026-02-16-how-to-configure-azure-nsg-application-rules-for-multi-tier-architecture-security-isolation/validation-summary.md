# Validation Summary: How to Configure Azure NSG App Rules for Multi-Tier Architecture Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Network Security Groups
- Azure Virtual Network and subnets
- Azure CLI
- Azure Network Watcher IP flow verify
- Azure virtual network flow logs
- Azure service tags
- Application Security Groups

## Sources Consulted
- Microsoft Learn: Azure network security groups overview and default rules: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/network-level-segmentation
- Microsoft Learn: How network security groups filter network traffic: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Microsoft Learn: Azure CLI `az network nsg rule`: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network watcher test-ip-flow`: https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network watcher flow-log`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log?view=azure-cli-latest
- Microsoft Learn: Manage virtual network flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage
- Microsoft Learn: NSG flow logs overview and retirement notice: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-nsg-flow-logging-overview
- Microsoft Learn: Migrate from NSG flow logs to virtual network flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-migrate

## Issues Found
- The post said the rules started from a deny-all baseline, but Azure NSGs include default allow rules for VirtualNetwork traffic and outbound internet access. I changed the wording to explain that the configuration overrides Azure defaults where needed.
- The web tier section claimed it blocked everything except internet HTTP/HTTPS inbound and app-tier outbound traffic, but the original rules still allowed default VNet inbound and other outbound traffic. I added explicit inbound and outbound deny rules so the commands match the claim.
- The application tier section claimed the tier could only send traffic to the database tier, but the original rules still allowed default outbound internet and other VNet destinations. I added explicit outbound deny rules after the allowed database flow.
- The database tier section only denied outbound internet traffic, leaving other default outbound VNet traffic available. I changed it to deny all initiated outbound traffic from the database tier while relying on NSG statefulness for response packets.
- The NSG flow log command was outdated for a new deployment in 2026. Microsoft states that new NSG flow logs cannot be created after June 30, 2025 and recommends virtual network flow logs. I updated the section and command to use virtual network flow logs.

## Review Notes
Azure CLI was not installed in the local review environment, so command validation was performed against current Microsoft Learn Azure CLI reference documentation instead of local `az --help` output.
