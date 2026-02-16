# How to Fix Azure Managed Identity Authentication Failures in App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Identity, App Service, Authentication, Azure AD, Security, Troubleshooting

Description: Diagnose and resolve managed identity authentication failures in Azure App Service including token acquisition errors and RBAC misconfigurations.

---

Managed identities are one of the best features in Azure. They eliminate the need to store credentials in your application code or configuration. Instead of managing connection strings with passwords, your App Service gets an identity that Azure AD (now Entra ID) manages automatically. Tokens are rotated, credentials are stored securely, and your code just works.

Except when it does not. Managed identity authentication failures are surprisingly common, and the error messages rarely point you directly at the root cause. Let me walk you through the most frequent failure scenarios and how to fix each one.

## How Managed Identity Authentication Works

Before troubleshooting, it helps to understand the flow. When your App Service code requests a token using a managed identity, here is what happens:

1. Your code calls the local token endpoint (IDENTITY_ENDPOINT environment variable)
2. The App Service platform fetches a token from Azure AD on behalf of the managed identity
3. The token is returned to your code with a specific audience (the resource you are trying to access)
4. Your code presents the token to the target Azure service
5. The target service validates the token and checks RBAC permissions

Failures can occur at any of these steps. Let me cover each one.

## Problem: System-Assigned Identity Not Enabled

The most basic failure: your code tries to use a managed identity, but one has not been enabled on the App Service.

Symptoms: You get an error like "ManagedIdentityCredential authentication unavailable" or "IDENTITY_ENDPOINT not set."

Check and fix with the CLI.

```bash
# Check if system-assigned managed identity is enabled
az webapp identity show --resource-group myResourceGroup --name myAppService

# If the output is empty or principalId is null, enable it
az webapp identity assign --resource-group myResourceGroup --name myAppService
```

After enabling the identity, restart the App Service. The identity endpoint environment variables are set during startup, so existing worker processes will not see them until a restart.

## Problem: Wrong Identity Being Used

If you have both a system-assigned identity and one or more user-assigned identities on the same App Service, your code might be using the wrong one. Azure SDKs default to the system-assigned identity, but if you want to use a user-assigned identity, you need to specify it explicitly.

```python
# Python example: Using DefaultAzureCredential with a specific user-assigned identity
# You must provide the client_id of the user-assigned managed identity
from azure.identity import ManagedIdentityCredential

# Without specifying client_id, this uses the system-assigned identity
credential = ManagedIdentityCredential()

# To use a specific user-assigned identity, pass the client_id
credential = ManagedIdentityCredential(
    client_id="00000000-0000-0000-0000-000000000000"  # Replace with your identity's client ID
)
```

To list the identities on your App Service:

```bash
# Show all identities (system-assigned and user-assigned) on the App Service
az webapp identity show \
  --resource-group myResourceGroup \
  --name myAppService \
  --query "{systemAssigned:principalId, userAssigned:userAssignedIdentities}" \
  -o json
```

## Problem: Missing RBAC Role Assignment

This is the most common managed identity issue. The identity is enabled and tokens are being acquired successfully, but the target service rejects the request because the identity does not have the right permissions.

Symptoms: Your code gets a token without error, but the API call to the target service fails with a 403 Forbidden or an "AuthorizationFailed" error.

Check role assignments for your managed identity.

```bash
# Get the principal ID of the system-assigned identity
PRINCIPAL_ID=$(az webapp identity show \
  --resource-group myResourceGroup \
  --name myAppService \
  --query principalId -o tsv)

# List all role assignments for this identity
az role assignment list --assignee "$PRINCIPAL_ID" -o table

# If no role assignments exist for the target resource, add one
# Example: Grant Storage Blob Data Contributor on a storage account
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount"
```

Common mistake: assigning the "Reader" or "Contributor" role when a data-plane role is needed. For example, the "Contributor" role on a storage account lets you manage the storage account resource itself, but it does not let you read or write blob data. You need "Storage Blob Data Reader" or "Storage Blob Data Contributor" for that.

Here is a quick reference for common data-plane roles:

| Service | Read Role | Read/Write Role |
|---------|-----------|-----------------|
| Storage Blobs | Storage Blob Data Reader | Storage Blob Data Contributor |
| Key Vault Secrets | Key Vault Secrets User | Key Vault Secrets Officer |
| Key Vault Keys | Key Vault Crypto User | Key Vault Crypto Officer |
| Service Bus | Azure Service Bus Data Receiver | Azure Service Bus Data Owner |
| SQL Database | N/A (use SQL role) | N/A (use SQL role) |

