# How to Configure Azure Key Vault Firewall Rules and Virtual Network Service Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Key Vault, Firewall, Virtual Network, Service Endpoints, Network Security, Secrets Management

Description: A practical guide to locking down Azure Key Vault access using firewall rules, VNet service endpoints, and private endpoints for defense-in-depth network security.

---

Azure Key Vault stores your most sensitive data - encryption keys, secrets, and certificates. By default, it is accessible from any network that can reach its public endpoint. While RBAC and access policies control who can access the vault, adding network-level restrictions provides defense in depth. Even if credentials are compromised, an attacker outside your network perimeter cannot reach the vault.

This guide covers configuring Key Vault firewall rules, virtual network service endpoints, and the interaction between these controls.

## Understanding Key Vault Network Security Options

Key Vault offers three network security mechanisms:

**Firewall rules (IP-based):** Allow access from specific public IP addresses or CIDR ranges. Useful for on-premises networks and known developer IPs.

**Virtual network service endpoints:** Allow access from specific subnets in your Azure virtual networks. Traffic stays on the Azure backbone.

**Private endpoints:** Give the Key Vault a private IP address in your VNet. The most secure option, but requires DNS configuration. Covered briefly here since it is a topic on its own.

These are not mutually exclusive. You can combine all three for a layered approach.

## Prerequisites

- An Azure Key Vault (Standard or Premium tier)
- A virtual network with at least one subnet
- Key Vault Administrator or Contributor role
- Understanding of which applications and users need access to the vault

## Step 1: Enable Service Endpoints on Your Subnet

Before you can add a VNet rule to Key Vault, the subnet must have the Microsoft.KeyVault service endpoint enabled.

```bash
# Enable the Key Vault service endpoint on a subnet
az network vnet subnet update \
  --name myAppSubnet \
  --vnet-name myVNet \
  --resource-group myResourceGroup \
  --service-endpoints Microsoft.KeyVault

# Verify the service endpoint is enabled
az network vnet subnet show \
  --name myAppSubnet \
  --vnet-name myVNet \
  --resource-group myResourceGroup \
  --query "serviceEndpoints[?service=='Microsoft.KeyVault']" \
  --output table
```

## Step 2: Configure Key Vault Firewall and VNet Rules

Now configure the Key Vault to only accept traffic from your subnet and any specific IP addresses:

```bash
# Set the default action to Deny (block all traffic not explicitly allowed)
# This is the critical step - without this, the firewall rules have no effect
az keyvault update \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --default-action Deny

# Add a virtual network rule for your application subnet
az keyvault network-rule add \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet myAppSubnet

# Add an IP rule for your office network
az keyvault network-rule add \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --ip-address 203.0.113.0/24

# Add another IP rule for a developer's home IP
az keyvault network-rule add \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --ip-address 198.51.100.42/32
```

After setting the default action to Deny, only traffic from the allowed VNets and IP ranges can reach the vault. Everything else gets a 403 Forbidden response.

## Step 3: Allow Trusted Azure Services

Some Azure services need to access Key Vault but do not come from your VNet. For example:

- Azure Backup needs to access key vault for encryption keys
- Azure Disk Encryption needs certificate access
- Azure Resource Manager needs access for template deployments
- Azure App Service and Azure Functions using Key Vault references

Enable the "Allow trusted Microsoft services to bypass this firewall" setting:

```bash
# Allow trusted Azure services to bypass the firewall
az keyvault update \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --bypass AzureServices
```

This does not open the vault to all Azure traffic. It only allows specific first-party Microsoft services that are on the trusted services list. The full list is documented by Microsoft and includes services like Azure Backup, Azure Disk Encryption, Azure SQL, Azure Data Factory, and others.

If you do not enable this bypass and you use Key Vault references in App Service, your app will fail to read secrets at startup.

## Step 4: Verify the Configuration

Check the current network rules:

```bash
# Show the current network ACLs on the Key Vault
az keyvault show \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --query "properties.networkAcls" \
  --output json
```

The output should look something like:

```json
{
  "bypass": "AzureServices",
  "defaultAction": "Deny",
  "ipRules": [
    {"value": "203.0.113.0/24"},
    {"value": "198.51.100.42/32"}
  ],
  "virtualNetworkRules": [
    {
      "id": "/subscriptions/.../subnets/myAppSubnet",
      "ignoreMissingVnetServiceEndpoint": false
    }
  ]
}
```

## Step 5: Test Access from Allowed and Denied Locations

Test from a machine in the allowed subnet:

```bash
# From a VM in myAppSubnet, this should work
az keyvault secret list --vault-name myKeyVault --output table
```

Test from a machine outside the allowed network:

```bash
# From a machine with a non-allowed IP, this should fail with 403
az keyvault secret list --vault-name myKeyVault --output table
# Expected error: Client address is not authorized and caller is not a trusted service.
```

