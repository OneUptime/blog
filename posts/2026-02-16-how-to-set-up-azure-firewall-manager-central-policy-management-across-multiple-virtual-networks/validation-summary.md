# Validation Summary: How to Set Up Azure Firewall Manager Central Policy Mgmt Across Multi Virtual

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Firewall Manager
- Azure Firewall
- Azure Firewall Policy
- Azure CLI
- Hub-and-spoke virtual networking
- User Defined Routes
- DNAT rules
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft Learn: Azure Firewall Manager policy overview - https://learn.microsoft.com/en-us/azure/firewall-manager/policy-overview
- Microsoft Learn: Azure Firewall rule processing logic - https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Microsoft Learn: Azure Firewall Manager deployment overview - https://learn.microsoft.com/en-us/azure/firewall-manager/deployment-overview
- Microsoft Learn: Azure CLI `az network firewall policy` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy
- Microsoft Learn: Azure CLI `az network firewall policy rule-collection-group collection` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn: Azure CLI `az network firewall` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: FQDN tags overview for Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/fqdn-tags
- Microsoft Learn: Monitor Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall

## Issues Found
- The child policy example created the West US child policy in `westus2` while inheriting from a base policy in `eastus`. Microsoft documents that parent and child firewall policies must reside in the same region, even though the policy can be associated with firewalls in other regions. Changed the child policy location to `eastus` and added a short note explaining the constraint.
- The policy update guidance said child policy rules could override base policy rules by using higher priorities. Azure Firewall policy inheritance gives parent rule collection groups precedence over child rule collection groups regardless of child priority. Reworded the guidance to warn that broad base policy rules can block child policy customization.
- The DNAT example used `--collection-priority 50`, but Azure Firewall policy rule collection priorities are documented as starting at 100. Changed the DNAT collection priority to `120`.
- The Azure Monitor rule was described as Azure management plane traffic required for Azure services to function. That description was too broad for an `AzureMonitor` service-tag rule, so it now describes the rule as allowing outbound Azure Monitor traffic.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages instead of local `az --help` output. Some referenced CLI rule collection commands are still marked Preview in the Azure CLI reference, but the parameters used by the post match the documented command surface.
