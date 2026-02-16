# How to Use Azure Data Box to Transfer Large Datasets to Azure Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Data Box, Data Migration, Azure Storage, Large Data Transfer, Cloud Migration

Description: A practical guide to using Azure Data Box for transferring terabytes of data to Azure Storage when network transfers are too slow or expensive.

---

When you need to move tens or hundreds of terabytes of data to Azure, uploading over the network is not always practical. Even with a 10 Gbps connection, transferring 100 TB takes over 11 days of continuous upload - and that assumes perfect throughput with zero interruptions. Azure Data Box solves this by letting you physically ship your data to an Azure datacenter on a ruggedized storage appliance.

This guide covers the end-to-end process of ordering, configuring, loading, and shipping an Azure Data Box device.

## Choosing the Right Data Box SKU

Azure offers several Data Box options depending on how much data you need to move:

- **Data Box Disk**: Up to 35 TB across 5 encrypted SSDs. Good for smaller migrations.
- **Data Box**: 80 TB usable capacity in a single rugged device. The most common choice for mid-size migrations.
- **Data Box Heavy**: Up to 1 PB of capacity. Designed for massive data center migrations.

For this guide, we will focus on the standard Data Box (80 TB), which covers most use cases.

## Step 1: Order the Data Box

You can order a Data Box through the Azure portal or via the Azure CLI.

The following commands create a Data Box order through the CLI, specifying the destination storage account and shipping details:

```bash
# Create a resource group for the Data Box order
az group create \
  --name rg-databox-migration \
  --location eastus2

# Create the Data Box order
az databox job create \
  --resource-group rg-databox-migration \
  --name databox-order-2026q1 \
  --location eastus2 \
  --sku DataBox \
  --contact-name "IT Operations Team" \
  --email-list ops@company.com \
  --phone "555-0123" \
  --street-address-1 "100 Main Street" \
  --city "Seattle" \
  --state-or-province "WA" \
  --country "US" \
  --postal-code "98101" \
  --storage-account "/subscriptions/<sub-id>/resourceGroups/rg-databox-migration/providers/Microsoft.Storage/storageAccounts/stdestination2026"
```

After ordering, Microsoft prepares and ships the device. Delivery typically takes 5-10 business days depending on your location and device availability.

## Step 2: Receive and Connect the Device

When the Data Box arrives, it comes in a tamper-evident shipping box. The device itself is about the size of a small suitcase and weighs roughly 50 pounds.

Here is what you need to do once it arrives:

1. Inspect the device for damage and verify the tamper-evident seal is intact.
2. Check the Azure portal for the unlock password - you will find this in the Data Box order details.
3. Connect the device to your network using one of the available ports (RJ45 1 GbE, or 10 GbE via RJ45 or SFP+).
4. Connect the power cable and turn on the device.

The device boots up and displays a local web UI URL on its screen. By default, the management IP is accessible at https://192.168.100.10.

## Step 3: Configure Network Settings

Access the local web UI from a computer on the same network. Log in using the unlock password from the Azure portal.

Configure the network interface you want to use for data transfer:

1. Go to **Set network interfaces** in the local web UI.
2. For the 10 GbE interface (DATA 1 or DATA 2), configure a static IP or enable DHCP.
3. The DATA 1 and DATA 2 ports support 10 GbE, which you should use for maximum transfer speed.

A quick note on performance: always use the 10 GbE ports for data copy. The management port (MGMT) is limited to 1 GbE and should only be used for device administration.

## Step 4: Connect to Data Box Shares

The Data Box exposes SMB and NFS shares that map to your destination storage account. Each share corresponds to a container or file share type in your storage account.

For block blob data, connect to the block blob share. For page blobs or Azure Files, use the corresponding shares.

On Windows, the following commands map the SMB share:

```powershell
# Map the block blob share on Windows
# Replace the IP with your Data Box data interface IP
net use Z: \\10.10.10.1\mystorageaccount_BlockBlob /user:mystorageaccount

# When prompted, enter the password from the Azure portal
# You can find this under Data Box order > Device credentials
```

On Linux, mount the NFS share instead:

```bash
# Create mount point
sudo mkdir -p /mnt/databox

# Mount the NFS share from the Data Box
# Replace IP with your Data Box data interface IP
sudo mount -t nfs 10.10.10.1:/mystorageaccount_BlockBlob /mnt/databox

# Verify the mount
df -h /mnt/databox
```

