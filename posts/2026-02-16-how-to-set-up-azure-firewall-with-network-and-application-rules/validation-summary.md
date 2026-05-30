# Validation Summary: How to Set Up Azure Firewall with Network and Application Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure CLI
- Azure Virtual Network and subnets
- User-defined routes
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- Microsoft Learn: Deploy and configure Azure Firewall using Azure CLI: https://learn.microsoft.com/en-us/azure/firewall/deploy-cli
- Microsoft Learn: Deploy and configure Azure Firewall using the Azure portal: https://learn.microsoft.com/en-us/azure/firewall/tutorial-firewall-deploy-portal
- Microsoft Learn: Azure Firewall FAQ: https://learn.microsoft.com/en-us/azure/firewall/firewall-faq
- Microsoft Learn: Configure Azure Firewall rules: https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Microsoft Learn: Azure CLI reference for Azure Firewall: https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: Azure CLI reference for Azure Firewall Policy: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy
- Microsoft Learn: Azure CLI reference for Azure Firewall Policy rule collection groups: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group
- Microsoft Learn: Azure CLI reference for Azure Firewall Policy rule collections: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn: Azure CLI reference for Azure Firewall Policy collection rules: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection/rule
- Microsoft Learn: Monitor Azure Firewall: https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Microsoft Learn: Supported log categories for Microsoft.Network/azureFirewalls: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-azurefirewalls-logs

## Issues Found
- The Step 3 explanation said Azure Firewall uses policies to organize rules, which implied policies are the only rule model. Changed this to say Azure Firewall can use Firewall Policy, matching Microsoft documentation that supports both classic rules and Firewall Policy.
- The Step 4 command comment said the network rule collection allowed DNS and NTP, but the command only allowed destination port 53. Changed the comment to say it allows DNS.
- The DNAT section did not mention that application rules are not applied to inbound connections. Added a short caveat so readers do not expect inbound HTTP/S filtering through application rules.
- The rule-processing section omitted the priority of threat intelligence-based filtering when enabled. Added a short note that threat intelligence can block traffic before configured network and application rules.
- The rule-processing diagram labeled all traffic as incoming traffic, which was misleading because application rules are not applied to inbound connections. Changed the diagram entry label to "Traffic."

## Review Notes
Azure CLI is not installed in this workspace, so commands were checked against official Microsoft Learn CLI references rather than executed locally. Several Azure Firewall Policy CLI commands used in the post are provided by the `azure-firewall` Azure CLI extension and are marked as extension/preview commands in the current CLI reference.
