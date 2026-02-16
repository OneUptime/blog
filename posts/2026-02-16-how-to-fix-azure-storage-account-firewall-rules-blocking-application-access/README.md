# How to Fix Azure Storage Account Firewall Rules Blocking Application Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage Account, Firewall, Networking, Troubleshooting, Security, VNet

Description: Fix Azure Storage Account firewall rules that block application access with solutions for VNet integration, private endpoints, and trusted services.

---

You enable the firewall on your Azure Storage Account for security, and suddenly your application cannot read or write blobs. Requests fail with 403 Forbidden errors or timeout. The storage account works fine from the Azure portal, but your application is locked out.

This is one of the most common networking issues in Azure. Storage account firewalls are powerful security controls, but they need to be configured carefully to allow legitimate traffic while blocking everything else.

## Understanding Storage Account Network Rules

By default, Azure Storage Accounts accept connections from all networks. When you enable the firewall (change the default action to "Deny"), only explicitly allowed sources can access the storage account.

There are several ways to allow access:

- Virtual network rules (allow traffic from specific subnets)
- IP rules (allow traffic from specific public IP addresses)
- Private endpoints (allow traffic over a private network connection)
- Resource instance rules (allow specific Azure resource instances)
- Trusted Microsoft services exception

```bash
# Check the current network rules on a storage account
az storage account show \
  --resource-group my-rg \
  --name mystorageaccount \
  --query "networkRuleSet" \
  --output json
```

If the output shows `"defaultAction": "Deny"`, the firewall is active and only explicitly allowed traffic gets through.

## Scenario 1: Azure App Service Cannot Access Storage

App Services run on shared infrastructure, and their outbound IP addresses can change. Adding specific IPs to the storage firewall is fragile.

### Solution: Use VNet Integration + Service Endpoints

The reliable fix is to integrate your App Service with a Virtual Network and use service endpoints.

```bash
# Step 1: Enable VNet integration on your App Service
az webapp vnet-integration add \
  --resource-group my-rg \
  --name my-web-app \
  --vnet my-vnet \
  --subnet app-subnet

# Step 2: Enable the Microsoft.Storage service endpoint on the subnet
az network vnet subnet update \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --name app-subnet \
  --service-endpoints Microsoft.Storage

# Step 3: Add the subnet to the storage account firewall rules
az storage account network-rule add \
  --resource-group my-rg \
  --account-name mystorageaccount \
  --vnet-name my-vnet \
  --subnet app-subnet
```

After this, traffic from your App Service flows through the VNet and is recognized by the storage firewall as coming from an allowed subnet.

### Solution: Use Private Endpoints

Private endpoints are the more modern approach. They create a network interface in your VNet with a private IP address that connects to the storage account.

```bash
# Create a private endpoint for the blob service
az network private-endpoint create \
  --resource-group my-rg \
  --name storage-pe \
  --vnet-name my-vnet \
  --subnet pe-subnet \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --group-id blob \
  --connection-name storage-blob-connection

# Create a private DNS zone for blob storage
az network private-dns zone create \
  --resource-group my-rg \
  --name privatelink.blob.core.windows.net

# Link the DNS zone to your VNet
az network private-dns zone vnet-link create \
  --resource-group my-rg \
  --zone-name privatelink.blob.core.windows.net \
  --name vnet-link \
  --virtual-network my-vnet \
  --registration-enabled false

# Create a DNS record for the private endpoint
az network private-endpoint dns-zone-group create \
  --resource-group my-rg \
  --endpoint-name storage-pe \
  --name default \
  --private-dns-zone privatelink.blob.core.windows.net \
  --zone-name blob
```

The DNS configuration is critical. Your application resolves `mystorageaccount.blob.core.windows.net` to the private IP address instead of the public IP. Without correct DNS, the private endpoint will not work.

## Scenario 2: Azure Functions Cannot Access Storage

Azure Functions need access to a storage account for their runtime (host files, triggers, etc.). If you lock down that storage account, the function app itself stops working.

### Solution: Allow the Function App's VNet

```bash
# Enable VNet integration on the Function App
az functionapp vnet-integration add \
  --resource-group my-rg \
  --name my-function-app \
  --vnet my-vnet \
  --subnet func-subnet

# Route all outbound traffic through the VNet
az functionapp config appsettings set \
  --resource-group my-rg \
  --name my-function-app \
  --settings "WEBSITE_VNET_ROUTE_ALL=1"

# Add the subnet to the storage firewall rules
az network vnet subnet update \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --name func-subnet \
  --service-endpoints Microsoft.Storage

az storage account network-rule add \
  --resource-group my-rg \
  --account-name mystorageaccount \
  --vnet-name my-vnet \
  --subnet func-subnet
```

