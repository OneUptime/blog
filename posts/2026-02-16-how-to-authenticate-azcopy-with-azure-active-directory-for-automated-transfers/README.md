# How to Authenticate AzCopy with Azure Active Directory for Automated Transfers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AzCopy, Azure Active Directory, Authentication, Service Principal, Managed Identity, Automation

Description: Learn how to authenticate AzCopy with Azure Active Directory using service principals and managed identities for secure automated data transfers.

---

Using SAS tokens for AzCopy authentication works fine for one-off transfers, but it falls apart for automated scenarios. SAS tokens expire, they are hard to rotate, and if leaked, they grant direct access to your storage account. Azure Active Directory (Azure AD) authentication solves these problems by letting you use service principals or managed identities with AzCopy, enabling secure automated transfers that integrate with your existing identity governance.

This guide covers three authentication methods: interactive login, service principal with client secret, and managed identity. We will focus on the automated methods since those are what you need for CI/CD pipelines, scheduled jobs, and production workloads.

## Why Azure AD over SAS Tokens?

Here is the comparison:

| Feature | SAS Token | Azure AD |
|---------|-----------|----------|
| Expiration management | Manual rotation | Automatic token refresh |
| Granularity | Storage account/container level | RBAC at any scope |
| Audit trail | Limited | Full Azure AD sign-in logs |
| Revocation | Rotate storage key to revoke all | Disable single service principal |
| Secret management | Token stored in configs/scripts | Managed identity = no secrets |
| Conditional access | None | Supported |

For any automated or production use, Azure AD is the better choice.

## Method 1: Interactive Login (Development Only)

For development and testing, the simplest approach is interactive login:

```bash
# Log in interactively - opens a browser
azcopy login

# For a specific tenant
azcopy login --tenant-id "12345678-abcd-1234-abcd-123456789012"

# Verify the login
azcopy login status
```

After logging in, your Azure AD token is cached and automatically refreshed. You can then run AzCopy commands without specifying any credentials:

```bash
# Copy data using Azure AD authentication (no SAS token needed)
azcopy copy \
  "/local/data/" \
  "https://stdata2026.blob.core.windows.net/uploads/" \
  --recursive
```

This method is not suitable for automation because it requires a browser for the login step.

## Method 2: Service Principal with Client Secret

For CI/CD pipelines and automated jobs, use a service principal. This is the most common approach for automation.

### Step 2a: Create a Service Principal

Create a service principal with a client secret:

```bash
# Create a service principal and capture the output
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "sp-azcopy-automation" \
  --role "Storage Blob Data Contributor" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stdata2026" \
  --query "{appId:appId, password:password, tenant:tenant}" \
  --output json)

# Extract the values
APP_ID=$(echo $SP_OUTPUT | jq -r '.appId')
CLIENT_SECRET=$(echo $SP_OUTPUT | jq -r '.password')
TENANT_ID=$(echo $SP_OUTPUT | jq -r '.tenant')

echo "Application ID: $APP_ID"
echo "Tenant ID: $TENANT_ID"
# Store the client secret securely - it is only shown once
```

The `Storage Blob Data Contributor` role grants read, write, and delete access to blob data. Use `Storage Blob Data Reader` if you only need read access.

### Step 2b: Authenticate AzCopy with the Service Principal

Set the credentials as environment variables and use `azcopy login` with the service principal flag:

```bash
# Set the client secret as an environment variable
# AzCopy reads this automatically during login
export AZCOPY_SPA_CLIENT_SECRET="$CLIENT_SECRET"

# Log in with the service principal
azcopy login \
  --service-principal \
  --application-id "$APP_ID" \
  --tenant-id "$TENANT_ID"

# Verify authentication
azcopy login status
```

Now you can run AzCopy commands without SAS tokens:

```bash
# Upload files using service principal authentication
azcopy copy \
  "/data/exports/" \
  "https://stdata2026.blob.core.windows.net/daily-exports/$(date +%Y-%m-%d)/" \
  --recursive

# Download files
azcopy copy \
  "https://stdata2026.blob.core.windows.net/reports/" \
  "/data/reports/" \
  --recursive

# Sync a directory (upload only new/changed files)
azcopy sync \
  "/data/website/" \
  "https://stdata2026.blob.core.windows.net/\$web/" \
  --recursive
```

### Step 2c: Use in a CI/CD Pipeline

Here is how to use the service principal in a GitHub Actions workflow:

```yaml
# .github/workflows/data-sync.yml
name: Sync Data to Azure Storage

on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Install AzCopy
        run: |
          wget -q https://aka.ms/downloadazcopy-v10-linux -O azcopy.tar.gz
          tar -xzf azcopy.tar.gz
          sudo mv azcopy_linux_amd64_*/azcopy /usr/local/bin/

      - name: Authenticate AzCopy
        env:
          # Store these as GitHub Actions secrets
          AZCOPY_SPA_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_APP_ID: ${{ secrets.AZURE_APP_ID }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
        run: |
          azcopy login \
            --service-principal \
            --application-id "$AZURE_APP_ID" \
            --tenant-id "$AZURE_TENANT_ID"

      - name: Sync data
        run: |
          azcopy sync \
            "./data/" \
            "https://stdata2026.blob.core.windows.net/synced-data/" \
            --recursive \
            --delete-destination true
```