## Problem: RBAC Propagation Delay

After creating a role assignment, it can take up to 10 minutes (sometimes longer) for the assignment to propagate through Azure's authorization system. If you just created the role assignment and are immediately testing, you might hit failures that resolve themselves after a few minutes.

This catches people constantly during deployments. Your infrastructure-as-code creates the role assignment and then immediately deploys the application, which starts making calls right away. The application fails because the role assignment has not propagated yet.

The fix is to add a delay in your deployment pipeline between role assignment creation and application startup. A 5-minute wait is usually sufficient but not always.

## Problem: Token Audience Mismatch

When requesting a token, you need to specify the correct resource (audience) for the service you are calling. Each Azure service has a specific resource URI.

```csharp
// C# example: Requesting a token for Azure Storage
// The resource must match the service you are calling
var credential = new ManagedIdentityCredential();

// Correct: Use the proper resource URI for Azure Storage
var token = await credential.GetTokenAsync(
    new TokenRequestContext(new[] { "https://storage.azure.com/.default" })
);

// Common mistake: Using the wrong resource URI
// This token will not work for Storage even though it is valid
var wrongToken = await credential.GetTokenAsync(
    new TokenRequestContext(new[] { "https://management.azure.com/.default" })
);
```

Common resource URIs:
- Azure Storage: `https://storage.azure.com/.default`
- Azure SQL Database: `https://database.windows.net/.default`
- Azure Key Vault: `https://vault.azure.net/.default`
- Azure Service Bus: `https://servicebus.azure.net/.default`
- Azure Resource Manager: `https://management.azure.com/.default`

If you use the Azure SDKs, they handle the resource URI automatically. This problem mainly comes up when you are making raw HTTP calls or using generic token acquisition methods.

## Problem: Key Vault Access Policy vs RBAC

Key Vault has two authorization models: access policies (legacy) and Azure RBAC (recommended). If your Key Vault uses access policies, RBAC role assignments will not work. And vice versa.

Check which model your Key Vault uses:

```bash
# Check if RBAC authorization is enabled on the Key Vault
az keyvault show --name myKeyVault \
  --query "properties.enableRbacAuthorization" -o tsv
```

If it returns `false` or nothing, the Key Vault uses access policies. You need to add an access policy for the managed identity instead of an RBAC role assignment.

```bash
# Add an access policy for the managed identity to read secrets
az keyvault set-policy \
  --name myKeyVault \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list
```

## Problem: Deployment Slot Identity Issues

Each App Service deployment slot has its own managed identity. The staging slot's identity is different from the production slot's identity. If you set up RBAC for the production identity but then test from the staging slot, authentication will fail.

Make sure you assign roles to the identities of all slots that need access.

```bash
# Get the identity of the staging slot
STAGING_PRINCIPAL=$(az webapp identity show \
  --resource-group myResourceGroup \
  --name myAppService \
  --slot staging \
  --query principalId -o tsv)

# Assign the same role to the staging slot's identity
az role assignment create \
  --assignee "$STAGING_PRINCIPAL" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount"
```

## Debugging Tips

When you are stuck, enable detailed logging in your application. The Azure SDK libraries support logging that shows token acquisition details.

For .NET applications, set the `AZURE_SDK_LOGGING` environment variable to `true`. For Python, configure the logging module to show DEBUG level messages from the `azure.identity` logger.

You can also test managed identity token acquisition directly from the App Service using Kudu (Advanced Tools). Open the Kudu console and make a curl request to the identity endpoint.

```bash
# Test token acquisition from Kudu console (runs inside the App Service)
# IDENTITY_ENDPOINT and IDENTITY_HEADER are set automatically
curl "$IDENTITY_ENDPOINT?resource=https://vault.azure.net&api-version=2019-08-01" \
  -H "X-IDENTITY-HEADER: $IDENTITY_HEADER"
```

If this returns a valid token, the managed identity is working and the problem is in your RBAC configuration or how your code uses the token. If it fails, the problem is with the identity itself.

Managed identity issues are almost always configuration problems. The identity is not enabled, the wrong role is assigned, or the token audience does not match. Work through these systematically and you will find the root cause.