The `WEBSITE_VNET_ROUTE_ALL=1` setting is important. Without it, the Function App only routes RFC 1918 traffic through the VNet. Storage account traffic goes over the public network and gets blocked by the firewall.

## Scenario 3: Local Development Machine Blocked

When developing locally, your machine's IP address is not in the storage firewall. You get 403 errors running your application from your laptop.

### Solution: Add Your IP Address

```bash
# Get your current public IP
curl -s https://api.ipify.org

# Add it to the storage account firewall
az storage account network-rule add \
  --resource-group my-rg \
  --account-name mystorageaccount \
  --ip-address <your-ip>
```

This works but is fragile - your IP might change if you are on a dynamic address. For teams, consider adding the office's IP range.

A better approach for development is to use Azure Storage Emulator (Azurite) locally:

```bash
# Run Azurite locally for development
npm install -g azurite
azurite --silent --location ./azurite-data
```

Then configure your application to use the local emulator connection string in development.

## Scenario 4: Other Azure Services Blocked

Some Azure services access storage accounts as part of their operation: Azure Monitor for diagnostic logs, Azure Backup, Azure Event Grid, and others.

### Solution: Enable Trusted Microsoft Services Exception

```bash
# Allow trusted Microsoft services to bypass the firewall
az storage account update \
  --resource-group my-rg \
  --name mystorageaccount \
  --bypass AzureServices
```

This setting allows a specific list of Microsoft first-party services to access the storage account even when the firewall is active. The list includes:

- Azure Backup
- Azure Site Recovery
- Azure DevTest Labs
- Azure Event Grid
- Azure Event Hubs
- Azure Networking (including Azure Monitor)
- Azure Log Analytics
- Azure Synapse Analytics
- Azure SQL Data Warehouse

Check the Microsoft documentation for the complete current list.

## Scenario 5: AKS Pods Cannot Access Storage

AKS pods need to access storage for persistent volumes, application data, or configuration. When the storage firewall is enabled, pods may lose connectivity.

### Solution: Authorize the AKS Subnet

```bash
# Enable service endpoint on the AKS subnet
az network vnet subnet update \
  --resource-group aks-rg \
  --vnet-name aks-vnet \
  --name aks-subnet \
  --service-endpoints Microsoft.Storage

# Add the subnet to the storage firewall
az storage account network-rule add \
  --resource-group my-rg \
  --account-name mystorageaccount \
  --vnet-name aks-vnet \
  --subnet aks-subnet \
  --resource-group-for-vnet aks-rg
```

Note the `--resource-group-for-vnet` parameter, which is needed when the VNet is in a different resource group than the storage account.

## Diagnosing Firewall Issues

When you are not sure if the firewall is causing the problem, here are diagnostic steps:

```bash
# Step 1: Check the current network rules
az storage account show \
  --resource-group my-rg \
  --name mystorageaccount \
  --query "{DefaultAction:networkRuleSet.defaultAction, VNetRules:networkRuleSet.virtualNetworkRules, IPRules:networkRuleSet.ipRules, Bypass:networkRuleSet.bypass}" \
  --output json

# Step 2: Temporarily set default action to Allow to confirm it is a firewall issue
az storage account update \
  --resource-group my-rg \
  --name mystorageaccount \
  --default-action Allow

# Step 3: Test your application - if it works now, the firewall was the issue

# Step 4: Re-enable the firewall
az storage account update \
  --resource-group my-rg \
  --name mystorageaccount \
  --default-action Deny
```

Check Azure Storage analytics logs for denied requests:

```bash
# Enable storage logging to see denied requests
az storage logging update \
  --account-name mystorageaccount \
  --log rwd \
  --retention 7 \
  --services b \
  --version 2.0
```

The logs will show which requests were denied and the source IP, which helps you identify what needs to be allowed.

## Common Gotchas

A few things that trip people up:

- **Service endpoints take a few minutes to activate.** After enabling them, wait 5-10 minutes before testing.
- **Private endpoint DNS must be configured correctly.** If your application resolves the storage FQDN to the public IP instead of the private IP, the connection bypasses the private endpoint and hits the firewall.
- **The Azure portal always works.** Microsoft's own portal IP ranges are always allowed, which can mislead you into thinking the firewall is not active.
- **Storage account firewall rules apply to all services** (blobs, files, queues, tables). You cannot have different firewall rules for different services on the same account.
- **Cross-subscription VNet rules are supported** but require the subnet to be in the same Azure AD tenant.

Getting storage account firewalls right requires understanding your application's network path. Trace the traffic from source to destination, make sure every hop is authorized, and verify DNS resolution when using private endpoints. Once you have the network rules in place, your storage account is significantly more secure without disrupting legitimate access.
