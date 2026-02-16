# How to Configure Azure File Share Premium Tier for Low-Latency Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, Premium Storage, Low Latency, File Share, SSD, Performance

Description: Learn how to set up Azure Files Premium tier for workloads that require single-digit millisecond latency and high IOPS from shared file storage.

---

Standard Azure Files runs on HDD-based infrastructure and provides decent throughput for general workloads. But when you have workloads that need single-digit millisecond latency - things like databases, development environments, content management systems, or analytics pipelines - the standard tier falls short. Azure Files Premium tier uses SSD-backed storage to deliver consistent low-latency performance with significantly higher IOPS.

This guide covers how to create a premium file share, connect it to your workloads, and tune performance to get the most out of it.

## Standard vs. Premium: When to Choose Premium

Here is a quick comparison:

| Feature | Standard | Premium |
|---------|----------|---------|
| Backing storage | HDD | SSD |
| Latency | ~10ms | ~1-2ms |
| Max IOPS | 20,000 | 100,000 |
| Max throughput | 300 MiB/s | 10 GiB/s |
| Billing model | Pay per usage | Pay per provisioned capacity |
| Protocols | SMB, NFS, REST | SMB, NFS |
| Snapshots | Supported | Supported |
| Redundancy | LRS, ZRS, GRS, GZRS | LRS, ZRS |

Choose Premium when:
- Your workload is latency-sensitive (databases, CI/CD build caches, IDE remote development)
- You need consistent IOPS regardless of file size
- Your application performs many small random I/O operations
- You are running workloads on premium VMs and storage is the bottleneck

The main trade-off is cost. Premium is priced per provisioned GiB, not per used GiB. You pay for the capacity you provision even if you only use a fraction of it.

## Step 1: Create a Premium FileStorage Account

Premium file shares require a dedicated FileStorage account type. You cannot use a general-purpose v2 account:

```bash
# Create a resource group
az group create \
  --name rg-premium-files \
  --location eastus2

# Create a FileStorage account (required for premium file shares)
# Note: kind must be FileStorage, not StorageV2
az storage account create \
  --name stpremiumfiles2026 \
  --resource-group rg-premium-files \
  --location eastus2 \
  --sku Premium_LRS \
  --kind FileStorage \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true
```

For zone redundancy, use `Premium_ZRS` instead of `Premium_LRS`. Note that geo-redundant options (GRS, GZRS) are not available for premium file shares.

## Step 2: Create a Premium File Share

Create the file share with a provisioned size. The provisioned size determines your IOPS and throughput limits:

```bash
# Create a premium file share with 1 TiB provisioned capacity
az storage share-rm create \
  --resource-group rg-premium-files \
  --storage-account stpremiumfiles2026 \
  --name app-data \
  --quota 1024 \
  --enabled-protocols SMB
```

## Understanding Premium IOPS and Throughput Scaling

The IOPS and throughput you get scale with provisioned capacity. Here is how it works:

**Baseline IOPS** = 400 + (1 IOPS per provisioned GiB)
- 100 GiB share = 500 IOPS baseline
- 1 TiB (1024 GiB) share = 1,424 IOPS baseline

**Burst IOPS** = max(4,000, 3 x baseline)
- 100 GiB share = 4,000 IOPS burst
- 1 TiB share = 4,272 IOPS burst

**Throughput** = 60 MiB/s + (0.06 MiB/s per provisioned GiB)
- 100 GiB share = 66 MiB/s
- 1 TiB share = 121 MiB/s

If you need more IOPS or throughput, provision more capacity. Even if you only use 100 GiB of data, provisioning 1 TiB gives you higher performance limits.

```bash
# Increase provisioned capacity to get higher IOPS
# Provisioning 4 TiB gives ~4,500 baseline IOPS and ~300 MiB/s throughput
az storage share-rm update \
  --resource-group rg-premium-files \
  --storage-account stpremiumfiles2026 \
  --name app-data \
  --quota 4096
```

## Step 3: Configure Network Access

For lowest latency, use a private endpoint to keep traffic on the Azure backbone:

```bash
# Create a private endpoint for the file share
az network private-endpoint create \
  --resource-group rg-premium-files \
  --name pe-premium-files \
  --vnet-name vnet-app \
  --subnet snet-private-endpoints \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-premium-files/providers/Microsoft.Storage/storageAccounts/stpremiumfiles2026" \
  --group-ids file \
  --connection-name premium-files-connection

# Create a private DNS zone for file.core.windows.net
az network private-dns zone create \
  --resource-group rg-premium-files \
  --name privatelink.file.core.windows.net

# Link the DNS zone to your VNet
az network private-dns zone vnet-link create \
  --resource-group rg-premium-files \
  --zone-name privatelink.file.core.windows.net \
  --name vnet-app-link \
  --virtual-network vnet-app \
  --registration-enabled false

# Create DNS records for the private endpoint
az network private-endpoint dns-zone-group create \
  --resource-group rg-premium-files \
  --endpoint-name pe-premium-files \
  --name default \
  --private-dns-zone privatelink.file.core.windows.net \
  --zone-name privatelink.file.core.windows.net
```

## Step 4: Mount the Share on Windows

