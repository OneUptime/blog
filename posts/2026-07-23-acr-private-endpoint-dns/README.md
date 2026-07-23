# ACR Private Endpoint DNS: Fixing 403, NXDOMAIN, and Data Endpoint Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Private Link, DNS, Networking, Troubleshooting

Description: Build and troubleshoot the complete private DNS path for ACR's login, regional data, and optional geo-replica endpoints.

---

An ACR private endpoint is not complete when the network interface gets a private IP. Clients continue to use the registry's normal `azurecr.io` hostname, and DNS must steer that hostname—and every layer data endpoint—to the private endpoint. A missing record can produce `NXDOMAIN`; public resolution with public access disabled can produce 403; and a missing regional data record can let login succeed while image layers time out.

Private Link for ACR requires the Premium SKU. It exposes the registry over private IPs and automatically enables dedicated data endpoints. Public access is a separate switch and should be disabled only after the private route and DNS records have been tested from every client network.

## Map the Endpoint Surfaces

An ACR client can touch several hostnames:

| Endpoint | Purpose | Private endpoint IP use |
| --- | --- | --- |
| Registry/global login server | token exchange, manifests, tags, registry API, blob uploads | one private IP |
| Dedicated data endpoint per registry region | download image layers | one private IP per geo-replica region |
| Regional endpoint per geo-replica, when enabled | direct regional registry operations | one additional private IP per replica |

Query the service rather than guessing hostnames:

```bash
ACR_NAME=contosoplatformacr

LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer --output tsv)

az acr show-endpoints \
  --name "$ACR_NAME" \
  --output table
```

Regional endpoints are currently Preview. Enabling them and using `az acr login --endpoint` requires Azure CLI 2.86.0 or later. `az acr show-endpoints` itself is GA and exists in earlier CLI releases, but use version 2.86.0 or later when working with regional endpoints.

A DNL-protected registry can have a hash in `LOGIN_SERVER`. Hand-created DNS based only on the Azure resource name can therefore be wrong. A private endpoint DNS zone group is preferable because Azure maintains the records from the private endpoint's actual FQDN configuration.

## Create the Private DNS Foundation

Set the network coordinates:

```bash
ACR_RESOURCE_GROUP=rg-platform-registry
NETWORK_RESOURCE_GROUP=rg-platform-network
VNET_NAME=vnet-platform
SUBNET_NAME=snet-private-endpoints
PRIVATE_ENDPOINT_NAME=pe-contoso-acr
DNS_ZONE_RESOURCE_GROUP=rg-platform-dns
```

Confirm Premium before proceeding:

```bash
az acr show \
  --name "$ACR_NAME" \
  --resource-group "$ACR_RESOURCE_GROUP" \
  --query sku.name --output tsv
```

Configure the private endpoint subnet as required by the current ACR private endpoint procedure:

```bash
az network vnet subnet update \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --name "$SUBNET_NAME" \
  --private-endpoint-network-policies Disabled
```

Create the ACR private zone. Use exactly `privatelink.azurecr.io`; do not create a private zone for all of `azurecr.io`:

```bash
az network private-dns zone create \
  --resource-group "$DNS_ZONE_RESOURCE_GROUP" \
  --name privatelink.azurecr.io
```

Link it to the VNet whose clients must resolve the private registry:

```bash
VNET_ID=$(az network vnet show \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --name "$VNET_NAME" \
  --query id --output tsv)

az network private-dns link vnet create \
  --resource-group "$DNS_ZONE_RESOURCE_GROUP" \
  --zone-name privatelink.azurecr.io \
  --name link-platform-acr \
  --virtual-network "$VNET_ID" \
  --registration-enabled false
```

Auto-registration is unnecessary for Private Link records; the private endpoint DNS zone group owns those records.

## Create the Private Endpoint and DNS Zone Group

Resolve the registry resource ID:

```bash
ACR_ID=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$ACR_RESOURCE_GROUP" \
  --query id --output tsv)
```

Create the endpoint against the ACR `registry` subresource:

```bash
az network private-endpoint create \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --name "$PRIVATE_ENDPOINT_NAME" \
  --vnet-name "$VNET_NAME" \
  --subnet "$SUBNET_NAME" \
  --private-connection-resource-id "$ACR_ID" \
  --group-ids registry \
  --connection-name acr-private-link
```

Attach the private zone through a DNS zone group:

