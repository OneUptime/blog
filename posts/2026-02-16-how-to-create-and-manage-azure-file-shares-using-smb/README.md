# How to Create and Manage Azure File Shares Using SMB Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, SMB, File Shares, Azure Storage, Network Storage, Cloud Files

Description: A practical guide to creating and managing Azure File Shares using the SMB protocol for cloud-based file storage accessible from Windows, Linux, and macOS.

---

Azure Files provides fully managed file shares in the cloud that are accessible via the Server Message Block (SMB) protocol. If you have ever mapped a network drive on Windows or mounted an SMB share on Linux, Azure Files works the same way except the file server is in Azure instead of your server room.

The appeal is straightforward: you get a file share without managing any infrastructure. No VMs to patch, no RAID arrays to worry about, no capacity planning headaches. Azure handles it all, and you pay for what you use.

## When to Use Azure File Shares

Azure Files fits several scenarios:

- **Replacing or supplementing on-premises file servers.** Lift-and-shift file shares to the cloud without changing your applications.
- **Shared configuration files.** Multiple VMs or services can mount the same share and read shared configuration.
- **Diagnostic logs.** Applications write logs to a file share that can be accessed from anywhere.
- **Dev/test environments.** Shared file storage for development teams.
- **Persistent storage for containers.** Mount Azure Files as a volume in Azure Kubernetes Service or Azure Container Instances.

## Creating a Storage Account for Azure Files

Azure Files lives inside a standard Azure Storage account. You can use an existing account or create a new one:

```bash
# Create a storage account optimized for Azure Files
az storage account create \
  --name myfilesaccount \
  --resource-group myresourcegroup \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

For production workloads that need higher performance, consider Premium file shares:

```bash
# Create a premium storage account for high-performance file shares
az storage account create \
  --name mypremiumfiles \
  --resource-group myresourcegroup \
  --location eastus \
  --sku Premium_LRS \
  --kind FileStorage
```

Premium file shares use SSD storage and offer significantly better IOPS and throughput, but they cost more and have a minimum provisioned size.

## Creating a File Share

### Azure CLI

```bash
# Create a file share with a 100 GB quota
az storage share-rm create \
  --storage-account myfilesaccount \
  --resource-group myresourcegroup \
  --name myfileshare \
  --quota 100
```

The quota defines the maximum size of the share in GiB. For standard shares, you can set this up to 100 TiB (if large file share support is enabled on the account).

### Azure Portal

1. Navigate to your storage account.
2. Under "Data storage," click "File shares."
3. Click "+ File share."
4. Enter a name and quota.
5. Choose a tier (Transaction optimized, Hot, or Cool).
6. Click "Create."

### Bicep Template

```bicep
// Create an Azure File Share in a storage account
resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  name: '${storageAccount.name}/default/myfileshare'
  properties: {
    shareQuota: 100  // 100 GiB quota
    accessTier: 'TransactionOptimized'
  }
}
```

## File Share Tiers

Standard file shares offer multiple tiers:

- **Transaction optimized** - Best for workloads with high transaction rates (lots of reads/writes). Higher storage cost, lower transaction cost.
- **Hot** - Good balance of storage and transaction costs. Works well for general-purpose file shares.
- **Cool** - Cheapest storage cost, highest transaction cost. Best for data that is stored long-term and accessed infrequently.

You can change the tier at any time without downtime:

```bash
# Change the file share tier to Cool
az storage share-rm update \
  --storage-account myfilesaccount \
  --resource-group myresourcegroup \
  --name myfileshare \
  --access-tier Cool
```

## Enabling Large File Shares

By default, standard storage accounts support file shares up to 5 TiB. To use shares up to 100 TiB, enable large file share support:

```bash
# Enable large file share support on the storage account
az storage account update \
  --name myfilesaccount \
  --resource-group myresourcegroup \
  --enable-large-file-share
```

Note that enabling large file shares is a one-way operation. Once enabled, you cannot switch the storage account to GRS or GZRS redundancy. Plan your redundancy strategy before enabling this.

## Managing Files and Directories

### Creating Directories

```bash
# Create a directory in the file share
az storage directory create \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --name "projects/2026"
```

### Uploading Files

```bash
# Upload a file to the file share
az storage file upload \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --source "./local-file.txt" \
  --path "projects/2026/local-file.txt"
