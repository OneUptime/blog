# Validation Summary: How to Configure Azure Firewall with IP Groups for Rule Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall IP Groups
- Azure CLI
- ARM templates
- Bash scripting

## Sources Consulted
- Microsoft Learn: IP Groups in Azure Firewall: https://learn.microsoft.com/en-us/azure/firewall/ip-groups
- Microsoft Learn: Create IP Groups in Azure Firewall: https://learn.microsoft.com/en-us/azure/firewall/create-ip-group
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Microsoft Learn: az network ip-group: https://learn.microsoft.com/en-us/cli/azure/network/ip-group?view=azure-cli-latest
- Microsoft Learn: az network firewall policy: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy?view=azure-cli-latest
- Microsoft Learn: az network firewall policy rule-collection-group collection: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection?view=azure-cli-latest
- Microsoft Learn: az network firewall policy rule-collection-group collection rule: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection/rule?view=azure-cli-latest
- Microsoft Learn: Microsoft.Network/ipGroups ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2023-04-01/ipgroups

## Issues Found
- The post stated that a single firewall policy can reference up to 200 unique IP Groups. Microsoft Learn currently lists the limit as 600 unique IP Groups per firewall policy. Updated both occurrences.
- The post used `az network ip-group update --remove ipAddresses 10.0.1.4` to remove an IP address by value. Azure CLI generic `--remove` removes a property or a list element by index, not by matching a scalar value. Replaced the example with a valid `--ip-addresses` replacement-list update.
- The post described the replacement operation as atomic with no partial-update window. The CLI sends the full replacement list in one update request, but Microsoft documents that IP Group changes still have propagation behavior. Reworded this to avoid overstating enforcement timing.
- The post stated that IP Groups must be in the same subscription as the firewall policy. Microsoft documents that IP Groups can be reused across regions and subscriptions. Updated the consideration accordingly.

## Review Notes
- Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI reference pages.
- Some Azure Firewall policy rule collection CLI commands used in the examples are marked Preview in the Azure CLI reference, but their parameters match the documented command syntax.
