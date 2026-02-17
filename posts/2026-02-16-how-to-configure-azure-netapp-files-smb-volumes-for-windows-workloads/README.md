# How to Configure Azure NetApp Files SMB Volumes for Windows Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, NetApp Files, SMB, Windows, File Storage, Active Directory, Enterprise Storage

Description: A practical guide to setting up Azure NetApp Files SMB volumes for Windows workloads including Active Directory integration and performance tuning.

---

If you are running Windows workloads on Azure that need shared file storage with sub-millisecond latency, Azure NetApp Files is one of the best options available. Unlike Azure Files, which is built on top of Azure Storage, Azure NetApp Files runs on dedicated NetApp hardware in Azure datacenters. This gives you enterprise-grade NFS and SMB performance that is hard to match with other Azure-native services.

In this guide, we will set up an SMB volume on Azure NetApp Files, integrate it with Active Directory, and connect it to Windows VMs.

## Understanding Azure NetApp Files Architecture

Before jumping into the setup, it helps to understand how Azure NetApp Files is structured:

- **NetApp Account**: The top-level management container. Think of it like a resource group for your NetApp resources.
- **Capacity Pool**: A provisioned chunk of storage with a specific service level (Standard, Premium, or Ultra). You pay for the provisioned capacity.
- **Volume**: An actual file share carved out from a capacity pool. Each volume gets a mount path and can be accessed via SMB or NFS.

The service level of the capacity pool determines the throughput per TiB:

| Service Level | Throughput per TiB |
|--------------|-------------------|
| Standard | 16 MiB/s |
| Premium | 64 MiB/s |
| Ultra | 128 MiB/s |

For Windows workloads like SQL Server databases, user profile stores, or application data, Premium or Ultra is usually the right choice.

## Prerequisites

Before you start, make sure you have:

- An Azure subscription with the Microsoft.NetApp resource provider registered
- A virtual network with a dedicated subnet for Azure NetApp Files (this subnet must be delegated to `Microsoft.NetApp/volumes`)
- An Active Directory domain controller accessible from the virtual network (either on-premises via VPN/ExpressRoute, or an Azure VM running AD DS)
- DNS configured to resolve your AD domain from the NetApp subnet

## Step 1: Register the Resource Provider and Create a NetApp Account

First, register the NetApp resource provider if you have not already, then create a NetApp account:

```bash
# Register the Microsoft.NetApp resource provider
az provider register --namespace Microsoft.NetApp

# Wait for registration to complete
az provider show --namespace Microsoft.NetApp --query "registrationState"

# Create a NetApp account
az netappfiles account create \
  --resource-group rg-netapp \
  --account-name na-production \
  --location eastus2
```

## Step 2: Configure Active Directory Connection

SMB volumes require an Active Directory connection. This is configured at the NetApp account level and shared by all SMB volumes in that account.

The following command creates the AD connection with the required credentials and DNS settings:

```bash
# Add Active Directory connection to the NetApp account
az netappfiles account ad add \
  --resource-group rg-netapp \
  --account-name na-production \
  --username "svc-netapp" \
  --password "YourServiceAccountPassword" \
  --domain "corp.contoso.com" \
  --dns "10.0.1.4" \
  --smb-server-name "ANFSMB" \
  --organizational-unit "OU=NetApp,OU=Servers,DC=corp,DC=contoso,DC=com"
```

A few important notes about the AD connection:

- The **username** should be a service account with permissions to create computer objects in the specified OU.
- The **smb-server-name** becomes the NetBIOS name of the computer account created in AD. It must be 15 characters or fewer.
- The **dns** IP must be reachable from the delegated subnet.
- The **organizational-unit** is optional but recommended. If omitted, the computer account is created in the default Computers container.

## Step 3: Create a Delegated Subnet

Azure NetApp Files requires a dedicated subnet delegated to the service. This subnet should not contain any other resources.

```bash
# Create a delegated subnet for Azure NetApp Files
az network vnet subnet create \
  --resource-group rg-netapp \
  --vnet-name vnet-production \
  --name snet-netapp \
  --address-prefixes 10.0.10.0/24 \
  --delegations "Microsoft.NetApp/volumes"
```

A /24 subnet is recommended, though /28 is the minimum. The subnet size does not limit the number of volumes - it limits the number of IP addresses available for volume endpoints.

## Step 4: Create a Capacity Pool

Create a capacity pool with the appropriate service level and size:

```bash
# Create a Premium tier capacity pool with 4 TiB
az netappfiles pool create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --location eastus2 \
  --size 4 \
  --service-level Premium
```

