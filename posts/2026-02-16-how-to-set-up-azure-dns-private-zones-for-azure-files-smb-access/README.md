# How to Set Up Azure DNS Private Zones for Azure Files SMB Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, DNS, Private Zones, Azure Files, SMB, Private Endpoint, Storage

Description: Configure Azure DNS Private Zones to enable SMB access to Azure Files over private endpoints without exposing file shares to the public internet.

---

Azure Files provides fully managed file shares in the cloud that you can mount using the SMB protocol. By default, Azure Files is accessible over the public internet, which is not ideal for production workloads handling sensitive data. Private endpoints let you access Azure Files over a private IP address in your VNet, but the DNS configuration is the part that catches most people off guard.

When you mount an SMB share, the client resolves the storage account's FQDN to an IP address. If that FQDN resolves to the public IP instead of the private endpoint IP, your traffic goes over the internet even though you have a private endpoint configured. Azure DNS Private Zones fix this by overriding the public DNS resolution with a private one.

This guide walks through setting up private endpoints for Azure Files and configuring DNS Private Zones so SMB mounts use the private path.

## The DNS Resolution Chain

When a client mounts `\\mystorageaccount.file.core.windows.net\myshare`, the operating system resolves the FQDN. Here is what happens with and without private DNS zones:

**Without private DNS zone (public resolution)**:
```
mystorageaccount.file.core.windows.net -> 52.x.x.x (public IP)
```

**With private endpoint and private DNS zone**:
```
mystorageaccount.file.core.windows.net
  -> CNAME: mystorageaccount.privatelink.file.core.windows.net
  -> A record: 10.0.1.5 (private endpoint IP)
```

The CNAME redirect from `file.core.windows.net` to `privatelink.file.core.windows.net` is created automatically by Azure when you set up the private endpoint. The A record in the private DNS zone points to the private endpoint's IP address.

## Prerequisites

- An Azure Storage account with Azure Files enabled
- A virtual network where your clients reside
- At least one file share created in the storage account
- Azure CLI installed
- Clients that support SMB 3.0 or later (Windows 10+, Linux with cifs-utils, macOS)

## Step 1: Create the Private Endpoint for Azure Files

Create a private endpoint that gives the storage account's file service a private IP in your VNet:

```bash
# Get the storage account resource ID
STORAGE_ID=$(az storage account show \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --query id -o tsv)

# Create the private endpoint for the file sub-resource
az network private-endpoint create \
  --name mystorageaccount-file-pe \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet privateEndpointSubnet \
  --private-connection-resource-id $STORAGE_ID \
  --group-id file \
  --connection-name mystorageaccount-file-connection \
  --location eastus
```

The `--group-id file` parameter specifies that this private endpoint is for the Azure Files service. Storage accounts have different sub-resources (blob, file, queue, table, dfs), and each needs its own private endpoint if you want private access.

## Step 2: Create the Private DNS Zone

Create a private DNS zone for the Azure Files private link domain:

```bash
# Create the private DNS zone for Azure Files
az network private-dns zone create \
  --name "privatelink.file.core.windows.net" \
  --resource-group myResourceGroup
```

## Step 3: Link the DNS Zone to Your VNet

Link the private DNS zone to the VNet so VMs in that VNet can resolve records in the zone:

```bash
# Link the private DNS zone to the VNet
az network private-dns link vnet create \
  --name "filestorage-dns-link" \
  --resource-group myResourceGroup \
  --zone-name "privatelink.file.core.windows.net" \
  --virtual-network myVNet \
  --registration-enabled false
```

Setting `--registration-enabled false` is correct here. Auto-registration is for VM DNS records, not for private endpoint records.

## Step 4: Create the DNS Record for the Private Endpoint

Add an A record in the private DNS zone that maps the storage account's private link FQDN to the private endpoint's IP address:

```bash
# Get the private endpoint's IP address
PE_IP=$(az network private-endpoint show \
  --name mystorageaccount-file-pe \
  --resource-group myResourceGroup \
  --query "customDnsConfigs[0].ipAddresses[0]" -o tsv)

# Create the A record in the private DNS zone
az network private-dns record-set a create \
  --name mystorageaccount \
  --zone-name "privatelink.file.core.windows.net" \
  --resource-group myResourceGroup

az network private-dns record-set a add-record \
  --record-set-name mystorageaccount \
  --zone-name "privatelink.file.core.windows.net" \
  --resource-group myResourceGroup \
  --ipv4-address $PE_IP
```

Alternatively, if you enable the automatic DNS integration when creating the private endpoint, Azure creates both the DNS zone and the A record for you:

