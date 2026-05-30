# Validation Summary: How to Set Up Azure Monitor Private Link Scope for Secure Data Collection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Monitor Private Link Scope (AMPLS)
- Azure Private Link and private endpoints
- Azure Monitor Agent
- Log Analytics workspaces
- Application Insights
- Data Collection Endpoints and Data Collection Rules
- Azure Private DNS
- Azure CLI
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Configure private link for Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/private-link-configure
- Microsoft Learn: Design Azure Monitor private link configuration - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/private-link-design
- Microsoft Learn: Use Azure Private Link to connect networks to Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/private-link-security
- Microsoft Learn: Enable private link for monitoring virtual machines and Kubernetes clusters in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-private-link
- Microsoft Learn: Azure CLI `az monitor private-link-scope` reference - https://learn.microsoft.com/en-gb/cli/azure/monitor/private-link-scope?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest

## Issues Found
- The post said AMPLS routes all monitoring data and that no data leaves the private network. Updated the wording to "supported monitoring traffic" and clarified that traffic stays on the Microsoft backbone rather than traversing the public internet.
- The post listed Azure Monitor custom metrics ingestion as generally covered by AMPLS. Updated this to describe supported Prometheus metrics/DCE scenarios and note that custom metrics sent from Azure Monitor Agent are not currently configurable over private link.
- The post stated a 50-resource AMPLS association limit. Updated this to the current documented limits: up to 3,000 Log Analytics workspaces, 10,000 Application Insights components, and 10 private endpoints, plus the one-AMPLS-per-virtual-network constraint.
- The `az monitor private-link-scope create` example used `--location global`, which is not part of the current Azure CLI command reference. Removed that flag.
- The private endpoint description said all Azure Monitor traffic is routed through the private endpoint. Narrowed this to supported Azure Monitor endpoints resolved through private DNS.
- The DNS zone group example created records only for `privatelink.monitor.azure.com` despite listing several required private DNS zones. Added `az network private-endpoint dns-zone-group add` commands for the remaining Azure Monitor private DNS zones.
- The access mode explanation treated AMPLS access modes as resource-level public network access controls. Updated it to reflect that AMPLS Open/Private Only modes control what connected networks can reach, while linked resources also need public network access settings to block public ingestion and queries.
- The multi-region guidance said every region needs its own private endpoint. Updated this to account for hub-and-spoke or peered networks, where a single hub private endpoint is typically preferred to avoid DNS record conflicts.
- The portal troubleshooting note said Azure Portal queries run from Microsoft's infrastructure outside the VNet. Replaced it with the documented behavior: the client must be able to resolve and reach the private endpoint, and Resource Manager API-based query experiences cannot use Azure Monitor private links.

## Review Notes
Azure CLI was not installed in the local environment, so CLI verification was performed against the official Microsoft Learn Azure CLI command reference instead of local `az --help` output.