```bash
PRIVATE_DNS_ZONE_ID=$(az network private-dns zone show \
  --resource-group "$DNS_ZONE_RESOURCE_GROUP" \
  --name privatelink.azurecr.io \
  --query id --output tsv)

az network private-endpoint dns-zone-group create \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --endpoint-name "$PRIVATE_ENDPOINT_NAME" \
  --name default \
  --zone-name privatelink.azurecr.io \
  --private-dns-zone "$PRIVATE_DNS_ZONE_ID"
```

The zone group is the recommended ongoing-management model: it creates and updates A records as the private endpoint configuration changes. If organizational DNS governance requires manual records, derive every FQDN and private IP from the endpoint network interface instead of copying generic examples.

## Inspect What Azure Actually Provisioned

Check the private link connection state:

```bash
az network private-endpoint show \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --name "$PRIVATE_ENDPOINT_NAME" \
  --query 'privateLinkServiceConnections[].{name:name,status:privateLinkServiceConnectionState.status,description:privateLinkServiceConnectionState.description}' \
  --output table
```

The connection must be approved. A `Pending` or `Rejected` endpoint is not usable even if its network interface exists.

Inspect the endpoint's network interface and ACR member names:

```bash
PRIVATE_ENDPOINT_NIC_ID=$(az network private-endpoint show \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --name "$PRIVATE_ENDPOINT_NAME" \
  --query 'networkInterfaces[0].id' --output tsv)

az network nic show \
  --ids "$PRIVATE_ENDPOINT_NIC_ID" \
  --query 'ipConfigurations[].{ip:privateIPAddress,member:privateLinkConnectionProperties.requiredMemberName,fqdns:privateLinkConnectionProperties.fqdns}' \
  --output json
```

Expect one member for the registry/global endpoint and one data member per replica region. If the Preview regional-endpoints feature is enabled, expect those members too.

Now verify the zone group, records, and VNet link:

```bash
az network private-endpoint dns-zone-group list \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --endpoint-name "$PRIVATE_ENDPOINT_NAME" \
  --output table

az network private-dns record-set a list \
  --resource-group "$DNS_ZONE_RESOURCE_GROUP" \
  --zone-name privatelink.azurecr.io \
  --output table

az network private-dns link vnet list \
  --resource-group "$DNS_ZONE_RESOURCE_GROUP" \
  --zone-name privatelink.azurecr.io \
  --output table
```

These three views answer different questions: is the endpoint associated with the zone, are the required A records present, and can the querying VNet see the zone?

## Test Resolution from the Client Network

Run DNS tests from a VM, self-hosted build agent, or workload that uses the same resolver and route as the failing client:

```bash
nslookup "$LOGIN_SERVER"
```

The final address must be the endpoint's private IP. The expected logical chain is the public registry name to a `privatelink.azurecr.io` name and then to a private A record. Some resolvers display the CNAME chain; others show only the final answer.

Use `az acr show-endpoints` to identify each dedicated data endpoint and resolve those from the same host:

```bash
az acr show-endpoints --name "$ACR_NAME" --output json
```

For a registry in West Europe, a dedicated endpoint resembles:

```text
<registry-login-label>.westeurope.data.azurecr.io
```

Its final DNS answer must also be one of the private endpoint's private IPs. Repeat for every geo-replica that the client can be directed to.

## Fix `NXDOMAIN`

`NXDOMAIN` means the resolver believes the name does not exist. With Private Link, the most common causes are:

1. The `privatelink.azurecr.io` zone is not linked to the querying VNet.
2. The zone is linked but has no record for the actual DNL-protected login label.
3. A custom DNS server does not forward `privatelink.azurecr.io` queries to a resolver that can see Azure Private DNS.
4. A stale negative answer remains cached after the record was created.
5. A private zone overrides a namespace but lacks the requested record.

Check the VNet's DNS configuration:

```bash
az network vnet show \
  --resource-group "$NETWORK_RESOURCE_GROUP" \
  --name "$VNET_NAME" \
  --query '{vnet:name,dnsServers:dhcpOptions.dnsServers}' \
  --output json
```

An empty `dnsServers` array means Azure-provided DNS is in use; linked private zones should be visible. If custom servers are configured, the VNet link alone is insufficient because clients query those custom servers instead.

