# How to Use Azure Storage with Managed Identities for Passwordless Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Identity, Azure Storage, Passwordless Authentication, RBAC, Security, Identity Management

Description: How to configure managed identities and Azure RBAC to access Azure Storage without connection strings, account keys, or SAS tokens.

---

Every time you embed a storage account key or connection string in your application code or configuration, you create a security liability. Keys do not expire unless you rotate them manually, they grant full access to everything in the account, and if they leak, anyone can read and delete your data. Managed identities solve this by letting your Azure resources authenticate to Azure Storage using their own identity, with no secrets to store, rotate, or accidentally commit to source control.

## What Is a Managed Identity?

A managed identity is an Azure AD identity automatically managed by Azure. It is tied to an Azure resource (like a VM, App Service, or Function App) and provides that resource with the ability to authenticate against Azure AD without any credentials in code.

There are two types:

- **System-assigned**: Created and linked to a specific Azure resource. When the resource is deleted, the identity is deleted too. One identity per resource.
- **User-assigned**: Created independently as a standalone Azure resource. Can be assigned to multiple resources. Survives if one of the associated resources is deleted.

For most scenarios, system-assigned identities are simpler. Use user-assigned when you need the same identity across multiple resources.

## Step 1: Enable Managed Identity on Your Resource

### For an Azure VM

```bash
# Enable system-assigned managed identity on an existing VM
az vm identity assign \
  --resource-group myResourceGroup \
  --name myVM
```

### For an Azure App Service or Function App

```bash
# Enable system-assigned managed identity on a web app
az webapp identity assign \
  --resource-group myResourceGroup \
  --name my-web-app
```

### For an Azure Function App

```bash
# Enable system-assigned managed identity on a function app
az functionapp identity assign \
  --resource-group myResourceGroup \
  --name my-function-app
```

After enabling, get the principal ID of the managed identity - you will need it for role assignments:

```bash
# Get the principal ID of the managed identity
PRINCIPAL_ID=$(az webapp identity show \
  --resource-group myResourceGroup \
  --name my-web-app \
  --query "principalId" -o tsv)

echo "Principal ID: ${PRINCIPAL_ID}"
```

## Step 2: Assign Azure RBAC Roles for Storage Access

Managed identities authenticate via Azure AD, which means access to storage is controlled by Azure RBAC (Role-Based Access Control) instead of keys. You need to assign the appropriate role to the managed identity.

### Common Storage Roles

| Role | What It Allows |
|------|---------------|
| Storage Blob Data Reader | Read blobs and containers |
| Storage Blob Data Contributor | Read, write, delete blobs and containers |
| Storage Blob Data Owner | Full access including setting permissions |
| Storage Queue Data Reader | Read queue messages |
| Storage Queue Data Contributor | Read, write, delete queue messages |
| Storage Queue Data Message Processor | Peek, receive, delete queue messages |
| Storage Table Data Reader | Read table entities |
| Storage Table Data Contributor | Read, write, delete table entities |
| Storage File Data SMB Share Reader | Read files via SMB |
| Storage File Data SMB Share Contributor | Read, write, delete files via SMB |

### Assign the Role

```bash
# Assign the Storage Blob Data Contributor role to the managed identity
# This grants read, write, and delete access to blobs
az role assignment create \
  --assignee "${PRINCIPAL_ID}" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount"
```

You can scope the role assignment to different levels:

```bash
# Scope to a specific container (more restrictive)
az role assignment create \
  --assignee "${PRINCIPAL_ID}" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default/containers/public-data"

# Scope to the entire resource group (less restrictive)
az role assignment create \
  --assignee "${PRINCIPAL_ID}" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/{sub-id}/resourceGroups/myResourceGroup"
```

Role assignments can take up to 5 minutes to propagate. If your application gets a 403 error immediately after assigning a role, wait a few minutes and try again.

## Step 3: Update Application Code

The key change in your application code is replacing connection strings or account keys with `DefaultAzureCredential`, which automatically discovers and uses the managed identity.

### Python Example

```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

# No connection strings, no keys - just the account URL
# DefaultAzureCredential automatically uses the managed identity
# when running on an Azure resource with a managed identity
credential = DefaultAzureCredential()

blob_service = BlobServiceClient(
    account_url="https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

# Upload a blob
container_client = blob_service.get_container_client("my-container")
blob_client = container_client.get_blob_client("data/report.json")

with open("report.json", "rb") as f:
    blob_client.upload_blob(f, overwrite=True)

# Download a blob
download = blob_client.download_blob()
content = download.readall()
print(f"Downloaded {len(content)} bytes")
```

