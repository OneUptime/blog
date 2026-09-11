# Fix Azure SQL Private Endpoint DNS Returning a Public IP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Private Endpoint, DNS, Networking, Troubleshooting

Description: Trace Azure SQL private endpoint DNS through private zones, VNet links, and VPN conditional forwarding so clients resolve the intended private address.

---

Creating an Azure SQL private endpoint does not make every client resolve the server to its private address. A VM in one virtual network might connect privately while a laptop on the company VPN still receives a public IP. The difference is usually the DNS resolution path, not the SQL connection string.

Keep the application hostname as `orders-prod.database.windows.net`. Repair how that hostname resolves from the affected network. Replacing it with a raw IP or `orders-prod.privatelink.database.windows.net` is not the supported Azure SQL login configuration.

## Establish the expected answer

Find the private endpoint in the Azure portal and record its approved connection state, associated SQL server, network interface, and private IP. Also inspect its DNS configuration and private DNS zone group.

For Azure SQL Database in Azure public cloud, the private DNS zone is `privatelink.database.windows.net`. A record for `orders-prod` should point to the private endpoint's address. Microsoft's [private endpoint DNS table](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns) identifies both this private zone and `database.windows.net` as the public namespace to forward.

Do not guess the endpoint IP from a subnet diagram. An old record can resolve privately while targeting a deleted endpoint. Compare the record with the current network interface.

```bash
az network private-dns record-set a show \
  --resource-group rg-dns \
  --zone-name privatelink.database.windows.net \
  --name orders-prod \
  --output json

az network private-dns link vnet list \
  --resource-group rg-dns \
  --zone-name privatelink.database.windows.net \
  --output table
```

Use the resource group that owns the zone; it can differ from the database and endpoint resource groups.

## Compare the actual DNS paths

From the failing laptop, query the SQL hostname through its normal resolver and then through the intended corporate resolver:

```bash
nslookup orders-prod.database.windows.net
nslookup orders-prod.database.windows.net 10.20.0.10
```

Here `10.20.0.10` represents your corporate DNS server. Record the server that answered, the alias chain, and the final address. Repeat from a VM in the Azure network that is known to resolve the endpoint correctly.

A successful Azure VM lookup narrows the investigation but does not prove the VPN path is configured. A VPN route to the SQL subnet does not automatically change the laptop's DNS servers or conditional forwarding rules.

On Windows, inspect the active DNS configuration:

```powershell
Get-DnsClientServerAddress -AddressFamily IPv4
Resolve-DnsName orders-prod.database.windows.net
```

Check the active VPN profile and any name-resolution policy. On macOS, `scutil --dns` shows scoped resolvers; a browser using encrypted DNS can also behave differently from a command-line client. Diagnose the resolver used by the SQL application itself.

## Link the private zone to the resolution network

For clients using Azure-provided DNS directly, the private zone must be linked to their virtual network. VNet peering provides network connectivity but does not make private DNS zone links transitive.

For a hub resolver, link the zone to the resolver's virtual network. Queries forwarded into that resolver need access to the private zone from that resolution context. Review Microsoft's [DNS integration scenarios](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration) before deciding that every spoke needs an identical DNS appliance.

If the zone and record already exist, add only the missing link or zone-group association through the infrastructure configuration that owns them. Creating a second independent private zone with the same name can leave different networks answering from different records.

Do not create an empty private `database.windows.net` zone as a shortcut. That can override public resolution for unrelated SQL servers. Use the documented private zone and a deliberate conditional forwarding rule.

## Forward VPN queries into Azure

A common hybrid design is:

```text
VPN client
  -> corporate DNS
  -> conditional forwarder for database.windows.net
  -> Azure DNS Private Resolver inbound endpoint
  -> linked privatelink.database.windows.net zone
  -> private endpoint address
```

An Azure-hosted DNS forwarder is another supported design. The key is that the on-premises resolver forwards to a reachable private IP inside Azure, where the private zone can be resolved.

Do not point an on-premises forwarder directly at `168.63.129.16`. That Azure platform DNS address is not a DNS endpoint reachable from the office over a VPN. Use the Private Resolver inbound endpoint or your Azure DNS forwarder instead.

On a Windows DNS server, an example conditional forwarder is:

```powershell
Add-DnsServerConditionalForwarderZone `
  -Name 'database.windows.net' `
  -MasterServers 10.30.2.4
```

Replace `10.30.2.4` with the actual inbound endpoint. Inspect and update an existing forwarder instead of adding a conflicting one. If directory replication of DNS configuration is required, apply the organization's appropriate replication settings.

Allow both UDP and TCP DNS traffic on port 53 along that path. Query the inbound endpoint directly from the corporate resolver to distinguish forwarding configuration from transport failure. A recursive forwarding loop can cause timeouts even when every DNS service is individually healthy.

## Clear stale answers and test SQL

After fixing the authoritative path, allow cached records to expire or clear the affected client cache:

```powershell
Clear-DnsClientCache
Resolve-DnsName orders-prod.database.windows.net
Test-NetConnection orders-prod.database.windows.net -Port 1433
```

Confirm that the final address matches the current private endpoint. Reconnect the VPN if the profile's DNS configuration changed and requires a new session. Restart or recycle an application only if it retains its own stale resolution or connection state.

Then connect with the ordinary SQL hostname, target database, encryption enabled, and certificate validation enabled. TCP success establishes the initial network path; SQL authentication and any Redirect policy requirements still need a real database connection test.

## Conclusion

Fix public-IP resolution by tracing the client's resolver, private zone record, VNet link, and hybrid forwarder. Keep the SQL hostname stable and verify both the DNS answer and an authenticated query from the network that originally failed.

## Official Documentation

- [Private endpoint DNS zone values](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Private endpoint DNS integration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration)
- [DNS for on-premises and Azure](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/dns-for-on-premises-and-azure-resources)
- [Hybrid Private Resolver troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/azure/dns/troubleshoot-azure-dns-private-resolver-hybrid-resolution-failure)
- [Azure SQL private endpoint connectivity](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql)
