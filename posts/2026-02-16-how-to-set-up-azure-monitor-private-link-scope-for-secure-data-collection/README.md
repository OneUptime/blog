# How to Set Up Azure Monitor Private Link Scope for Secure Data Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, Private Link, Security, Networking, Data Collection, Azure Cloud, Network Security

Description: Step-by-step guide to configuring Azure Monitor Private Link Scope to route monitoring data over private connections instead of the public internet.

---

By default, Azure Monitor agents and SDKs send telemetry data over the public internet. The data is encrypted with TLS, so it is secure in transit, but the traffic still traverses public networks. For organizations with strict security requirements - government workloads, financial services, healthcare, or anyone with a "no public internet" policy - this is not acceptable.

Azure Monitor Private Link Scope (AMPLS) solves this by routing supported monitoring traffic through Azure Private Link. Your agents connect to private endpoints in your VNet, and the traffic stays on the Microsoft backbone network instead of traversing the public internet.

## What AMPLS Covers

AMPLS secures the data path for multiple Azure Monitor services:

- **Log Analytics workspaces**: Log ingestion and query data
- **Application Insights**: Telemetry ingestion and live metrics
- **Data Collection Endpoints**: Custom log ingestion through DCR-based collection
- **Azure Monitor metrics**: Prometheus metrics ingestion through Azure Monitor workspace and DCE scenarios. Custom metrics sent from Azure Monitor Agent are not currently configurable over private link.

Each AMPLS resource can be associated with up to 3,000 Log Analytics workspaces, up to 10,000 Application Insights components, and up to 10 private endpoints. A virtual network can connect to only one AMPLS.

## How It Works

The architecture involves several components:

```mermaid
graph LR
    A[Azure Monitor Agent] --> B[Private DNS Zone]
    B --> C[Private Endpoint]
    C --> D[Azure Monitor Private Link Scope]
    D --> E[Log Analytics Workspace]
    D --> F[Application Insights]
    D --> G[Data Collection Endpoint]
```

1. The Azure Monitor Agent resolves Azure Monitor endpoints through private DNS
2. Private DNS zones map Azure Monitor hostnames to private IP addresses in your VNet
3. The private endpoint provides a network interface in your VNet that connects to AMPLS
4. AMPLS routes the traffic to the associated Azure Monitor resources

## Step 1: Create the Azure Monitor Private Link Scope

```bash
# Create an Azure Monitor Private Link Scope

az monitor private-link-scope create \
  --name myAMPLS \
  --resource-group myRG
```

AMPLS is a global resource, meaning it does not have a specific region. However, the private endpoints you connect to it are regional.

## Step 2: Associate Azure Monitor Resources

Link your Log Analytics workspace and Application Insights resources to the AMPLS:

```bash
# Associate a Log Analytics workspace with the AMPLS
az monitor private-link-scope scoped-resource create \
  --name "workspace-link" \
  --resource-group myRG \
  --scope-name myAMPLS \
  --linked-resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace"

# Associate an Application Insights resource
az monitor private-link-scope scoped-resource create \
  --name "appinsights-link" \
  --resource-group myRG \
  --scope-name myAMPLS \
  --linked-resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Insights/components/myAppInsights"
```

If you use Data Collection Endpoints (DCEs), associate those too:

```bash
# Associate a Data Collection Endpoint
az monitor private-link-scope scoped-resource create \
  --name "dce-link" \
  --resource-group myRG \
  --scope-name myAMPLS \
  --linked-resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Insights/dataCollectionEndpoints/myDCE"
```

## Step 3: Create the Private Endpoint

Create a private endpoint in your VNet that connects to the AMPLS:

```bash
# Create a private endpoint for the AMPLS in your VNet
az network private-endpoint create \
  --name ampls-private-endpoint \
  --resource-group myRG \
  --vnet-name myVNet \
  --subnet monitoring-subnet \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Insights/privateLinkScopes/myAMPLS" \
  --group-id azuremonitor \
  --connection-name ampls-connection \
  --location eastus
```

The private endpoint gets a private IP address from the subnet you specify. Traffic to the supported Azure Monitor endpoints that are resolved through private DNS will be routed through this private endpoint.

## Step 4: Configure Private DNS Zones