The minimum pool size is 4 TiB for all service levels. The pool can be expanded later without downtime, but it cannot be shrunk below the total size of volumes it contains.

## Step 5: Create an SMB Volume

Now create the SMB volume within the capacity pool:

```bash
# Create a 1 TiB SMB volume
az netappfiles volume create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-appdata \
  --location eastus2 \
  --service-level Premium \
  --usage-threshold 1024 \
  --file-path "appdata" \
  --vnet vnet-production \
  --subnet snet-netapp \
  --protocol-types CIFS \
  --security-style ntfs
```

Key parameters to understand:

- **usage-threshold**: Volume quota in GiB. This is the maximum size the volume can grow to.
- **file-path**: The unique file path used in the mount path. This becomes part of the UNC path.
- **protocol-types**: Use `CIFS` for SMB volumes. Despite the name, this creates an SMB 3.x share.
- **security-style**: Use `ntfs` for Windows workloads. This ensures proper NTFS ACL support.

## Step 6: Get the Mount Path

After the volume is created, retrieve the SMB mount path:

```bash
# Get the volume details including mount targets
az netappfiles volume show \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-appdata \
  --query "mountTargets[0].smbServerFqdn"
```

The mount path will look like: `\\anfsmb.corp.contoso.com\appdata`

## Step 7: Mount the Volume on Windows

On your Windows server or VM, mount the SMB share using a domain account that has access:

```powershell
# Map the drive using a domain account
# The server name comes from the mount target FQDN
New-PSDrive -Name "S" -PSProvider FileSystem `
  -Root "\\anfsmb.corp.contoso.com\appdata" `
  -Persist `
  -Credential (Get-Credential -Message "Enter domain credentials")

# Alternatively, for a simpler approach using net use
net use S: \\anfsmb.corp.contoso.com\appdata /persistent:yes
```

If you are logged in with a domain account that has access, the share mounts without prompting for credentials.

## Step 8: Configure NTFS Permissions

By default, the volume root has permissions for the AD administrator account. You should configure proper NTFS ACLs for your workload:

```powershell
# Set NTFS permissions on the share root
# First, remove inherited permissions and set explicit ones
$acl = Get-Acl "S:\"

# Add a permission rule for the application service group
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "CORP\AppDataUsers",       # Identity
    "Modify",                   # Permission level
    "ContainerInherit,ObjectInherit",  # Inheritance flags
    "None",                     # Propagation flags
    "Allow"                     # Access control type
)
$acl.AddAccessRule($rule)

# Apply the ACL
Set-Acl "S:\" $acl

# Verify permissions
Get-Acl "S:\" | Format-List
```

## Performance Tuning

To get the best performance from your SMB volume, consider these settings on your Windows clients:

**Enable SMB Multichannel**: This allows multiple TCP connections to the same share, improving throughput. It is enabled by default on Windows Server 2022 and newer.

```powershell
# Check if SMB Multichannel is enabled
Get-SmbClientConfiguration | Select-Object EnableMultichannel

# Enable if not already enabled
Set-SmbClientConfiguration -EnableMultichannel $true -Force
```

**Increase SMB credits**: Higher credit limits allow more outstanding requests, which benefits workloads with high concurrency.

**Use accelerated networking**: Ensure your VMs have accelerated networking enabled. This reduces latency and jitter, which directly impacts SMB performance.

```bash
# Enable accelerated networking on a VM NIC
az network nic update \
  --resource-group rg-netapp \
  --name nic-appserver01 \
  --accelerated-networking true
```

## Monitoring Volume Performance

Monitor your volume performance using Azure Monitor metrics:

```bash
# Query volume throughput metrics for the last hour
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium/volumes/vol-appdata" \
  --metric "VolumeLogicalSize" "ReadIops" "WriteIops" \
  --interval PT5M \
  --output table
```

Watch for these warning signs:
- Throughput consistently near the volume limit (indicates you need a higher service level)
- High latency spikes (could indicate network issues or overloaded VMs)
- Volume size approaching the quota (set up alerts before it fills up)

## Wrapping Up

Azure NetApp Files provides enterprise-grade SMB storage for Windows workloads on Azure. The setup requires careful attention to Active Directory integration and subnet delegation, but once configured, it delivers consistent low-latency performance that Azure Files cannot match. Make sure your AD connection is properly configured, use the right service level for your performance requirements, and monitor your volumes to avoid hitting capacity or throughput limits. For Windows workloads that depend on reliable shared storage, Azure NetApp Files is a solid choice.
