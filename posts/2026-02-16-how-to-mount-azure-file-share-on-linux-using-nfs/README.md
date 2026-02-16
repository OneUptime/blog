# How to Mount an Azure File Share on Linux Using NFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, NFS, Linux, File Shares, Mount, Azure Storage

Description: A hands-on guide to mounting Azure File Shares on Linux using the NFS protocol, covering setup, authentication, performance tuning, and troubleshooting.

---

Azure Files supports NFS (Network File System) protocol in addition to SMB, which is great news for Linux environments. NFS is the native file sharing protocol for Unix and Linux systems, and using it means you do not need to deal with SMB client packages, CIFS credentials, or the various quirks of mounting SMB shares on Linux.

NFS support in Azure Files has some specific requirements that differ from SMB. I will walk through the full setup, from creating the right kind of storage account to mounting the share and configuring it for production use.

## Prerequisites and Limitations

Before you start, understand what NFS Azure File Shares require:

- **Premium file shares only.** NFS is not available on standard (HDD-backed) file shares. You need a FileStorage account with premium performance tier.
- **No public endpoint access.** NFS shares must be accessed through a private endpoint or a virtual network service endpoint. You cannot mount an NFS share over the public internet.
- **No encryption in transit.** NFS 4.1 in Azure Files does not support encryption. Security comes from network-level isolation (private endpoints/VNETs) instead of protocol-level encryption.
- **Linux kernel 4.18 or later.** Older kernels may have issues with NFS 4.1 features.
- **Root squash configuration.** You can configure how root access is handled.

## Step 1: Create a Premium FileStorage Account

NFS requires a FileStorage account kind, not a general-purpose v2:

```bash
# Create a premium FileStorage account for NFS support
az storage account create \
  --name mynfsstorageaccount \
  --resource-group myresourcegroup \
  --location eastus \
  --sku Premium_LRS \
  --kind FileStorage \
  --enable-large-file-share
```

The `Premium_LRS` SKU provides SSD-backed storage. Premium file shares are provisioned, meaning you pay for the capacity you allocate, not what you use.

## Step 2: Configure Network Access

Since NFS shares cannot be accessed over the public internet, you need to set up either a private endpoint or a VNET service endpoint.

### Option A: Private Endpoint (Recommended)

```bash
# Create a private endpoint for the storage account
az network private-endpoint create \
  --name nfs-private-endpoint \
  --resource-group myresourcegroup \
  --vnet-name myvnet \
  --subnet mysubnet \
  --private-connection-resource-id $(az storage account show --name mynfsstorageaccount --resource-group myresourcegroup --query id --output tsv) \
  --group-id file \
  --connection-name nfs-connection
```

Then configure DNS so the storage account resolves to the private endpoint IP:

```bash
# Create a private DNS zone for the storage account
az network private-dns zone create \
  --resource-group myresourcegroup \
  --name "privatelink.file.core.windows.net"

# Link the DNS zone to your VNET
az network private-dns zone link create \
  --resource-group myresourcegroup \
  --zone-name "privatelink.file.core.windows.net" \
  --name myDnsLink \
  --virtual-network myvnet \
  --registration-enabled false

# Create DNS record for the private endpoint
az network private-endpoint dns-zone-group create \
  --resource-group myresourcegroup \
  --endpoint-name nfs-private-endpoint \
  --name myZoneGroup \
  --private-dns-zone "privatelink.file.core.windows.net" \
  --zone-name "privatelink.file.core.windows.net"
```

### Option B: VNET Service Endpoint

```bash
# Enable the storage service endpoint on the subnet
az network vnet subnet update \
  --resource-group myresourcegroup \
  --vnet-name myvnet \
  --name mysubnet \
  --service-endpoints Microsoft.Storage

# Restrict the storage account to the VNET
az storage account network-rule add \
  --account-name mynfsstorageaccount \
  --resource-group myresourcegroup \
  --vnet-name myvnet \
  --subnet mysubnet

# Set the default network action to deny
az storage account update \
  --name mynfsstorageaccount \
  --resource-group myresourcegroup \
  --default-action Deny
```

## Step 3: Create the NFS File Share

```bash
# Create an NFS file share with a provisioned capacity of 100 GiB
az storage share-rm create \
  --storage-account mynfsstorageaccount \
  --resource-group myresourcegroup \
  --name mynfsshare \
  --enabled-protocols NFS \
  --root-squash NoRootSquash \
  --quota 100
```

The `--enabled-protocols NFS` flag is critical. It sets the share to use NFS instead of SMB. You cannot change the protocol after creation.

The `--root-squash` option controls how root access from the client is handled:

- **NoRootSquash** - Root on the client has root access on the share. Simplest but least secure.
- **RootSquash** - Root access is mapped to an anonymous user. More secure for shared environments.
- **AllSquash** - All user access is mapped to anonymous. Most restrictive.

## Step 4: Install NFS Client on Linux

Most modern Linux distributions include NFS client packages. Install them if they are not present:

### Ubuntu/Debian

```bash
# Install the NFS client package
sudo apt update
sudo apt install -y nfs-common
```

### RHEL/CentOS/Fedora

```bash
# Install the NFS utilities package
sudo dnf install -y nfs-utils
```