For custom or on-premises DNS, configure a conditional forwarder for `privatelink.azurecr.io` to an Azure DNS Private Resolver inbound endpoint or a DNS forwarder inside a linked VNet. Azure's `168.63.129.16` DNS address is reachable only from within an Azure VNet; an on-premises resolver must not target it directly.

After fixing records or forwarding, clear caches according to the client operating system and resolver design, then repeat `nslookup`. Do not use a local hosts-file entry as the production fix; it cannot follow endpoint IP or geo-replica changes.

## Fix 403 When Public Access Is Disabled

A common failure sequence is:

1. the registry private endpoint exists;
2. public network access is disabled;
3. the client still resolves the registry to a public address; and
4. ACR rejects the public request with 403.

Confirm both settings:

```bash
az acr show \
  --name "$ACR_NAME" \
  --query '{publicAccess:publicNetworkAccess,defaultAction:networkRuleSet.defaultAction}' \
  --output table

nslookup "$LOGIN_SERVER"
```

If resolution is public, repair private DNS or the client network path. Re-enabling access for all public networks makes the symptom disappear but defeats the intended boundary.

If public access is intentionally set to selected networks instead, a 403 naming the client IP means that public egress address is absent from the allowlist. Decide whether that client belongs on the public allowlist or should use Private Link; do not add an unrestricted CIDR.

## Fix Login Success Followed by Layer Failure

During a pull, Docker first reaches the login/registry endpoint, then follows service-provided URLs to download layers from a dedicated data endpoint. Blob uploads during pushes stay on the global or regional login server and do not use dedicated data endpoints. With a private endpoint, dedicated data endpoints are automatically enabled, one per registry region.

If `az acr login` succeeds but `docker pull` stalls on a layer:

- resolve every data endpoint returned by `az acr show-endpoints`;
- confirm each has an A record and distinct private endpoint IP configuration;
- check HTTPS routing, NSGs, and firewalls for those private IPs and FQDNs;
- verify custom DNS forwards the data endpoint's `privatelink.azurecr.io` alias; and
- check that the private endpoint subnet has enough free addresses.

If a push stalls, troubleshoot the global or regional login endpoint instead; dedicated data endpoint DNS is not used for blob uploads.

Geo-replication increases the address and record count. A registry spanning three regions—the home region plus two added replicas—consumes one private IP for the global endpoint plus one per region for dedicated data endpoints. If regional endpoints are also enabled, it consumes one more per region. Plan that capacity for every private endpoint resource.

When a geo-replica is added, inspect the endpoint connection, NIC members, zone-group-managed records, and subnet free space again. Do not assume the original region's data record covers the replica.

## Validate Before Disabling Public Access

From a host on the intended private path:

```bash
curl --verbose "https://$LOGIN_SERVER/v2/"
```

For a registry that requires authentication, an unauthenticated HTTP 401 is expected and proves private DNS, TCP, TLS, and the registry endpoint responded. Then test authenticated manifest and layer operations:

```bash
az acr login --name "$ACR_NAME"
docker pull "$LOGIN_SERVER/orders/api:2026.07.23.1"
```

Only after all client networks pass should public access be disabled:

```bash
az acr update \
  --name "$ACR_NAME" \
  --public-network-enabled false
```

Repeat the tests after the change. Also test from an unapproved public host and confirm it cannot list, pull, or push.

Standard Microsoft-hosted Azure Pipelines agents do not have line of sight to ACR private endpoints. Use a self-hosted agent in the connected network, or a Managed DevOps Pool configured to inject agents into an existing VNet that can resolve and route to the endpoint. The same networking principle applies to any hosted runner: authentication cannot compensate for a runner that lacks a supported private-network path.

## Official Documentation

- [Connect privately to ACR with Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Configure firewall rules for Azure Container Registry endpoints](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Azure private endpoint DNS configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Troubleshoot private endpoint DNS resolution](https://learn.microsoft.com/en-us/troubleshoot/azure/private-link/troubleshoot-private-endpoint-dns-resolution)
- [Troubleshoot conditional forwarder DNS failures in Azure](https://learn.microsoft.com/en-us/troubleshoot/azure/dns/troubleshoot-azure-dns-resolution-fails-conditional-forwarder-misconfiguration)
- [Azure CLI: private endpoint DNS zone groups](https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group)
- [Configure networking for Managed DevOps Pools](https://learn.microsoft.com/en-us/azure/devops/managed-devops-pools/configure-networking?view=azure-devops)
