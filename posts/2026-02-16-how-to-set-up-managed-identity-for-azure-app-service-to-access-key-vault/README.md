# How to Set Up Managed Identity for Azure App Service to Access Key Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Managed Identity, Key Vault, Security, Secrets Management, Cloud Computing

Description: How to use Azure Managed Identity to securely connect your App Service to Azure Key Vault without storing credentials in your application.

---

Storing secrets like database connection strings, API keys, and certificates in your application configuration is risky. If someone gets access to your code repository or app settings, they get your secrets. Azure Managed Identity solves this by giving your App Service an identity in Azure Active Directory, which it can use to authenticate to other Azure services like Key Vault - without any credentials stored anywhere.

This post walks through setting up Managed Identity on an App Service and configuring it to read secrets from Azure Key Vault.

## Why Managed Identity?

The traditional approach to accessing Key Vault from an application involves creating a service principal, generating a client secret, and storing that secret in your app configuration. The problem is obvious - you now have a secret to protect your secrets.

Managed Identity eliminates this chicken-and-egg problem. Azure automatically manages the identity's credentials, rotates them, and makes them available to your application through a local token endpoint. Your code never sees or handles any credentials.

There are two types of managed identities:

- **System-assigned** - Tied to a specific App Service instance. Created and deleted with the App Service. Each App Service gets exactly one.
- **User-assigned** - Created as a standalone Azure resource. Can be assigned to multiple App Services. Useful when multiple services need the same identity.

For most cases, system-assigned is simpler. Use user-assigned when you need to share an identity across services or when you want the identity to persist after the App Service is deleted.

## Step 1: Enable Managed Identity on Your App Service

### System-Assigned Identity

```bash
# Enable system-assigned managed identity
az webapp identity assign \
    --name my-app-service \
    --resource-group my-resource-group

# This returns the principalId - save it, you will need it
# Example output:
# {
#   "principalId": "abc12345-def6-7890-abcd-ef1234567890",
#   "tenantId": "your-tenant-id",
#   "type": "SystemAssigned"
# }
```

### User-Assigned Identity

```bash
# Create a user-assigned managed identity
az identity create \
    --name my-app-identity \
    --resource-group my-resource-group

# Get the identity's resource ID and client ID
IDENTITY_ID=$(az identity show --name my-app-identity --resource-group my-resource-group --query id -o tsv)
CLIENT_ID=$(az identity show --name my-app-identity --resource-group my-resource-group --query clientId -o tsv)

# Assign it to the App Service
az webapp identity assign \
    --name my-app-service \
    --resource-group my-resource-group \
    --identities $IDENTITY_ID
```

## Step 2: Create a Key Vault and Add Secrets

If you do not have a Key Vault yet:

```bash
# Create a Key Vault
az keyvault create \
    --name my-app-vault \
    --resource-group my-resource-group \
    --location eastus

# Add some secrets
az keyvault secret set \
    --vault-name my-app-vault \
    --name "DatabaseConnectionString" \
    --value "Server=myserver.database.windows.net;Database=mydb;Authentication=Active Directory Default"

az keyvault secret set \
    --vault-name my-app-vault \
    --name "ApiKey" \
    --value "sk-your-api-key-here"

az keyvault secret set \
    --vault-name my-app-vault \
    --name "StorageAccountKey" \
    --value "your-storage-key-here"
```

## Step 3: Grant the Managed Identity Access to Key Vault

The managed identity needs permission to read secrets from the Key Vault. There are two access models:

### Using RBAC (Recommended)

Azure RBAC is the newer and recommended approach:

```bash
# Get the principal ID of the managed identity
PRINCIPAL_ID=$(az webapp identity show \
    --name my-app-service \
    --resource-group my-resource-group \
    --query principalId -o tsv)

# Get the Key Vault resource ID
VAULT_ID=$(az keyvault show \
    --name my-app-vault \
    --query id -o tsv)

# Grant the "Key Vault Secrets User" role
# This allows reading secrets but not modifying them
az role assignment create \
    --assignee $PRINCIPAL_ID \
    --role "Key Vault Secrets User" \
    --scope $VAULT_ID
```

Available Key Vault RBAC roles:

- **Key Vault Secrets User** - Read secrets (most common for applications)
- **Key Vault Secrets Officer** - Read, write, and delete secrets
- **Key Vault Certificates User** - Read certificates
- **Key Vault Crypto User** - Perform cryptographic operations

### Using Access Policies (Legacy)

If your Key Vault uses the access policy model:

```bash
# Grant the managed identity permission to get secrets
az keyvault set-policy \
    --name my-app-vault \
    --object-id $PRINCIPAL_ID \
    --secret-permissions get list
```