For the private endpoint to work, DNS queries for Azure Monitor endpoints must resolve to the private IP address instead of the public IP. This requires private DNS zones.

Create the required DNS zones:

```bash
# Create private DNS zones for Azure Monitor endpoints
az network private-dns zone create \
  --resource-group myRG \
  --name privatelink.monitor.azure.com

az network private-dns zone create \
  --resource-group myRG \
  --name privatelink.oms.opinsights.azure.com

az network private-dns zone create \
  --resource-group myRG \
  --name privatelink.ods.opinsights.azure.com

az network private-dns zone create \
  --resource-group myRG \
  --name privatelink.agentsvc.azure-automation.net

az network private-dns zone create \
  --resource-group myRG \
  --name privatelink.blob.core.windows.net
```

Link the DNS zones to your VNet:

```bash
# Link each DNS zone to the VNet
for zone in privatelink.monitor.azure.com \
            privatelink.oms.opinsights.azure.com \
            privatelink.ods.opinsights.azure.com \
            privatelink.agentsvc.azure-automation.net \
            privatelink.blob.core.windows.net; do
  az network private-dns zone vnet-link create \
    --resource-group myRG \
    --zone-name $zone \
    --name "${zone}-link" \
    --virtual-network myVNet \
    --registration-enabled false
done
```

Create DNS records for the private endpoint:

```bash
# Create DNS zone group to auto-register DNS records for the first zone
az network private-endpoint dns-zone-group create \
  --resource-group myRG \
  --endpoint-name ampls-private-endpoint \
  --name default \
  --private-dns-zone "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Network/privateDnsZones/privatelink.monitor.azure.com" \
  --zone-name monitor

# Add the remaining Azure Monitor private DNS zones to the same group
az network private-endpoint dns-zone-group add \
  --resource-group myRG \
  --endpoint-name ampls-private-endpoint \
  --name default \
  --private-dns-zone "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Network/privateDnsZones/privatelink.oms.opinsights.azure.com" \
  --zone-name oms

az network private-endpoint dns-zone-group add \
  --resource-group myRG \
  --endpoint-name ampls-private-endpoint \
  --name default \
  --private-dns-zone "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Network/privateDnsZones/privatelink.ods.opinsights.azure.com" \
  --zone-name ods

az network private-endpoint dns-zone-group add \
  --resource-group myRG \
  --endpoint-name ampls-private-endpoint \
  --name default \
  --private-dns-zone "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Network/privateDnsZones/privatelink.agentsvc.azure-automation.net" \
  --zone-name agentsvc

az network private-endpoint dns-zone-group add \
  --resource-group myRG \
  --endpoint-name ampls-private-endpoint \
  --name default \
  --private-dns-zone "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net" \
  --zone-name blob
```

## Step 5: Configure the Access Mode

AMPLS supports two access modes that control how resources handle public traffic:

**Private Only**: Networks connected to this AMPLS can reach only Azure Monitor resources in the AMPLS through private link. To block public ingestion and queries to the resources themselves, also configure the linked Azure Monitor resources to deny public network access.

**Open**: Networks connected to the AMPLS can reach Azure Monitor resources in the AMPLS through private link and can still reach resources outside the AMPLS if those resources allow public network access. This is the default and is easier to roll out incrementally.

```bash
# Set the access mode to Private Only for maximum security
az monitor private-link-scope update \
  --name myAMPLS \
  --resource-group myRG \
  --set accessModeSettings.ingestionAccessMode=PrivateOnly \
  --set accessModeSettings.queryAccessMode=PrivateOnly
```

Be careful with Private Only mode - it can block access to Azure Monitor resources that are not in the AMPLS for any network sharing the same DNS. Switch to Private Only only after confirming all required Azure Monitor resources are in the AMPLS and all agents have network connectivity through the private endpoint.

## Step 6: Configure Agents to Use the Private Endpoint

**Azure Monitor Agent (AMA)**: If AMA runs on VMs within the VNet (or connected VNets), it automatically uses the private endpoint because of the DNS resolution. No agent configuration change is needed.

**On-premises servers via VPN/ExpressRoute**: Ensure that DNS queries from on-premises resolve Azure Monitor endpoints to the private IP. This typically requires:

1. A DNS forwarder in Azure that forwards private DNS zone queries
2. On-premises DNS configured to forward Azure Monitor domain queries to the Azure DNS forwarder

```bash
# Verify DNS resolution from a VM in the VNet
nslookup myworkspace.ods.opinsights.azure.com
# Should return a private IP (e.g., 10.0.5.4) instead of a public IP
```

If the resolution still returns a public IP, the DNS configuration is not correct.

**Application Insights SDK**: Applications running in the VNet automatically use the private endpoint. Set the connection string as usual - the DNS resolution handles routing.

## Step 7: Validate the Setup

Verify that data is flowing through the private endpoint:

```bash
# Check the private endpoint connection status
az network private-endpoint show \
  --name ampls-private-endpoint \
  --resource-group myRG \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status"
```

This should return "Approved."

From a VM in the VNet, verify DNS resolution:

```bash
# Test DNS resolution for Log Analytics endpoint
nslookup myworkspace.ods.opinsights.azure.com

# Expected: resolves to a private IP like 10.0.x.x
# Not expected: resolves to a public IP like 13.x.x.x
```

Check that the agent is sending data by querying recent heartbeats:

```kql
// Verify agents are sending data through private link
Heartbeat
| where TimeGenerated > ago(15m)
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| order by LastHeartbeat desc
```

## Step 8: Handle Multi-Region Deployments

If you have isolated VNets in multiple Azure regions, create a private endpoint in each network that needs private access to the AMPLS. In hub-and-spoke or peered networks that share DNS and routing, a single private endpoint in the hub is typically preferred to avoid DNS record conflicts.

```bash
# Create a private endpoint in a second region
az network private-endpoint create \
  --name ampls-private-endpoint-westus \
  --resource-group myRG \
  --vnet-name myVNet-westus \
  --subnet monitoring-subnet \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Insights/privateLinkScopes/myAMPLS" \
  --group-id azuremonitor \
  --connection-name ampls-connection-westus \
  --location westus2
```

Set up the same DNS zones and links for the west US VNet.

## Common Issues and Troubleshooting

**Agent cannot send data after enabling Private Only mode**: The agent is trying to reach Azure Monitor through a public endpoint, but public access is now blocked. Check DNS resolution from the agent's machine.

**Queries fail in the portal**: If you set query access to Private Only, the browser or client running the query must be on a network that can resolve and reach the private endpoint. Some Azure portal experiences and Resource Manager API-based queries cannot use Azure Monitor private links and require the target resource to allow public queries. Consider keeping query access mode as Open until you confirm the portal experiences you need still work.

**Private DNS zones not resolving correctly**: Ensure the VNet link is created for each DNS zone. Also verify there are no custom DNS settings on the VNet that override the private DNS zones.

**Reaching AMPLS limits**: A single AMPLS supports up to 3,000 Log Analytics workspaces, up to 10,000 Application Insights components, and up to 10 private endpoints. For large or isolated deployments, create multiple AMPLS resources and keep DNS boundaries separate to avoid endpoint record conflicts.

## Security Benefits

With AMPLS configured, your monitoring data flow has these security properties:

- Supported Azure Monitor traffic stays on the Microsoft backbone network
- Supported monitoring traffic does not traverse the public internet
- You can use NSG rules to control which subnets can reach the private endpoint
- Network flow logs show all monitoring traffic through the private endpoint
- Compliant with regulatory requirements for private data handling

## Cost Considerations

Private endpoints incur hourly charges and data processing charges:

- Private endpoint: approximately $0.01/hour per endpoint
- Data processed: approximately $0.01/GB through the endpoint

For most monitoring workloads, the additional cost is minimal compared to the security benefit.

## Summary

Azure Monitor Private Link Scope lets you keep supported monitoring traffic on private network paths, meeting strict security and compliance requirements. The setup involves creating an AMPLS resource, associating your Azure Monitor resources, deploying a private endpoint in your VNet, and configuring DNS. Start with Open access mode for a gradual rollout, validate that agents are routing through the private endpoint, and switch to Private Only mode when you are confident everything is working. The result is monitoring with the same functionality but without supported monitoring traffic touching the public internet.
