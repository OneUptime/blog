# Validation Summary: How to Fix 'Network Security Group' Rule Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Network Security Groups
- Azure Network Watcher
- Azure CLI
- Azure service tags
- Azure Application Security Groups
- Terraform AzureRM provider
- Kusto Query Language

## Sources Consulted
- Microsoft Learn: Azure network security groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Microsoft Learn: How Network Security Groups filter network traffic - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Microsoft Learn: az network nsg rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Microsoft Learn: az network watcher flow-log CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log
- Microsoft Learn: NSG flow logs overview - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Microsoft Learn: Manage virtual network flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage
- Microsoft Learn: IP Flow Verify overview - https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview
- Microsoft Learn: Application Security Groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/application-security-groups
- Terraform Registry: azurerm_network_security_group - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group

## Issues Found
- The post said every rule in an NSG must have a unique priority. Azure requires priority uniqueness within the same direction, and custom priorities must be between 100 and 4096. Updated the wording and tightened the example query to consider inbound rules.
- The priority-selection shell example could produce an invalid priority when no inbound rules existed or when the next value exceeded 4096. Added a default starting point and an upper-bound check.
- The post recommended creating NSG flow logs. Microsoft states that new NSG flow logs cannot be created after June 30, 2025 and that NSG flow logs retire on September 30, 2027. Updated the example and references to use virtual network flow logs.
- The ASG section only mentioned region matching. Added the official same-virtual-network constraint for network interfaces assigned to ASGs.
- The best-practice section said to use IP Flow Verify before deploying. IP Flow Verify checks currently configured effective rules for a VM, so the wording now says to test after changes.

## Review Notes
The Azure CLI and Terraform binaries were not installed in the local environment, so commands and configuration were validated against official Microsoft Learn and Terraform Registry documentation instead of local `--help` output.
