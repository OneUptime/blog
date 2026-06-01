# Validation Summary: How to Connect Azure Container Apps to a Virtual Network

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Azure Virtual Network
- Azure Private Link and private endpoints
- Azure Private DNS
- Azure SQL Database private endpoint connectivity
- Azure Network Security Groups
- Azure VNet peering
- Azure CLI

## Sources Consulted
- Azure Container Apps virtual network configuration: https://learn.microsoft.com/en-us/azure/container-apps/custom-virtual-networks
- Azure Container Apps VNet integration walkthrough: https://learn.microsoft.com/en-us/azure/container-apps/vnet-custom
- Azure CLI `az containerapp env create` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/env
- Azure CLI `az containerapp create` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps ingress overview: https://learn.microsoft.com/azure/container-apps/ingress-overview
- Azure Container Apps ingress configuration: https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to
- Azure Container Apps private endpoints and DNS guidance: https://learn.microsoft.com/en-us/azure/container-apps/private-endpoints-with-dns
- Azure SQL private endpoint CLI tutorial: https://learn.microsoft.com/en-us/azure/private-link/tutorial-private-endpoint-sql-cli
- Azure CLI private endpoint DNS zone group reference: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Azure Container Apps outbound routing guidance: https://learn.microsoft.com/en-us/azure/container-apps/user-defined-routes

## Issues Found
- The post stated that Azure Container Apps requires a `/23` subnet. Current Azure Container Apps workload profiles environments require `/27` or larger, while legacy Consumption-only environments require `/23` or larger. Updated the wording to explain the current default and kept the `/23` example as a scalable choice.
- The Container Apps infrastructure subnet was not delegated. For workload profiles environments, Azure requires delegation to `Microsoft.App/environments`. Added the subnet delegation command.
- The subnet examples used `--address-prefix`; current Azure CLI documentation uses `--address-prefixes` for `az network vnet subnet create`. Updated both subnet commands.
- The sample app used `--ingress internal` while the surrounding text described access from the VNet. Internal app ingress is limited to the Container Apps environment; for VNet-scope ingress in an internal-only environment, the app should use external ingress while the environment remains internal. Updated the command and explanation.
- The post said the app FQDN resolves to a private IP without configuring DNS for the Container Apps environment default domain. Added the private DNS zone, VNet link, and wildcard A record commands needed for VNet clients to resolve the internal environment FQDN.
- The Azure SQL private endpoint command used `--group-id`; Azure CLI uses `--group-ids`. Updated the flag.
- The SQL private DNS VNet link command used an outdated/non-documented command path. Updated it to `az network private-dns link vnet create`.
- The private endpoint DNS zone group command used the full DNS zone name as `--zone-name`. The CLI expects a private DNS zone config name; updated the SQL example to use `sql`, matching Microsoft guidance.
- The troubleshooting note repeated the `/23` requirement unconditionally. Updated it to refer to enough address space and the default workload profiles delegation requirement.

## Review Notes
The NSG examples are syntactically valid, but production lockdown generally needs a more complete outbound design with required Azure service tags/FQDNs or Azure Firewall/UDR rules. The post now keeps the warning to start permissive and tighten gradually.
