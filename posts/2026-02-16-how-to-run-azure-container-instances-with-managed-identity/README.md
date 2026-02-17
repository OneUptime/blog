# How to Run Azure Container Instances with Managed Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, Managed Identity, Security, Authentication, Key Vault, Cloud Computing

Description: How to assign and use managed identities with Azure Container Instances to securely access Azure services without storing credentials in your containers.

---

Running containers that need to access other Azure services - storage accounts, Key Vault, databases, message queues - traditionally means embedding credentials in your container configuration. This is a security risk. Credentials in environment variables can be leaked through logs, process listings, or compromised containers.

Managed Identity solves this by giving your container group an identity in Azure Active Directory. Your container can then request access tokens from the Azure metadata service and use them to authenticate to any Azure service that supports AAD authentication. No credentials stored anywhere.

This post covers how to set up managed identities for ACI, use them to access various Azure services, and handle the practical details.

## Types of Managed Identity

ACI supports both types of managed identity:

- **System-assigned** - Created with the container group and deleted when the group is deleted. One identity per container group.
- **User-assigned** - Created as a standalone resource. Can be assigned to multiple container groups. Persists independently.

Use system-assigned for simple cases where the identity lifecycle matches the container group. Use user-assigned when you want to pre-configure access policies before deploying containers or share an identity across multiple container groups.

## Setting Up a System-Assigned Identity

### Using Azure CLI

```bash
# Create a container group with a system-assigned managed identity
az container create \
    --resource-group my-resource-group \
    --name my-container \
    --image myregistry.azurecr.io/my-app:latest \
    --cpu 1 \
    --memory 2 \
    --assign-identity \
    --ports 8080 \
    --ip-address Public

# Get the principal ID of the identity (needed for role assignments)
PRINCIPAL_ID=$(az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "identity.principalId" \
    --output tsv)

echo "Principal ID: $PRINCIPAL_ID"
```

### Using YAML

```yaml
# system-identity.yaml - Container group with system-assigned identity
apiVersion: '2021-09-01'
location: eastus
name: my-container
identity:
  type: SystemAssigned
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/my-app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 8080
            protocol: TCP
  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

## Setting Up a User-Assigned Identity

```bash
# Create a user-assigned managed identity
az identity create \
    --resource-group my-resource-group \
    --name aci-identity

# Get the identity's resource ID and client ID
IDENTITY_ID=$(az identity show \
    --resource-group my-resource-group \
    --name aci-identity \
    --query id -o tsv)

CLIENT_ID=$(az identity show \
    --resource-group my-resource-group \
    --name aci-identity \
    --query clientId -o tsv)

PRINCIPAL_ID=$(az identity show \
    --resource-group my-resource-group \
    --name aci-identity \
    --query principalId -o tsv)

# Create a container group with the user-assigned identity
az container create \
    --resource-group my-resource-group \
    --name my-container \
    --image myregistry.azurecr.io/my-app:latest \
    --cpu 1 \
    --memory 2 \
    --assign-identity $IDENTITY_ID \
    --ports 8080 \
    --ip-address Public
```

### Using YAML with User-Assigned Identity

```yaml
# user-identity.yaml - Container group with user-assigned identity
apiVersion: '2021-09-01'
location: eastus
name: my-container
identity:
  type: UserAssigned
  userAssignedIdentities:
    '/subscriptions/<sub-id>/resourceGroups/my-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/aci-identity': {}
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/my-app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 8080
            protocol: TCP
        environmentVariables:
          # Pass the client ID so the app knows which identity to use
          - name: AZURE_CLIENT_ID
            value: '<client-id-of-identity>'
  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

## Granting Access to Azure Services

After creating the identity, grant it access to the Azure services your container needs.

### Access to Azure Key Vault

```bash
# Grant the identity permission to read secrets from Key Vault
az keyvault set-policy \
    --name my-vault \
    --object-id $PRINCIPAL_ID \
    --secret-permissions get list

# Or using RBAC (recommended)
VAULT_ID=$(az keyvault show --name my-vault --query id -o tsv)
az role assignment create \
    --assignee $PRINCIPAL_ID \
    --role "Key Vault Secrets User" \
    --scope $VAULT_ID
```

### Access to Azure Storage

```bash
# Grant the identity read/write access to a storage account
STORAGE_ID=$(az storage account show \
    --name mystorageaccount \
    --resource-group my-resource-group \
    --query id -o tsv)

az role assignment create \
    --assignee $PRINCIPAL_ID \
    --role "Storage Blob Data Contributor" \
    --scope $STORAGE_ID
```

### Access to Azure SQL Database

```bash
# Grant the identity access to Azure SQL
# This requires running a SQL command on the database
# First, connect to the database and run:
# CREATE USER [aci-identity] FROM EXTERNAL PROVIDER;
# ALTER ROLE db_datareader ADD MEMBER [aci-identity];
# ALTER ROLE db_datawriter ADD MEMBER [aci-identity];
```

### Access to Azure Container Registry

