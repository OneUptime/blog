# How to Restrict Public Access to Azure Key Vault Using Private Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Key Vault, Private Endpoints, Private Link, Security, Networking, Secrets Management

Description: Secure Azure Key Vault by configuring private endpoints to restrict access from public networks and keep secret retrieval within your virtual network.

---

Azure Key Vault stores your most sensitive data - encryption keys, certificates, API keys, connection strings, and passwords. By default, Key Vault is accessible over the public internet. While access policies and RBAC protect against unauthorized retrieval, the fact that the service endpoint is publicly reachable creates an attack surface that security-conscious organizations want to eliminate.

Private endpoints let you bring Key Vault into your virtual network with a private IP address. Traffic between your applications and Key Vault stays on the Azure backbone network, and you can disable public access entirely. In this guide, I will walk through the complete setup.

## Why Private Endpoints for Key Vault?

There are several reasons to put Key Vault behind a private endpoint:

- **Reduced attack surface**: No public endpoint means no public-facing target for attackers.
- **Data exfiltration prevention**: Even if an attacker compromises a VM, they cannot send secrets to an external Key Vault because the traffic would need to go through the public internet, which you can block.
- **Compliance**: Many regulatory frameworks (PCI DSS, HIPAA, SOC 2) require that sensitive data access happens over private networks.
- **Network-level control**: You can apply NSG rules and monitor traffic to Key Vault using VNet flow logs.

## Step 1: Create the Key Vault

If you already have a Key Vault, skip to Step 2.

```bash
# Create a resource group
az group create \
  --name rg-keyvault \
  --location eastus

# Create a Key Vault
az keyvault create \
  --resource-group rg-keyvault \
  --name kv-myapp-secrets \
  --location eastus \
  --sku Standard \
  --enable-rbac-authorization true
```

The `--enable-rbac-authorization true` flag uses Azure RBAC for access control instead of access policies. RBAC is the recommended approach for new deployments.

## Step 2: Prepare the Virtual Network

Create a VNet with a subnet dedicated to private endpoints.

```bash
# Create a VNet for your application
az network vnet create \
  --resource-group rg-keyvault \
  --name vnet-app \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-app \
  --subnet-prefix 10.0.1.0/24

# Create a subnet for private endpoints
az network vnet subnet create \
  --resource-group rg-keyvault \
  --vnet-name vnet-app \
  --name snet-private-endpoints \
  --address-prefix 10.0.2.0/24 \
  --disable-private-endpoint-network-policies true
```

The `--disable-private-endpoint-network-policies true` setting is required for the subnet to host private endpoints.

## Step 3: Create the Private Endpoint

Create a private endpoint for the Key Vault.

```bash
# Get the Key Vault resource ID
KV_ID=$(az keyvault show \
  --resource-group rg-keyvault \
  --name kv-myapp-secrets \
  --query id \
  --output tsv)

# Create the private endpoint
az network private-endpoint create \
  --resource-group rg-keyvault \
  --name pe-keyvault \
  --vnet-name vnet-app \
  --subnet snet-private-endpoints \
  --private-connection-resource-id $KV_ID \
  --group-id vault \
  --connection-name connection-keyvault
```

The `--group-id vault` specifies that we want to connect to the vault's data plane endpoint. This is the standard sub-resource for Key Vault private endpoints.

## Step 4: Configure Private DNS

For the private endpoint to work transparently, DNS needs to resolve the Key Vault hostname to the private IP instead of the public IP.

```bash
# Create a private DNS zone for Key Vault
az network private-dns zone create \
  --resource-group rg-keyvault \
  --name "privatelink.vaultcore.azure.net"

# Link the DNS zone to your VNet
az network private-dns link vnet create \
  --resource-group rg-keyvault \
  --zone-name "privatelink.vaultcore.azure.net" \
  --name link-vnet-app \
  --virtual-network vnet-app \
  --registration-enabled false

# Create a DNS zone group for automatic record management
az network private-endpoint dns-zone-group create \
  --resource-group rg-keyvault \
  --endpoint-name pe-keyvault \
  --name zonegroupname \
  --private-dns-zone "privatelink.vaultcore.azure.net" \
  --zone-name keyvault
```

After this, VMs in the linked VNet resolve `kv-myapp-secrets.vault.azure.net` to the private IP (something like 10.0.2.4) instead of the public IP.

## Step 5: Disable Public Network Access

With the private endpoint in place, disable public access to the Key Vault.

```bash
# Disable public network access entirely
az keyvault update \
  --resource-group rg-keyvault \
  --name kv-myapp-secrets \
  --public-network-access Disabled
```

After this change, any attempt to access the Key Vault from outside the VNet will fail with a "ForbiddenByPolicy" error.

## Step 6: Verify the Setup

Verify that the private endpoint is working correctly.

```bash
# Check the private endpoint connection status
az network private-endpoint show \
  --resource-group rg-keyvault \
  --name pe-keyvault \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" \
  --output tsv
# Expected: Approved

# Get the private IP assigned to the endpoint
az network private-endpoint show \
  --resource-group rg-keyvault \
  --name pe-keyvault \
  --query "customDnsConfigs[0].ipAddresses[0]" \
  --output tsv
```

