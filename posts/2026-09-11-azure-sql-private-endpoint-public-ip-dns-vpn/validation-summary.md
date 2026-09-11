# Validation Summary: Fix Azure SQL Private Endpoint DNS Returning a Public IP

## Status

validated

## Post Type

Technical troubleshooting guide with Azure CLI, DNS lookup, and Windows PowerShell examples.

## Technologies Covered

- Azure SQL Database and Azure Private Link/private endpoints
- Azure Private DNS zones, zone groups, and virtual network links
- Azure DNS Private Resolver and hybrid VPN DNS forwarding
- Azure CLI and Windows DNS Server PowerShell
- Windows DNS client policies, macOS DNS routing, and browser DNS over HTTPS
- SQL hostname validation, encrypted connections, and TCP connectivity

## Sources Consulted

- [Azure Private Endpoint DNS zone values](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns): SQL private zone and public forwarding namespace.
- [Private endpoint DNS integration scenarios](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration): VNet links, peering, shared zones, Azure-hosted forwarders, and Private Resolver.
- [DNS for on-premises and Azure](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/dns-for-on-premises-and-azure-resources): centralized hybrid DNS architecture.
- [Hybrid Private Resolver troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/azure/dns/troubleshoot-azure-dns-private-resolver-hybrid-resolution-failure): inbound endpoints, transport checks, forwarding loops, and the Azure-only platform DNS address.
- [Azure SQL private endpoint connectivity](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql): endpoint approval/IP inspection, required SQL hostname, port 1433 testing, encryption, and Redirect requirements.
- [Azure CLI private DNS A record commands](https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/a?view=azure-cli-latest): `show`, record name, zone, resource group, and output flags.
- [Azure CLI private DNS VNet link commands](https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet?view=azure-cli-latest): `list` and its parameters.
- [Add-DnsServerConditionalForwarderZone](https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverconditionalforwarderzone?view=windowsserver2025-ps): zone name, master server addresses, and optional directory replication.
- [Get-DnsClientServerAddress](https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps): IPv4 address-family filtering.
- [Resolve-DnsName](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps): hostname queries and parameter syntax.
- [Clear-DnsClientCache](https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache?view=windowsserver2025-ps): clearing the local DNS client cache.
- [Test-NetConnection](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps): TCP port testing.
- [nslookup command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup): default and explicitly selected DNS servers.
- [Microsoft Networking Blog: Resolve-DnsName vs. nslookup](https://techcommunity.microsoft.com/blog/networkingblog/resolve-dnsname-vs-nslookup-in-windows/4483858): Windows NRPT behavior.
- Local macOS `scutil(8)` and `nslookup(1)` manual pages, inspected using `man scutil` and `man nslookup`: DNS configuration reporting and the explicit warning about bypassing native macOS resolution/routing.
- [Mozilla Firefox DNS over HTTPS](https://support.mozilla.org/en-US/kb/firefox-dns-over-https): browser resolution can bypass local DNS policies.
- [Author profile](https://github.com/nawazdhandala): verified the author link resolves to the intended profile.

## Issues Found

- The introduction to the `nslookup` examples described the first query as using the laptop's normal resolver. That is misleading for this VPN scenario: Windows NRPT and macOS native DNS routing can select a different resolution path for applications. Changed the wording to identify the default DNS server selected by `nslookup` and added a short clarification directing readers to the existing Windows `Resolve-DnsName` check and application verification. The lookup commands themselves remain valid and unchanged.

## Review Notes

- Confirmed the public-cloud SQL zone `privatelink.database.windows.net`, forwarding namespace `database.windows.net`, and requirement to connect using the ordinary SQL server FQDN.
- Confirmed that private DNS links do not propagate through VNet peering and that hybrid queries must reach a resolver with the appropriate zone resolution context. The warning against forwarding from on-premises directly to `168.63.129.16` is correct.
- All Azure CLI and PowerShell examples use documented commands and parameters; no deprecated command usage was found. Bash continuations and PowerShell backtick continuations were inspected.
- The Windows DNS Server example creates a non-AD-integrated forwarder by default. The existing replication caveat correctly leaves AD replication settings to the deployment.
- Port 1433 testing only proves initial TCP connectivity. The post correctly requires a real database connection and accounts for Redirect policy requirements.
- Examples assume IPv4, Azure public cloud, appropriate permissions, installed tools, and replacement of illustrative resource names/IP addresses. Managed Instance and sovereign-cloud DNS namespaces are outside this guide's stated scope.
- All five official documentation links and the author link resolved to the intended resources.
- Validation was based on official documentation and local manual pages. No Azure deployment, corporate VPN, Windows DNS server, or SQL credentials were supplied, so live end-to-end network and database tests were not performed.