## Handling the "Locked Out" Scenario

A common mistake is setting the default action to Deny without adding your own IP to the allow list first. If this happens, even you as the admin cannot access the vault from the portal or CLI.

Recovery options:

1. **Azure Portal still works:** The portal accesses Key Vault through the Azure Resource Manager, which can bypass the firewall if "Allow trusted Microsoft services" is enabled. You can modify the firewall rules from the portal.

2. **Use a VM in an allowed subnet:** If you have a VM in one of the allowed subnets, connect to it and manage the vault from there.

3. **Use Azure Resource Manager to update network rules:** Even if you cannot access the vault's data plane, you can still modify the vault's management plane properties (including network rules) through ARM.

```bash
# Even when locked out of the data plane, you can update network rules
# This works because it is an ARM operation, not a data plane operation
az keyvault network-rule add \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --ip-address "your-current-ip/32"
```

## Configuring with Bicep

For infrastructure as code, define the network rules in your Bicep template:

```bicep
// Key Vault with firewall and VNet rules
param location string = resourceGroup().location
param vnetSubnetId string
param allowedIpRanges array = ['203.0.113.0/24']

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'myKeyVault'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    // Enable RBAC authorization (recommended over access policies)
    enableRbacAuthorization: true
    networkAcls: {
      // Block all traffic by default
      defaultAction: 'Deny'
      // Allow trusted Azure services
      bypass: 'AzureServices'
      // Virtual network rules
      virtualNetworkRules: [
        {
          id: vnetSubnetId
          ignoreMissingVnetServiceEndpoint: false
        }
      ]
      // IP-based firewall rules
      ipRules: [for ip in allowedIpRanges: {
        value: ip
      }]
    }
  }
}
```

## Service Endpoints vs Private Endpoints

Both options restrict network access, but they work differently:

| Feature | Service Endpoints | Private Endpoints |
|---|---|---|
| Traffic path | Azure backbone (optimized route) | Through private IP in your VNet |
| DNS resolution | Still resolves to public IP | Resolves to private IP |
| On-premises access | Requires ExpressRoute/VPN + IP rules | Requires ExpressRoute/VPN + DNS forwarding |
| Cross-region | Not supported | Supported |
| Cost | Free | Per-hour and per-GB charge |

For most scenarios, service endpoints are sufficient and simpler. Use private endpoints when:

- You need cross-region access
- You want DNS-based isolation (vault resolves to a private IP)
- You need to access the vault from on-premises without IP-based rules
- Compliance requires no public endpoint at all

## Monitoring Access Attempts

Enable Key Vault diagnostic logging to see who is accessing the vault and who is being blocked:

```bash
# Enable diagnostic logging for Key Vault
az monitor diagnostic-settings create \
  --name "kv-audit-logs" \
  --resource "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myKeyVault" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

Query the audit logs to find blocked requests:

```
// Find Key Vault requests blocked by firewall
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where ResultSignature == "Forbidden"
| where TimeGenerated > ago(24h)
| project
    TimeGenerated,
    CallerIPAddress,
    OperationName,
    ResultSignature,
    ResultDescription
| order by TimeGenerated desc
```

This helps you identify:

- Legitimate services that need to be added to the allow list
- Unauthorized access attempts from unknown IPs
- Misconfigurations in your application deployments

## Automating IP Updates for Dynamic Environments

If your allowed IPs change frequently (for example, developer IPs on DHCP), you can script periodic updates:

```bash
# Script to update Key Vault firewall with current public IP
# Useful for developers who work from home with dynamic IPs
CURRENT_IP=$(curl -s https://ifconfig.me)

# Remove old rules (be careful with this in shared environments)
# Add the current IP
az keyvault network-rule add \
  --name myKeyVault \
  --resource-group myResourceGroup \
  --ip-address "$CURRENT_IP/32"

echo "Added $CURRENT_IP to Key Vault firewall rules"
```

## Best Practices

- Always enable the firewall (set default action to Deny). An open Key Vault is a liability even with strong RBAC.
- Enable "Allow trusted Azure services" unless you have a specific reason not to. Many Azure services depend on this bypass.
- Use service endpoints for Azure-to-Azure communication and IP rules for on-premises and developer access.
- Monitor the diagnostic logs regularly to catch blocked legitimate requests early.
- Document which IPs and subnets are allowed and why. IP-based rules without documentation become maintenance nightmares.
- Test firewall changes in a non-production vault first. Locking yourself out of a production vault during business hours is not a good experience.

## Summary

Azure Key Vault firewall rules and VNet service endpoints add a critical network security layer to your secrets management. Set the default action to Deny, add VNet rules for your application subnets, add IP rules for admin access, enable the trusted services bypass, and monitor the audit logs. Combined with RBAC, this gives you a defense-in-depth approach where both identity and network controls must be satisfied to access your secrets.