From a VM in the VNet, verify DNS resolution and access.

```bash
# Verify DNS resolution points to private IP
nslookup kv-myapp-secrets.vault.azure.net

# Test secret retrieval through the private endpoint
az keyvault secret set \
  --vault-name kv-myapp-secrets \
  --name test-secret \
  --value "this-is-a-test"

az keyvault secret show \
  --vault-name kv-myapp-secrets \
  --name test-secret \
  --query value \
  --output tsv
```

## Allowing Selective Public Access

In some cases, you might need to allow public access from specific IPs while keeping the private endpoint. For example, developers might need to access Key Vault from their workstations for deployment operations.

```bash
# Allow public access only from specific IP addresses
az keyvault update \
  --resource-group rg-keyvault \
  --name kv-myapp-secrets \
  --public-network-access Enabled

# Add network rules to allow specific IPs
az keyvault network-rule add \
  --resource-group rg-keyvault \
  --name kv-myapp-secrets \
  --ip-address 203.0.113.50/32

# Set the default action to deny (only allowed IPs and private endpoints can connect)
az keyvault update \
  --resource-group rg-keyvault \
  --name kv-myapp-secrets \
  --default-action Deny
```

This configuration allows traffic from the private endpoint and from the specific IP address 203.0.113.50. All other public traffic is denied.

## Connecting from Multiple VNets

If your applications span multiple VNets, you have two options:

### Option A: Create a Private Endpoint in Each VNet

```bash
# Create a private endpoint in a second VNet
az network private-endpoint create \
  --resource-group rg-keyvault \
  --name pe-keyvault-vnet2 \
  --vnet-name vnet-app-2 \
  --subnet snet-private-endpoints \
  --private-connection-resource-id $KV_ID \
  --group-id vault \
  --connection-name connection-keyvault-2

# Link the private DNS zone to the second VNet
az network private-dns link vnet create \
  --resource-group rg-keyvault \
  --zone-name "privatelink.vaultcore.azure.net" \
  --name link-vnet-app-2 \
  --virtual-network vnet-app-2 \
  --registration-enabled false
```

### Option B: Use VNet Peering

If the VNets are peered, you can use a single private endpoint. Just link the private DNS zone to all peered VNets.

```bash
# Link the DNS zone to the peered VNet
az network private-dns link vnet create \
  --resource-group rg-keyvault \
  --zone-name "privatelink.vaultcore.azure.net" \
  --name link-vnet-peered \
  --virtual-network vnet-peered \
  --registration-enabled false
```

Traffic from the peered VNet reaches the private endpoint through the peering connection.

## Application Integration

Most Azure SDKs work transparently with private endpoints. Your application code stays the same - the Key Vault URI does not change. The only difference is at the network level.

Here is a .NET example showing that the SDK code is identical with or without private endpoints.

```csharp
// Key Vault client code - works identically with public or private endpoints
// The SDK resolves the Key Vault hostname, which returns the private IP
// when private DNS is configured correctly
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var client = new SecretClient(
    new Uri("https://kv-myapp-secrets.vault.azure.net"),
    new DefaultAzureCredential()
);

// Retrieve a secret - traffic goes over the private endpoint
KeyVaultSecret secret = await client.GetSecretAsync("database-connection-string");
string connectionString = secret.Value;
```

## Monitoring Private Endpoint Traffic

Enable diagnostic logging to monitor access patterns.

```bash
# Enable Key Vault diagnostic logging
az monitor diagnostic-settings create \
  --resource $(az keyvault show -g rg-keyvault -n kv-myapp-secrets --query id -o tsv) \
  --name kv-diagnostics \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]' \
  --workspace $(az monitor log-analytics workspace show \
    -g rg-monitoring -n law-main --query id -o tsv)
```

Query access logs to see which IPs are accessing Key Vault.

```
// Key Vault access patterns showing source IPs
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(24h)
| summarize AccessCount = count() by
    CallerIPAddress,
    OperationName,
    ResultType
| order by AccessCount desc
```

With private endpoints configured, you should see only private IP addresses (10.x.x.x) in the CallerIPAddress field.

## Troubleshooting

**"ForbiddenByPolicy" from VMs in the VNet**: Check DNS resolution. If the VM resolves the Key Vault hostname to a public IP instead of the private IP, the request goes to the public endpoint, which is blocked. Verify the private DNS zone link.

**"AuthorizationFailed" errors**: Private endpoints handle network-level access. You still need proper RBAC roles or access policies for the identity making the request.

**Azure DevOps or GitHub Actions cannot reach Key Vault**: CI/CD agents running outside the VNet cannot use the private endpoint. Either use self-hosted agents inside the VNet or add the agent's IP to the Key Vault firewall rules.

**Portal access blocked**: If public access is disabled, you cannot view secrets in the Azure portal unless you are on a network that routes to the private endpoint. Consider keeping a management IP in the firewall rules for portal access.

Private endpoints for Azure Key Vault provide a significant security improvement with minimal application changes. The setup takes about 30 minutes, and once configured, your secrets stay on the private network where they belong.