```

For uploading multiple files:

```bash
# Upload all files from a directory to the file share
az storage file upload-batch \
  --account-name myfilesaccount \
  --destination myfileshare \
  --source ./local-directory/ \
  --destination-path "projects/2026/"
```

### Downloading Files

```bash
# Download a file from the file share
az storage file download \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --path "projects/2026/local-file.txt" \
  --dest "./downloaded-file.txt"
```

### Listing Files

```bash
# List files and directories in the share root
az storage file list \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --output table
```

```bash
# List files in a specific directory
az storage file list \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --path "projects/2026" \
  --output table
```

### Deleting Files

```bash
# Delete a specific file
az storage file delete \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --path "projects/2026/old-file.txt"
```

## Managing File Shares Programmatically

### Python SDK

```python
from azure.storage.fileshare import ShareServiceClient, ShareClient

# Connect to the Azure Files service
connection_string = "your-connection-string"
service_client = ShareServiceClient.from_connection_string(connection_string)

# Create a new file share
share_client = service_client.create_share("my-new-share")
print("Share created")

# Create a directory in the share
share_client.create_directory("documents")

# Upload a file to the directory
directory_client = share_client.get_directory_client("documents")
with open("./report.pdf", "rb") as source_file:
    file_client = directory_client.upload_file("report.pdf", source_file)
    print(f"File uploaded: {file_client.url}")

# List files in the directory
for item in directory_client.list_directories_and_files():
    print(f"  {'[DIR]' if item['is_directory'] else '[FILE]'} {item['name']}")
```

### C# SDK

```csharp
using Azure.Storage.Files.Shares;

// Connect to the share
var shareClient = new ShareClient("your-connection-string", "myfileshare");

// Create a directory
var directoryClient = shareClient.GetDirectoryClient("documents");
await directoryClient.CreateIfNotExistsAsync();

// Upload a file
var fileClient = directoryClient.GetFileClient("report.pdf");
using var stream = File.OpenRead("./report.pdf");
await fileClient.CreateAsync(stream.Length);
await fileClient.UploadAsync(stream);
Console.WriteLine("File uploaded successfully");
```

## Configuring Network Access

By default, Azure File shares are accessible from the public internet (with authentication). For better security, restrict network access:

### Private Endpoint

```bash
# Create a private endpoint for the storage account
az network private-endpoint create \
  --name myfiles-private-endpoint \
  --resource-group myresourcegroup \
  --vnet-name myvnet \
  --subnet mysubnet \
  --private-connection-resource-id $(az storage account show --name myfilesaccount --resource-group myresourcegroup --query id --output tsv) \
  --group-id file \
  --connection-name myfiles-connection
```

### Firewall Rules

```bash
# Restrict access to specific IP ranges
az storage account network-rule add \
  --account-name myfilesaccount \
  --resource-group myresourcegroup \
  --ip-address 203.0.113.0/24

# Set the default action to deny
az storage account update \
  --name myfilesaccount \
  --resource-group myresourcegroup \
  --default-action Deny
```

## Monitoring and Diagnostics

Enable diagnostic settings to track file share usage:

```bash
# Enable diagnostic logging for Azure Files
az monitor diagnostic-settings create \
  --name files-diagnostics \
  --resource $(az storage account show --name myfilesaccount --resource-group myresourcegroup --query id --output tsv) \
  --logs '[{"category":"StorageRead","enabled":true},{"category":"StorageWrite","enabled":true}]' \
  --metrics '[{"category":"Transaction","enabled":true}]' \
  --workspace myloganalyticsworkspace
```

Key metrics to monitor:

- **File capacity** - How much of your quota is being used
- **Transaction count** - Number of read/write operations
- **Availability** - Uptime percentage
- **Latency** - Response time for operations

## Wrapping Up

Azure File Shares with SMB give you cloud-based file storage that behaves like a traditional network drive. Creating and managing shares is straightforward through the CLI, portal, or SDKs. Choose the right tier based on your access patterns, set appropriate quotas, and configure network access to limit exposure. For most lift-and-shift scenarios where applications already work with SMB file shares, Azure Files is a natural fit that eliminates the operational burden of managing file servers.