### SUSE

```bash
# Install NFS client on SUSE
sudo zypper install -y nfs-client
```

## Step 5: Mount the NFS Share

Create a mount point and mount the share:

```bash
# Create the mount point directory
sudo mkdir -p /mnt/azure/nfsshare

# Mount the NFS share
sudo mount -t nfs \
  mynfsstorageaccount.file.core.windows.net:/mynfsstorageaccount/mynfsshare \
  /mnt/azure/nfsshare \
  -o vers=4,minorversion=1,sec=sys,nconnect=4
```

Let me break down the mount options:

- `vers=4,minorversion=1` - Use NFS version 4.1
- `sec=sys` - Use system-level authentication (based on UID/GID)
- `nconnect=4` - Use 4 TCP connections for better throughput (requires kernel 5.3+)

Verify the mount:

```bash
# Verify the mount is active
df -h /mnt/azure/nfsshare

# Test writing a file
echo "Hello from NFS" | sudo tee /mnt/azure/nfsshare/test.txt
cat /mnt/azure/nfsshare/test.txt
```

## Step 6: Configure Persistent Mount with fstab

To make the mount survive reboots, add an entry to `/etc/fstab`:

```bash
# Add the NFS mount to fstab for persistence across reboots
echo "mynfsstorageaccount.file.core.windows.net:/mynfsstorageaccount/mynfsshare /mnt/azure/nfsshare nfs vers=4,minorversion=1,sec=sys,nconnect=4 0 0" | sudo tee -a /etc/fstab
```

Test the fstab entry without rebooting:

```bash
# Unmount and remount using fstab
sudo umount /mnt/azure/nfsshare
sudo mount /mnt/azure/nfsshare

# Verify it mounted correctly
mount | grep nfsshare
```

## Performance Tuning

### Using nconnect

The `nconnect` mount option opens multiple TCP connections to the NFS server, significantly improving throughput for parallel I/O workloads:

```bash
# Mount with 8 connections for maximum throughput
sudo mount -t nfs \
  mynfsstorageaccount.file.core.windows.net:/mynfsstorageaccount/mynfsshare \
  /mnt/azure/nfsshare \
  -o vers=4,minorversion=1,sec=sys,nconnect=8
```

Higher `nconnect` values help with parallel workloads but provide diminishing returns beyond 8 connections.

### Read-Ahead Tuning

For sequential read workloads, increasing the read-ahead buffer can help:

```bash
# Increase read-ahead for the NFS mount (value in KB)
echo 16384 | sudo tee /sys/class/bdi/0:*/read_ahead_kb
```

### Write-Back Caching

NFS 4.1 supports client-side caching. For write-heavy workloads, the client caches writes and flushes them in batches:

```bash
# Mount with async option for better write performance
sudo mount -t nfs \
  mynfsstorageaccount.file.core.windows.net:/mynfsstorageaccount/mynfsshare \
  /mnt/azure/nfsshare \
  -o vers=4,minorversion=1,sec=sys,nconnect=4,async
```

The `async` option improves performance but carries a risk of data loss if the client crashes before flushing cached writes. Use `sync` instead if data integrity is more important than performance.

## Provisioned Performance

Premium file shares have performance that scales with provisioned size:

| Provisioned Size | IOPS | Throughput |
|-----------------|------|------------|
| 100 GiB | 3,100 | 110 MiB/s |
| 500 GiB | 3,500 | 150 MiB/s |
| 1 TiB | 4,000 | 200 MiB/s |
| 5 TiB | 8,000 | 400 MiB/s |

If you need more performance, increase the provisioned size:

```bash
# Increase the share quota to get more IOPS and throughput
az storage share-rm update \
  --storage-account mynfsstorageaccount \
  --resource-group myresourcegroup \
  --name mynfsshare \
  --quota 500
```

## Troubleshooting

### Mount Fails with "Connection Refused"

This typically means the storage account is not reachable from your network. Verify:

```bash
# Test DNS resolution
nslookup mynfsstorageaccount.file.core.windows.net

# Test TCP connectivity on port 2049 (NFS)
nc -zv mynfsstorageaccount.file.core.windows.net 2049
```

If DNS resolves to a public IP, your private endpoint or service endpoint is not configured correctly.

### Permission Denied Errors

Check the root squash setting on the share and the UID/GID of the user trying to access files:

```bash
# Check which user is trying to access files
id

# List file permissions on the mount
ls -la /mnt/azure/nfsshare/
```

If using RootSquash, root access is mapped to nobody. Create files as a regular user or change the squash setting.

### Stale File Handle

If the NFS server is restarted or the network drops, you might get stale file handle errors:

```bash
# Force unmount and remount to fix stale handles
sudo umount -f /mnt/azure/nfsshare
sudo mount /mnt/azure/nfsshare
```

## Wrapping Up

NFS on Azure Files gives Linux environments a native file sharing experience backed by Azure's managed infrastructure. The requirement for premium file shares and private networking means it is best suited for production workloads running in Azure VNETs rather than development machines accessing storage over the internet. Set up your private endpoints, tune the nconnect and read-ahead settings for your workload, and configure fstab for persistent mounts. The result is a reliable, high-performance network file system that requires no server management.