Connect to the premium file share from a Windows VM:

```powershell
# Get the storage account key
$storageKey = (az storage account keys list `
  --account-name stpremiumfiles2026 `
  --resource-group rg-premium-files `
  --query "[0].value" -o tsv)

# Mount the file share
# Using cmdkey to store credentials persistently
cmdkey /add:stpremiumfiles2026.file.core.windows.net `
  /user:AZURE\stpremiumfiles2026 `
  /pass:$storageKey

# Map the network drive
New-PSDrive -Name "P" -PSProvider FileSystem `
  -Root "\\stpremiumfiles2026.file.core.windows.net\app-data" `
  -Persist
```

For production environments, configure the mount in a startup script or Group Policy to ensure it persists across reboots.

## Step 5: Mount the Share on Linux

For Linux workloads, mount using CIFS:

```bash
# Install CIFS utilities
sudo apt-get install -y cifs-utils

# Create mount point
sudo mkdir -p /mnt/premium-files

# Get the storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name stpremiumfiles2026 \
  --resource-group rg-premium-files \
  --query "[0].value" -o tsv)

# Create a credentials file (more secure than inline credentials)
sudo bash -c 'cat > /etc/smbcredentials/stpremiumfiles2026.cred << EOF
username=stpremiumfiles2026
password='"$STORAGE_KEY"'
EOF'
sudo chmod 600 /etc/smbcredentials/stpremiumfiles2026.cred

# Mount with optimized settings for performance
sudo mount -t cifs \
  //stpremiumfiles2026.file.core.windows.net/app-data \
  /mnt/premium-files \
  -o credentials=/etc/smbcredentials/stpremiumfiles2026.cred,dir_mode=0755,file_mode=0644,serverino,nosharesock,actimeo=30,mfsymlinks

# Add to fstab for persistence across reboots
echo "//stpremiumfiles2026.file.core.windows.net/app-data /mnt/premium-files cifs credentials=/etc/smbcredentials/stpremiumfiles2026.cred,dir_mode=0755,file_mode=0644,serverino,nosharesock,actimeo=30,mfsymlinks 0 0" | sudo tee -a /etc/fstab
```

## Step 6: Performance Tuning

To get maximum performance from your premium file share, consider these optimizations:

**Use SMB Multichannel**: This allows multiple TCP connections to the same share, increasing throughput. It is supported on premium file shares and enabled by default on Windows Server 2022+.

```powershell
# Verify SMB Multichannel is enabled on Windows
Get-SmbClientConfiguration | Select EnableMultichannel

# Enable if not already on
Set-SmbClientConfiguration -EnableMultichannel $true -Force
```

**Use larger I/O sizes**: SMB supports up to 1 MiB I/O sizes. Applications that use larger I/O sizes get better throughput. For databases, configure the page size and buffer pool to maximize I/O efficiency.

**Enable SMB encryption for security without sacrificing much performance**: Premium shares on SSD handle the encryption overhead well.

```bash
# Enable SMB encryption on the share
az storage share-rm update \
  --resource-group rg-premium-files \
  --storage-account stpremiumfiles2026 \
  --name app-data \
  --enabled-protocols SMB
```

## Step 7: Monitor Performance

Track your file share performance using Azure Monitor:

```bash
# View file share metrics
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-premium-files/providers/Microsoft.Storage/storageAccounts/stpremiumfiles2026/fileServices/default" \
  --metric "FileShareProvisionedIOPS" "FileShareProvisionedBandwidthMiBps" "SuccessServerLatency" \
  --interval PT5M \
  --output table
```

Set up an alert when you approach IOPS limits:

```bash
# Alert when IOPS usage exceeds 80% of provisioned capacity
az monitor metrics alert create \
  --resource-group rg-premium-files \
  --name alert-premium-iops \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-premium-files/providers/Microsoft.Storage/storageAccounts/stpremiumfiles2026/fileServices/default" \
  --condition "avg Transactions > 3400" \
  --window-size 5m \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-premium-files/providers/microsoft.insights/actionGroups/ag-ops" \
  --description "Premium file share IOPS approaching limit" \
  --severity 2
```

## Cost Optimization Tips

Since premium file shares bill on provisioned capacity, not used capacity, optimize costs by:

1. **Right-sizing**: Start with the minimum capacity that meets your IOPS needs. Scale up if you hit limits.
2. **Monitoring usage**: If your provisioned capacity is much larger than used capacity just for IOPS, check if standard tier with larger files could work.
3. **Using snapshots wisely**: Snapshots of premium shares consume provisioned space. Clean up old snapshots regularly.
4. **Considering reserved capacity**: Azure offers 1-year and 3-year reservations for file storage that can save 20-36%.

## Wrapping Up

Azure Files Premium tier is the right choice when your workloads need consistent low-latency file storage with high IOPS. The setup requires a dedicated FileStorage account, and performance scales linearly with provisioned capacity. Use private endpoints for the lowest latency, enable SMB Multichannel for maximum throughput, and monitor your usage to ensure you are not hitting limits or over-provisioning. For latency-sensitive workloads, the investment in premium storage typically pays for itself through improved application performance and user experience.