```bash
# Create private endpoint with automatic DNS zone integration
az network private-endpoint dns-zone-group create \
  --endpoint-name mystorageaccount-file-pe \
  --resource-group myResourceGroup \
  --name default \
  --private-dns-zone "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net" \
  --zone-name "privatelink.file.core.windows.net"
```

## Step 5: Verify DNS Resolution

From a VM in the linked VNet, verify that the storage account FQDN resolves to the private IP:

```bash
# Test DNS resolution from an Azure VM in the VNet
nslookup mystorageaccount.file.core.windows.net

# Expected output should show the private IP
# Name:    mystorageaccount.privatelink.file.core.windows.net
# Address:  10.0.1.5
```

If it still resolves to the public IP, check that:
1. The private DNS zone is linked to the correct VNet
2. The A record exists in the private DNS zone
3. The VM is using Azure DNS (168.63.129.16) or has DNS forwarding configured

## Step 6: Mount the Azure File Share via SMB

Now mount the file share using the private endpoint. The mount command uses the same FQDN, but DNS resolution directs the traffic to the private IP.

**On Windows**:

```powershell
# Mount the Azure File share on Windows
# The FQDN resolves to the private IP through the DNS private zone
$connectTestResult = Test-NetConnection -ComputerName mystorageaccount.file.core.windows.net -Port 445
if ($connectTestResult.TcpTestSucceeded) {
    # Mount the share using the storage account key
    net use Z: \\mystorageaccount.file.core.windows.net\myshare /user:Azure\mystorageaccount <storage-account-key>
}
```

**On Linux**:

```bash
# Install cifs-utils if not already installed
sudo apt-get install cifs-utils

# Create a mount point
sudo mkdir -p /mnt/azurefiles

# Mount the Azure File share
# The FQDN resolves to the private endpoint IP
sudo mount -t cifs \
  //mystorageaccount.file.core.windows.net/myshare \
  /mnt/azurefiles \
  -o vers=3.0,username=mystorageaccount,password=<storage-account-key>,dir_mode=0777,file_mode=0777,serverino
```

## Step 7: Restrict Public Access to the Storage Account

Now that private endpoint access is working, disable public access to the storage account to ensure all traffic goes through the private endpoint:

```bash
# Disable public network access to the storage account
az storage account update \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --default-action Deny \
  --bypass AzureServices

# Verify the setting
az storage account show \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --query "networkRuleSet.defaultAction" -o tsv
```

After disabling public access, only clients that can resolve the storage account to the private endpoint IP will be able to connect.

## Handling On-Premises Clients

If you have on-premises clients that need to mount Azure File shares through the private endpoint, you need DNS forwarding configured. On-premises DNS servers must forward queries for `privatelink.file.core.windows.net` to a DNS resolver in Azure that can query the private DNS zone.

The approach is the same as for any private endpoint DNS integration with on-premises DNS:

1. Deploy an Azure DNS Private Resolver with an inbound endpoint
2. Add a conditional forwarder on your on-premises DNS for `privatelink.file.core.windows.net`
3. Point the forwarder to the DNS Private Resolver's inbound endpoint IP

With this in place, on-premises clients can mount the Azure File share using the FQDN, and DNS resolution will route through Azure to get the private IP.

## Troubleshooting Common Issues

**SMB port 445 blocked**: Many ISPs and corporate networks block TCP port 445. If you are connecting from on-premises, verify that port 445 is open on the path between your client and the private endpoint.

```bash
# Test port 445 connectivity
Test-NetConnection -ComputerName mystorageaccount.file.core.windows.net -Port 445
```

**DNS caching**: After setting up the private DNS zone, clients might still have the public IP cached. Flush DNS caches:

```bash
# Windows
ipconfig /flushdns

# Linux
sudo systemd-resolve --flush-caches

# macOS
sudo dscacheutil -flushcache
```

**Multiple VNets**: If you have multiple VNets that need to access the file share, link the private DNS zone to each VNet. The private endpoint only needs to exist in one VNet, but the DNS zone needs to be linked to every VNet whose clients need to resolve the private IP.

**Identity-based access**: If you are using Azure AD DS or on-premises AD DS for identity-based access to Azure Files, the Kerberos authentication still works through the private endpoint. The storage account's domain-joined identity handles authentication independently from the network path.

## Wrapping Up

Setting up Azure DNS Private Zones for Azure Files SMB access involves creating a private endpoint, configuring the DNS zone with the correct A record, and linking the zone to your VNets. The DNS configuration is the critical piece that makes everything work - without it, your SMB mounts will try to connect over the public internet even with a private endpoint in place. Once DNS is right, disable public access on the storage account to enforce the private path, and remember to handle on-premises DNS forwarding if you have hybrid connectivity requirements.