## Step 5: Copy Data to the Device

Now comes the main event - copying your data onto the device. For best performance, use Robocopy on Windows or rsync on Linux.

On Windows, use Robocopy with multithreading to maximize throughput:

```powershell
# Copy data using Robocopy with 16 threads
# /MT:16 uses 16 threads for parallel copying
# /R:3 retries 3 times on failure
# /W:5 waits 5 seconds between retries
# /LOG creates a log file for tracking
robocopy D:\SourceData Z:\migration-container /MT:16 /R:3 /W:5 /E /LOG:C:\Logs\databox-copy.log
```

On Linux, use rsync with appropriate flags:

```bash
# Copy data using rsync
# -avh: archive mode, verbose, human-readable
# --progress: show progress during transfer
# --partial: keep partially transferred files for resume
rsync -avh --progress --partial \
  /data/source/ \
  /mnt/databox/migration-container/
```

## Performance Tips for Data Copy

Getting the maximum transfer speed requires some attention to your source system and network setup:

- **Use 10 GbE connections**: The difference between 1 GbE and 10 GbE is massive. A 10 GbE connection can sustain 400-500 MB/s in practice.
- **Avoid small files**: Thousands of small files (under 1 MB) will kill your throughput. If possible, tar or zip small files before copying.
- **Use multiple sessions**: Run parallel copy sessions for different directories. The device handles concurrent writes well.
- **Monitor the dashboard**: The local web UI shows real-time copy progress and any errors.

For reference, here are typical transfer times at different speeds:

| Data Volume | 1 GbE Speed | 10 GbE Speed |
|------------|-------------|--------------|
| 10 TB | ~28 hours | ~6 hours |
| 40 TB | ~4.5 days | ~24 hours |
| 80 TB | ~9 days | ~2 days |

## Step 6: Validate and Prepare for Shipping

After copying is complete, run the validation step from the local web UI:

1. Go to **Prepare to ship** in the local web UI.
2. The device runs checksums on all copied data and generates a Bill of Materials (BOM).
3. Review the BOM for any errors or skipped files.
4. If validation passes, the device prepares for shipping.

The preparation step can take several hours depending on data volume, as it computes checksums for every file.

## Step 7: Ship the Device Back

Once preparation is complete:

1. Power off the device.
2. Disconnect all cables.
3. Attach the return shipping label (found under the e-ink display on the device).
4. Schedule a pickup with the carrier shown on the label, or drop it off at a carrier location.

You can track the return shipment in the Azure portal under your Data Box order.

## Step 8: Verify Data Upload

After Microsoft receives the device, they upload your data to the destination storage account. This typically takes 1-3 days depending on data volume.

Monitor the upload progress in the Azure portal. Once complete, you will receive an email notification and can verify the data:

```bash
# List containers in the destination storage account
az storage container list \
  --account-name stdestination2026 \
  --output table

# Check blob count in the migration container
az storage blob list \
  --account-name stdestination2026 \
  --container-name migration-container \
  --query "length(@)"
```

## Data Verification with Copy Logs

Azure provides detailed copy logs after the upload. These logs are stored in a container called `databoxcopylog` in your storage account. Download and review them to confirm every file was uploaded successfully.

```bash
# Download copy logs
az storage blob download-batch \
  --account-name stdestination2026 \
  --source databoxcopylog \
  --destination ./copy-logs/
```

The logs include file-level status, checksums, and any errors encountered during upload.

## Security Considerations

Data Box devices use AES 256-bit encryption. The unlock password is stored in Azure and never travels with the device. After your data is uploaded, Microsoft performs a NIST 800-88 data wipe on the device, overwriting all data multiple times.

If you need additional security, you can encrypt your data before copying it to the device. The device itself does not decrypt your data - it simply stores the encrypted blobs as-is.

## Wrapping Up

Azure Data Box is a practical solution when network transfers are impractical due to bandwidth limitations, costs, or time constraints. The process is straightforward: order the device, load your data, ship it back, and verify the upload. For most organizations, the 80 TB Data Box handles medium to large migrations with ease. For truly massive datasets, consider the Data Box Heavy or multiple standard Data Box devices shipped in parallel.

Plan your copy strategy ahead of time, use 10 GbE connections where possible, and always validate your data after the upload completes. This avoids surprises and ensures a smooth migration.