```bash
# Grant the identity permission to pull images from ACR
ACR_ID=$(az acr show --name myregistry --query id -o tsv)

az role assignment create \
    --assignee $PRINCIPAL_ID \
    --role "AcrPull" \
    --scope $ACR_ID
```

## Using Managed Identity in Application Code

Your application retrieves tokens from the Azure Instance Metadata Service (IMDS) endpoint. The Azure SDKs handle this automatically through the `DefaultAzureCredential` class.

### Python Example - Accessing Key Vault

```python
# app.py - Access Key Vault using managed identity
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient

# DefaultAzureCredential automatically detects managed identity in ACI
# For user-assigned identity, pass the client_id
credential = DefaultAzureCredential()

# If using a user-assigned identity, specify the client ID
# credential = ManagedIdentityCredential(client_id="your-client-id")

# Create a Key Vault client
client = SecretClient(
    vault_url="https://my-vault.vault.azure.net",
    credential=credential
)

# Read secrets securely without any credentials in code
db_password = client.get_secret("database-password").value
api_key = client.get_secret("external-api-key").value

print("Secrets retrieved successfully via managed identity")
```

### Python Example - Accessing Azure Storage

```python
# storage_app.py - Access Azure Blob Storage using managed identity
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

# Use managed identity for authentication
credential = DefaultAzureCredential()

# Create a Blob Storage client
blob_service = BlobServiceClient(
    account_url="https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

# Upload a file to blob storage
container_client = blob_service.get_container_client("data")
with open("/app/output.json", "rb") as data:
    container_client.upload_blob("results/output.json", data, overwrite=True)

print("File uploaded to blob storage via managed identity")
```

### Node.js Example

```javascript
// app.js - Access Azure services using managed identity in Node.js
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const { BlobServiceClient } = require("@azure/storage-blob");

// DefaultAzureCredential automatically uses managed identity in ACI
const credential = new DefaultAzureCredential();

async function main() {
    // Access Key Vault
    const secretClient = new SecretClient(
        "https://my-vault.vault.azure.net",
        credential
    );
    const secret = await secretClient.getSecret("database-password");
    console.log("Secret retrieved:", secret.name);

    // Access Blob Storage
    const blobClient = new BlobServiceClient(
        "https://mystorageaccount.blob.core.windows.net",
        credential
    );
    const containers = blobClient.listContainers();
    for await (const container of containers) {
        console.log("Container:", container.name);
    }
}

main().catch(console.error);
```

### .NET Example

```csharp
// Program.cs - Access Azure services using managed identity in .NET
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Azure.Storage.Blobs;

// DefaultAzureCredential picks up the managed identity automatically
var credential = new DefaultAzureCredential();

// Access Key Vault
var secretClient = new SecretClient(
    new Uri("https://my-vault.vault.azure.net"),
    credential
);
var secret = await secretClient.GetSecretAsync("database-password");
Console.WriteLine($"Secret retrieved: {secret.Value.Name}");

// Access Blob Storage
var blobClient = new BlobServiceClient(
    new Uri("https://mystorageaccount.blob.core.windows.net"),
    credential
);
var containers = blobClient.GetBlobContainers();
foreach (var container in containers)
{
    Console.WriteLine($"Container: {container.Name}");
}
```

## Using Both Identity Types Together

You can assign both a system-assigned and user-assigned identity to the same container group:

```yaml
# both-identities.yaml - Container with both identity types
apiVersion: '2021-09-01'
location: eastus
name: my-container
identity:
  type: SystemAssigned, UserAssigned
  userAssignedIdentities:
    '/subscriptions/<sub-id>/resourceGroups/my-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/aci-identity': {}
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/my-app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
  osType: Linux
type: Microsoft.ContainerInstance/containerGroups
```

## Getting a Token Manually

If you are not using the Azure SDK, you can request a token directly from the IMDS endpoint:

```bash
# From inside the container, request a token for Azure Key Vault
curl -s \
    'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net' \
    -H 'Metadata: true'

# For user-assigned identity, include the client_id parameter
curl -s \
    'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net&client_id=<your-client-id>' \
    -H 'Metadata: true'
```

The response includes an access token that you can use in the Authorization header of requests to Azure services.

## Troubleshooting

### "No managed identity found"

The managed identity is not configured on the container group. Verify:

```bash
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "identity" \
    --output json
```

### "Forbidden" or "Unauthorized" errors

The identity does not have the required role assignment. Check:

```bash
# List role assignments for the identity
az role assignment list \
    --assignee $PRINCIPAL_ID \
    --output table
```

Role assignments can take a few minutes to propagate. If you just created the assignment, wait and retry.

### Token request times out

Make sure the container can reach the IMDS endpoint at `169.254.169.254`. This should work automatically in ACI, but VNet configurations or custom DNS settings might interfere.

## Summary

Managed Identity is the recommended way for ACI containers to authenticate to Azure services. It eliminates credential management, reduces security risk, and integrates seamlessly with the Azure SDK. Use system-assigned identity for simple deployments and user-assigned identity when you need to share access across container groups or pre-configure permissions. The Azure SDKs make it transparent - your application code looks the same whether it runs locally with your Azure CLI credentials or in ACI with a managed identity.