### .NET Example

```csharp
using Azure.Identity;
using Azure.Storage.Blobs;

// DefaultAzureCredential handles managed identity automatically
// No need for connection strings or account keys
var credential = new DefaultAzureCredential();

var blobServiceClient = new BlobServiceClient(
    new Uri("https://mystorageaccount.blob.core.windows.net"),
    credential
);

// List containers
await foreach (var container in blobServiceClient.GetBlobContainersAsync())
{
    Console.WriteLine($"Container: {container.Name}");
}

// Upload a blob
var containerClient = blobServiceClient.GetBlobContainerClient("my-container");
var blobClient = containerClient.GetBlobClient("data/report.json");
await blobClient.UploadAsync("report.json", overwrite: true);
```

### Node.js Example

```javascript
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

// The credential object handles token acquisition and renewal
// It uses managed identity when running in Azure
const credential = new DefaultAzureCredential();

const blobService = new BlobServiceClient(
    "https://mystorageaccount.blob.core.windows.net",
    credential
);

async function listBlobs() {
    const containerClient = blobService.getContainerClient("my-container");

    for await (const blob of containerClient.listBlobsFlat()) {
        console.log(`Blob: ${blob.name}, Size: ${blob.properties.contentLength}`);
    }
}

listBlobs().catch(console.error);
```

## How DefaultAzureCredential Works

`DefaultAzureCredential` tries multiple authentication methods in order:

1. **Environment variables**: Checks for `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
2. **Workload Identity**: For Kubernetes workloads
3. **Managed Identity**: Uses the system-assigned or user-assigned managed identity
4. **Azure CLI**: Uses the logged-in Azure CLI session (useful for local development)
5. **Azure PowerShell**: Uses the logged-in PowerShell session
6. **Interactive browser**: Prompts for login (disabled by default)

This chain means the same code works both locally (using your Azure CLI login) and in production (using managed identity), without any code changes.

## Using User-Assigned Managed Identities

If you need more control, use a user-assigned managed identity:

```bash
# Create a user-assigned managed identity
az identity create \
  --resource-group myResourceGroup \
  --name storage-reader-identity

# Get the identity's client ID and principal ID
CLIENT_ID=$(az identity show \
  --resource-group myResourceGroup \
  --name storage-reader-identity \
  --query "clientId" -o tsv)

PRINCIPAL_ID=$(az identity show \
  --resource-group myResourceGroup \
  --name storage-reader-identity \
  --query "principalId" -o tsv)

# Assign it to a web app
az webapp identity assign \
  --resource-group myResourceGroup \
  --name my-web-app \
  --identities "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.ManagedIdentity/userAssignedIdentities/storage-reader-identity"

# Assign the storage role
az role assignment create \
  --assignee "${PRINCIPAL_ID}" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount"
```

In your code, specify the client ID when using a user-assigned identity:

```python
from azure.identity import DefaultAzureCredential

# Specify the client ID of the user-assigned managed identity
# This is needed when the resource has multiple identities assigned
credential = DefaultAzureCredential(
    managed_identity_client_id="your-client-id-here"
)
```

## Disabling Key-Based Access

Once you have migrated to managed identities, you can disable key-based access to enforce that all authentication goes through Azure AD:

```bash
# Disable shared key access on the storage account
# After this, account keys and SAS tokens signed with account keys stop working
az storage account update \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --allow-shared-key-access false
```

This is the ultimate security posture - even if someone extracts an account key, it will not work. Be sure that all your applications and tools are using Azure AD authentication before flipping this switch.

## Troubleshooting

**403 AuthorizationPermissionMismatch**: The managed identity does not have the right RBAC role, or the role has not propagated yet. Verify the role assignment and wait 5 minutes.

**EnvironmentCredential: Environment variables not configured**: This is normal when running locally without environment variables. `DefaultAzureCredential` will fall through to the next method (Azure CLI).

**ManagedIdentityCredential: No managed identity endpoint found**: The code is not running on an Azure resource with a managed identity. If running locally, make sure you are logged in with `az login`.

Managed identities are the right way to authenticate Azure resources to storage. The initial setup takes a bit more work than pasting a connection string, but you end up with a system that has no secrets to manage, no keys to rotate, and fine-grained access control through RBAC. Once you make the switch, you will not want to go back.
