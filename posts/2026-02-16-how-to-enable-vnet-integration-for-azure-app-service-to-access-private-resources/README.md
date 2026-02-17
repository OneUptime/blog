# How to Enable VNet Integration for Azure App Service to Access Private Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, VNet Integration, Private Resources, Networking, Security

Description: Learn how to configure VNet Integration on Azure App Service to securely access databases, storage, and other private resources in your virtual network.

---

Azure App Service is a PaaS offering, which means your application runs on Microsoft-managed infrastructure that lives outside your virtual network. This is convenient for public-facing web apps, but it creates a problem when your app needs to talk to resources that are only accessible within a VNet - like a database on a private subnet, a Redis cache without a public endpoint, or an internal API running on a VM.

VNet Integration solves this by giving your App Service a virtual presence inside your VNet. Outbound traffic from your app can flow through the VNet, reaching private resources as if the app were deployed inside the network. Inbound traffic from the internet still comes through the App Service load balancer like normal.

## How VNet Integration Works

When you enable VNet Integration, Azure creates a network interface for your App Service in a delegated subnet within your VNet. Outbound connections from your app are routed through this subnet, getting a private IP address from the subnet's range. Resources in the VNet see the traffic as coming from within the network.

There are two types of VNet Integration:

**Regional VNet Integration** (recommended): Connects your App Service to a VNet in the same region. Uses a delegated subnet and supports all VNet features including service endpoints, private endpoints, and NSG rules.

**Gateway-required VNet Integration** (legacy): Uses a VPN gateway to connect to a VNet. Supports cross-region connectivity but is slower and more complex. I will focus on regional VNet Integration since it is the modern approach.

## Prerequisites

- App Service plan must be Standard (S1) tier or higher
- The VNet must be in the same region as the App Service
- A dedicated subnet for the App Service delegation (the subnet cannot be used by other resources)
- The subnet needs at least a /28 address space (16 IPs), though /26 (64 IPs) or larger is recommended

## Step 1: Prepare the Subnet

Create a dedicated subnet for App Service integration. This subnet must be delegated to Microsoft.Web/serverFarms and cannot contain any other resources.

```bash
# Create a VNet if you do not have one
az network vnet create \
  --resource-group myAppRG \
  --name myVNet \
  --address-prefix 10.0.0.0/16 \
  --location eastus

# Create a delegated subnet for App Service
az network vnet subnet create \
  --resource-group myAppRG \
  --vnet-name myVNet \
  --name appservice-subnet \
  --address-prefix 10.0.1.0/26 \
  --delegations Microsoft.Web/serverFarms
```

The subnet size matters. Each App Service plan instance uses one IP from the subnet. If your plan has 4 instances and scales to 10, you need at least 10 available IPs. A /26 subnet gives you 59 usable IPs (64 minus 5 reserved by Azure), which is plenty for most App Service plans.

## Step 2: Enable VNet Integration

```bash
# Enable VNet Integration on the App Service
az webapp vnet-integration add \
  --resource-group myAppRG \
  --name myapp \
  --vnet myVNet \
  --subnet appservice-subnet
```

Verify the integration:

```bash
# Check VNet Integration status
az webapp vnet-integration list \
  --resource-group myAppRG \
  --name myapp \
  -o table
```

## Step 3: Configure Route All Traffic

By default, only RFC1918 traffic (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) is routed through the VNet. All other traffic goes directly to the internet from the App Service. If you want all outbound traffic to go through the VNet (for firewall inspection, custom DNS, or force tunneling), enable the "Route All" setting:

```bash
# Route all outbound traffic through the VNet
az webapp config appsettings set \
  --resource-group myAppRG \
  --name myapp \
  --settings WEBSITE_VNET_ROUTE_ALL=1
```

With Route All enabled, even calls to public internet addresses go through the VNet first. This is useful when you have a firewall appliance or NAT gateway in the VNet that you want all traffic to flow through.

## Accessing Private Databases

The most common use case for VNet Integration is connecting to a database that only has a private endpoint. Here is an example with Azure Database for PostgreSQL:

```bash
# Create a private endpoint for the PostgreSQL server
az network private-endpoint create \
  --resource-group myAppRG \
  --name postgres-private-endpoint \
  --vnet-name myVNet \
  --subnet data-subnet \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/myAppRG/providers/Microsoft.DBforPostgreSQL/flexibleServers/mypostgres" \
  --group-ids postgresqlServer \
  --connection-name postgres-connection

# Create a private DNS zone for the database
az network private-dns zone create \
  --resource-group myAppRG \
  --name privatelink.postgres.database.azure.com

# Link the DNS zone to the VNet
az network private-dns zone virtual-network-link create \
  --resource-group myAppRG \
  --zone-name privatelink.postgres.database.azure.com \
  --name vnet-link \
  --virtual-network myVNet \
  --registration-enabled false

# Create a DNS record for the private endpoint
az network private-endpoint dns-zone-group create \
  --resource-group myAppRG \
  --endpoint-name postgres-private-endpoint \
  --name postgres-dns-group \
  --private-dns-zone privatelink.postgres.database.azure.com \
  --zone-name postgresqlServer
```

Now your App Service can connect to the PostgreSQL server using its private endpoint hostname. The connection string in your application uses the standard hostname, and DNS resolution routes it to the private IP:

```bash
# Set the connection string in App Service settings
az webapp config appsettings set \
  --resource-group myAppRG \
  --name myapp \
  --settings DATABASE_URL="postgresql://admin:password@mypostgres.postgres.database.azure.com:5432/mydb?sslmode=require"
```

## Accessing Private Storage Accounts

Similarly, you can access storage accounts with private endpoints:

```bash
# Create a private endpoint for blob storage
az network private-endpoint create \
  --resource-group myAppRG \
  --name storage-private-endpoint \
  --vnet-name myVNet \
  --subnet data-subnet \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/myAppRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --group-ids blob \
  --connection-name storage-connection
```

Your App Service, through VNet Integration, can now reach the storage account over the private network instead of the public internet.

## DNS Configuration

DNS is the trickiest part of VNet Integration with private endpoints. Your App Service needs to resolve private endpoint hostnames to their private IPs, not their public IPs.

For Azure Private DNS zones (the approach shown above), everything works automatically as long as:
1. The private DNS zone is linked to the VNet.
2. The App Service has WEBSITE_VNET_ROUTE_ALL=1 or the DNS server is within the VNet.
3. The App Service is configured to use Azure DNS (the default).

If you are using custom DNS servers in the VNet, make sure they forward Azure Private DNS zone queries to 168.63.129.16:

```bash
# Set the App Service to use VNet DNS
az webapp config appsettings set \
  --resource-group myAppRG \
  --name myapp \
  --settings WEBSITE_DNS_SERVER=168.63.129.16
```

## Using Service Endpoints

An alternative to private endpoints is service endpoints. They are simpler to set up but provide less isolation:

```bash
# Enable service endpoints on the App Service subnet
az network vnet subnet update \
  --resource-group myAppRG \
  --vnet-name myVNet \
  --name appservice-subnet \
  --service-endpoints Microsoft.Sql Microsoft.Storage Microsoft.KeyVault

# Configure the target resource to accept traffic from the subnet
az storage account network-rule add \
  --resource-group myAppRG \
  --account-name mystorageaccount \
  --vnet-name myVNet \
  --subnet appservice-subnet
```

Service endpoints route traffic over the Azure backbone (not the public internet) but the target resource still has a public IP. Private endpoints give the resource a private IP within your VNet.

## Network Security Groups

You can apply NSG rules to the App Service integration subnet to control outbound traffic:

```bash
# Create an NSG for the App Service subnet
az network nsg create \
  --resource-group myAppRG \
  --name appservice-nsg

# Allow outbound to the database subnet
az network nsg rule create \
  --resource-group myAppRG \
  --nsg-name appservice-nsg \
  --name AllowPostgres \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --destination-address-prefixes 10.0.2.0/24 \
  --destination-port-ranges 5432

# Deny all other outbound to the VNet (optional, for strict security)
az network nsg rule create \
  --resource-group myAppRG \
  --nsg-name appservice-nsg \
  --name DenyVNetOutbound \
  --priority 200 \
  --direction Outbound \
  --access Deny \
  --protocol '*' \
  --destination-address-prefixes VirtualNetwork

# Associate the NSG with the subnet
az network vnet subnet update \
  --resource-group myAppRG \
  --vnet-name myVNet \
  --name appservice-subnet \
  --network-security-group appservice-nsg
```

## NAT Gateway for Static Outbound IP

By default, VNet Integration uses the subnet's default outbound connectivity, which means the outbound IP can vary. If the target resource requires a known, static IP (for firewall allowlisting), attach a NAT Gateway to the integration subnet:

```bash
# Create a public IP for the NAT Gateway
az network public-ip create \
  --resource-group myAppRG \
  --name nat-gateway-ip \
  --sku Standard \
  --allocation-method Static

# Create the NAT Gateway
az network nat gateway create \
  --resource-group myAppRG \
  --name myNATGateway \
  --public-ip-addresses nat-gateway-ip \
  --idle-timeout 10

# Associate the NAT Gateway with the App Service subnet
az network vnet subnet update \
  --resource-group myAppRG \
  --vnet-name myVNet \
  --name appservice-subnet \
  --nat-gateway myNATGateway

# Get the static IP for allowlisting
az network public-ip show \
  --resource-group myAppRG \
  --name nat-gateway-ip \
  --query ipAddress -o tsv
```

## Troubleshooting VNet Integration

### Verifying Connectivity

Use the App Service console or Kudu to test connectivity from within the app:

```bash
# Open the Kudu console
# Navigate to https://myapp.scm.azurewebsites.net/DebugConsole

# Test DNS resolution
nameresolver mypostgres.postgres.database.azure.com

# Test TCP connectivity
tcpping mypostgres.postgres.database.azure.com:5432
```

### Common Issues

**Cannot resolve private endpoint hostname**: Check that the private DNS zone is linked to the VNet and that WEBSITE_VNET_ROUTE_ALL is set to 1.

**Connection timeout to private resource**: Verify the NSG on the integration subnet allows outbound traffic to the target. Check that the target resource's firewall allows traffic from the integration subnet's address range.

**Intermittent failures after scaling**: If the App Service plan scales out and the integration subnet runs out of IP addresses, new instances cannot get a VNet IP. Use a larger subnet.

## Monitoring

Monitor VNet Integration health and traffic patterns:

```bash
# Check VNet Integration status
az webapp show \
  --resource-group myAppRG \
  --name myapp \
  --query "virtualNetworkSubnetId" -o tsv
```

Set up monitoring with OneUptime to track connectivity to your private resources. If the database becomes unreachable from the App Service, you want to know immediately whether it is a VNet Integration issue, a DNS resolution failure, or a problem with the target resource itself.

## Wrapping Up

VNet Integration bridges the gap between the convenience of App Service PaaS and the security of private networking. Enable it on a dedicated subnet, configure DNS for private endpoint resolution, use Route All if you need all traffic to flow through the VNet, and apply NSG rules for security. The setup takes about 15 minutes, and it opens up access to your entire private network infrastructure from App Service without exposing those resources to the public internet.
