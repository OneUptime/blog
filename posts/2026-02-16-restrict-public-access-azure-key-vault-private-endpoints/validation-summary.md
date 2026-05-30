# Validation Summary: How to Restrict Public Access to Azure Key Vault Using Private Endpoints

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Key Vault
- Azure Private Endpoint
- Azure Private Link
- Azure Private DNS
- Azure CLI
- Azure RBAC
- Azure Monitor diagnostic settings
- .NET Azure SDK (`Azure.Identity`, `Azure.Security.KeyVault.Secrets`)

## Sources Consulted
- Microsoft Learn: Integrate Key Vault with Azure Private Link - https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service
- Microsoft Learn: Configure network security for Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/network-security
- Microsoft Learn: Diagnose private links configuration issues on Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-diagnostics
- Microsoft Learn: What is a private endpoint? - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure CLI `az keyvault` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Azure CLI `az network private-endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Manage network policies for private endpoints - https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy

## Issues Found
- The post said private endpoints mean "no public endpoint." Azure keeps the public DNS/data-plane name resolvable by design, while public data-plane access can be disabled. Updated the wording to say public data-plane requests are refused unless they arrive through an allowed private path.
- The data exfiltration prevention claim was too broad. A private endpoint for one vault does not by itself stop a compromised VM from calling another public Key Vault if public egress is allowed. Updated the claim to make egress controls explicit.
- The post said NSG rules and VNet flow logs could be used generally for Key Vault private endpoint traffic. Current Azure documentation says private endpoint network policies must be enabled for NSG/route-table controls, and NSG flow logs have limitations for inbound private endpoint traffic. Updated the networking-control statement to refer to private endpoint network policies and Key Vault diagnostic logs.
- The subnet section said `--disable-private-endpoint-network-policies true` is required. Current Azure documentation describes private endpoint network policies as configurable, with policies disabled by default. Updated the explanation to describe what the flag does and when policies should be enabled.
- The post referenced `ForbiddenByPolicy` for blocked Key Vault access. Microsoft troubleshooting documentation commonly identifies these failures as 403 responses with `ForbiddenByFirewall` or a public-network-access-disabled message. Updated the verification and troubleshooting text accordingly.
- The monitoring section said private endpoint logs should show only `10.x.x.x` addresses. VNets can use other private RFC 1918 ranges, and the exact range depends on the configured VNet. Updated the wording to say private addresses from the VNet address space, such as `10.x.x.x`.

## Review Notes
The Azure CLI commands and DNS zone names were otherwise consistent with current Microsoft documentation. The local environment did not have Azure CLI installed, so command validation was performed against current Microsoft Learn CLI references rather than local `az --help` output.