## Step 4: Reference Key Vault Secrets in App Settings

The simplest way to use Key Vault secrets in your App Service is through Key Vault references. This lets you reference secrets directly in your app settings without changing any application code.

```bash
# Set an app setting that references a Key Vault secret
az webapp config appsettings set \
    --name my-app-service \
    --resource-group my-resource-group \
    --settings \
        "DatabaseConnectionString=@Microsoft.KeyVault(SecretUri=https://my-app-vault.vault.azure.net/secrets/DatabaseConnectionString/)" \
        "ApiKey=@Microsoft.KeyVault(SecretUri=https://my-app-vault.vault.azure.net/secrets/ApiKey/)" \
        "StorageAccountKey=@Microsoft.KeyVault(SecretUri=https://my-app-vault.vault.azure.net/secrets/StorageAccountKey/)"
```

The syntax is `@Microsoft.KeyVault(SecretUri=<secret-uri>)`. When your app reads these settings, Azure automatically fetches the current value from Key Vault.

You can also pin to a specific version:

```bash
# Reference a specific secret version
az webapp config appsettings set \
    --name my-app-service \
    --resource-group my-resource-group \
    --settings \
        "ApiKey=@Microsoft.KeyVault(SecretUri=https://my-app-vault.vault.azure.net/secrets/ApiKey/abc123def456)"
```

## Step 5: Access Key Vault from Application Code

For more dynamic secret access, you can use the Azure SDK directly. Here is an example in different languages.

### .NET

```csharp
// Program.cs - Access Key Vault using Managed Identity
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

// DefaultAzureCredential automatically uses the managed identity
// when running on Azure App Service
var client = new SecretClient(
    new Uri("https://my-app-vault.vault.azure.net"),
    new DefaultAzureCredential()
);

// Retrieve a secret
KeyVaultSecret secret = await client.GetSecretAsync("DatabaseConnectionString");
string connectionString = secret.Value;
```

### Node.js

```javascript
// app.js - Access Key Vault using Managed Identity in Node.js
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

// DefaultAzureCredential picks up the managed identity automatically
const credential = new DefaultAzureCredential();
const client = new SecretClient(
    "https://my-app-vault.vault.azure.net",
    credential
);

async function getSecret(secretName) {
    // Fetch the secret from Key Vault
    const secret = await client.getSecret(secretName);
    return secret.value;
}

// Usage
const dbConnection = await getSecret("DatabaseConnectionString");
```

### Python

```python
# app.py - Access Key Vault using Managed Identity in Python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# The credential automatically uses managed identity on Azure
credential = DefaultAzureCredential()
client = SecretClient(
    vault_url="https://my-app-vault.vault.azure.net",
    credential=credential
)

# Retrieve a secret
secret = client.get_secret("DatabaseConnectionString")
connection_string = secret.value
```

The `DefaultAzureCredential` class is the key here. It automatically detects the environment and uses the appropriate authentication method:

- On Azure App Service: Uses the managed identity
- In local development: Uses Azure CLI credentials, Visual Studio credentials, or environment variables

## Verifying the Setup

After configuring everything, verify it works:

```bash
# Check the status of Key Vault references in app settings
az webapp config appsettings list \
    --name my-app-service \
    --resource-group my-resource-group \
    --query "[?contains(value, 'Microsoft.KeyVault')].{name:name, value:value}" \
    --output table
```

In the Azure Portal, go to Configuration > Application settings. Key Vault references show a green checkmark if the reference is resolved successfully, or a red X if there is a problem.

Common issues when Key Vault references fail:

- The managed identity does not have the right permissions on the Key Vault
- The secret name or URI is incorrect
- The Key Vault has network restrictions that block the App Service
- The Key Vault uses access policies but the managed identity is not in the policy

## Security Best Practices

1. **Use least privilege** - Grant only "Key Vault Secrets User" role, not broader roles.
2. **Use RBAC over access policies** - RBAC provides finer-grained control and is the recommended model.
3. **Enable soft-delete and purge protection** - Prevents accidental permanent deletion of secrets.
4. **Audit access** - Enable diagnostic logging on Key Vault to see who accesses what.
5. **Rotate secrets regularly** - When you update a secret in Key Vault, App Service picks up the new value within 24 hours (or immediately on restart).

## Summary

Managed Identity with Key Vault is the right way to handle secrets in Azure App Service. There are no credentials to manage, no secrets in source code, and no risk of key rotation breaking your application. The setup takes about 15 minutes, and the result is a significantly more secure application. If you are still storing connection strings directly in your app settings, take the time to move them to Key Vault - it is one of the highest-value security improvements you can make.