## Method 3: Managed Identity (Best for Azure VMs and Services)

If AzCopy is running on an Azure VM, Azure App Service, or Azure Container Instance, managed identity is the gold standard. No secrets to manage at all - the identity is tied to the Azure resource itself.

### Step 3a: Enable Managed Identity

Enable system-assigned managed identity on your VM:

```bash
# Enable system-assigned managed identity on a VM
az vm identity assign \
  --resource-group rg-data \
  --name vm-data-processor

# Get the principal ID of the managed identity
PRINCIPAL_ID=$(az vm identity show \
  --resource-group rg-data \
  --name vm-data-processor \
  --query "principalId" -o tsv)

echo "Principal ID: $PRINCIPAL_ID"
```

### Step 3b: Assign Storage Roles

Grant the managed identity access to the storage account:

```bash
# Assign Storage Blob Data Contributor role to the managed identity
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stdata2026"
```

### Step 3c: Use AzCopy with Managed Identity

On the VM, authenticate AzCopy using the managed identity:

```bash
# Login with system-assigned managed identity
azcopy login --identity

# For user-assigned managed identity, specify the client ID
azcopy login --identity --identity-client-id "<managed-identity-client-id>"

# Now use AzCopy normally - no secrets needed
azcopy copy \
  "/data/backups/" \
  "https://stdata2026.blob.core.windows.net/backups/$(date +%Y-%m-%d)/" \
  --recursive
```

### Step 3d: Set Up a Scheduled Transfer with Managed Identity

Create a cron job on the VM for automated daily transfers:

```bash
# Create a script for the automated transfer
# This script logs in with managed identity and syncs data
```

The transfer script:

```bash
#!/bin/bash
# /opt/scripts/daily-sync.sh
# Daily data sync using AzCopy with managed identity

LOG_FILE="/var/log/azcopy-sync-$(date +%Y%m%d).log"

echo "Starting sync at $(date)" >> "$LOG_FILE"

# Login with managed identity (refreshes token)
azcopy login --identity >> "$LOG_FILE" 2>&1

# Sync data to Azure
azcopy sync \
  "/data/exports/" \
  "https://stdata2026.blob.core.windows.net/daily-exports/" \
  --recursive \
  --log-level WARNING >> "$LOG_FILE" 2>&1

# Check exit code
if [ $? -eq 0 ]; then
    echo "Sync completed successfully at $(date)" >> "$LOG_FILE"
else
    echo "Sync FAILED at $(date)" >> "$LOG_FILE"
    # Send alert (integrate with your monitoring system)
fi
```

Add it to cron:

```bash
# Run the sync script daily at 3 AM
# crontab -e
0 3 * * * /opt/scripts/daily-sync.sh
```

## Managing RBAC Roles for AzCopy

The RBAC role you assign determines what AzCopy can do. Here are the common roles:

| Role | Permissions |
|------|------------|
| Storage Blob Data Reader | Read blobs and containers |
| Storage Blob Data Contributor | Read, write, delete blobs and containers |
| Storage Blob Data Owner | Full access including ACLs |
| Storage Blob Delegator | Generate user delegation SAS tokens |

Follow the principle of least privilege. If AzCopy only needs to upload, use `Storage Blob Data Contributor`. If it only needs to download, use `Storage Blob Data Reader`.

You can scope roles at different levels:

```bash
# Scope to a single container (most restrictive)
az role assignment create \
  --assignee "$APP_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stdata2026/blobServices/default/containers/specific-container"

# Scope to the storage account (applies to all containers)
az role assignment create \
  --assignee "$APP_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stdata2026"
```

## Troubleshooting Authentication Issues

**Error: "AuthorizationPermissionMismatch"**: The service principal or managed identity does not have the right RBAC role. Verify the role assignment and ensure it is at the correct scope. Role assignments can take up to 5 minutes to propagate.

**Error: "AuthenticationFailed"**: The client secret may be expired or incorrect. Check the service principal in Azure AD and regenerate the secret if needed.

**Error: "No managed identity endpoint found"**: AzCopy is not running on an Azure resource with managed identity enabled, or the metadata service is not accessible. Verify with `curl -H "Metadata:true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://storage.azure.com/"`.

**Token refresh issues**: AzCopy caches tokens and refreshes them automatically. If you encounter stale token issues, clear the AzCopy login cache with `azcopy login --clear` and re-authenticate.

## Wrapping Up

Azure AD authentication with AzCopy eliminates the hassle of managing SAS tokens for automated transfers. For CI/CD pipelines, use a service principal with client secret stored in your pipeline's secret manager. For Azure VMs and services, managed identity is the cleanest solution since it requires no secrets at all. Whichever method you choose, always follow the principle of least privilege when assigning RBAC roles, and monitor your Azure AD sign-in logs to detect any unusual access patterns.
