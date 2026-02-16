# How to Connect Azure Storage Explorer to a Storage Account Using SAS Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage Explorer, SAS Tokens, Authentication, Blob Storage, Security, Access Control

Description: Learn how to generate SAS tokens and use them to connect Azure Storage Explorer to storage accounts with scoped, time-limited access.

---

Not everyone on your team needs full access to an Azure subscription to work with storage. Sometimes a developer needs to upload files to a specific container, or an external partner needs to download reports from a blob. Shared Access Signatures (SAS) let you grant scoped, time-limited access to Azure Storage resources without sharing the account key or granting Azure AD permissions. This post shows you how to generate SAS tokens and use them with Azure Storage Explorer.

## What Is a SAS Token?

A SAS token is a string appended to a storage URL that grants specific permissions for a specific time window. There are three types:

- **Account SAS**: Grants access to one or more storage services (blob, queue, table, file) at the account level
- **Service SAS**: Grants access to a specific service (for example, just blob storage)
- **User Delegation SAS**: Uses Azure AD credentials instead of the account key to sign the token, which is the most secure option

The token looks like a query string with parameters that define the permissions, expiry, allowed IP ranges, and a cryptographic signature that prevents tampering.

## Generating a SAS Token via Azure Portal

The quickest way to generate a SAS token is through the Azure Portal.

1. Navigate to your storage account
2. In the left menu, click "Shared access signature" (for an account SAS) or navigate to a specific container and click "Shared access tokens" (for a service SAS)
3. Configure the parameters:
   - **Allowed services**: Select which services the token can access
   - **Allowed resource types**: Service, Container, and/or Object
   - **Allowed permissions**: Read, Write, Delete, List, etc.
   - **Start and expiry date/time**: Set a reasonable expiry - do not leave this open for years
   - **Allowed IP addresses**: Optionally restrict to specific client IPs
   - **Allowed protocols**: HTTPS only is recommended
4. Click "Generate SAS and connection string"
5. Copy the SAS token or the full connection string

## Generating a SAS Token via Azure CLI

For reproducibility, use the CLI to generate tokens. Here is how to create an account-level SAS:

```bash
# Generate an account SAS token with read and list permissions
# Valid for 24 hours, restricted to blob service only
az storage account generate-sas \
  --account-name mystorageaccount \
  --resource-types sco \
  --services b \
  --permissions rl \
  --expiry $(date -u -d "+24 hours" +%Y-%m-%dT%H:%MZ) \
  --https-only \
  --output tsv
```

For a more granular service SAS scoped to a specific container:

```bash
# Generate a service SAS for a specific container
# Grants read, list, and write permissions
az storage container generate-sas \
  --account-name mystorageaccount \
  --name my-container \
  --permissions rlw \
  --expiry $(date -u -d "+24 hours" +%Y-%m-%dT%H:%MZ) \
  --https-only \
  --output tsv
```

For the most secure option, generate a User Delegation SAS that does not require the account key:

```bash
# First, get a user delegation key (requires Azure AD login)
# Then generate the SAS signed with the delegation key
az storage blob generate-sas \
  --account-name mystorageaccount \
  --container-name my-container \
  --name "reports/monthly-summary.pdf" \
  --permissions r \
  --expiry $(date -u -d "+2 hours" +%Y-%m-%dT%H:%MZ) \
  --as-user \
  --auth-mode login \
  --https-only \
  --output tsv
```

## Connecting Storage Explorer with a SAS Token

Now that you have a SAS token, here is how to use it in Storage Explorer.

### Connect with a Service SAS URI

This is the most common approach when someone shares a SAS URL for a specific container or blob.

1. Open Azure Storage Explorer
2. Click the plug icon in the left sidebar ("Manage Connections")
3. Click "Add a resource" (the + icon)
4. Select "Blob container" (or Queue, Table, File Share depending on what you need)
5. Select "Shared access signature URL (SAS)" as the connection method
6. Paste the full SAS URI (the storage URL with the SAS token appended)
7. Give the connection a display name that helps you identify it later
8. Click Connect

The container appears in the left panel under "Attached & Local" with the display name you chose.

### Connect with an Account SAS

If you have an account-level SAS that grants access to the entire storage account:

1. Open the "Add a resource" dialog
2. Select "Storage account or service"
3. Select "Shared access signature (SAS)"
4. Paste the SAS token (just the token part, not the full URL)
5. Enter the storage account name
6. Click Connect

This gives you access to all the services and resources that the SAS token permits.

### Connect with a Connection String

If you were given a full connection string (which includes the account name and SAS token together):

1. Open the "Add a resource" dialog
2. Select "Storage account or service"
3. Select "Connection string"
4. Paste the connection string
5. Click Connect

## SAS Token Best Practices

Generating SAS tokens is easy, but using them securely requires some thought.

### Use Short Expiry Times

Do not create SAS tokens that last for months or years. A leaked token with a long expiry is a security incident waiting to happen. For one-off file sharing, 24 hours is usually enough. For ongoing access, use stored access policies that you can revoke.

### Apply Least Privilege

Only grant the permissions that are actually needed. If someone only needs to download files, give them read and list permissions - not write or delete. The permission codes are:

| Code | Permission |
|------|-----------|
| r | Read |
| w | Write |
| d | Delete |
| l | List |
| a | Add |
| c | Create |
| u | Update |
| p | Process (for queues) |

### Use Stored Access Policies for Revocable Access

A stored access policy is a set of constraints defined on a container, queue, table, or file share. When you create a SAS token that references a stored access policy, you can revoke the token by deleting or modifying the policy.

```bash
# Create a stored access policy on a container
az storage container policy create \
  --account-name mystorageaccount \
  --container-name shared-reports \
  --name "external-reader" \
  --permissions rl \
  --expiry $(date -u -d "+30 days" +%Y-%m-%dT%H:%MZ)

# Generate a SAS token using the policy
az storage container generate-sas \
  --account-name mystorageaccount \
  --name shared-reports \
  --policy-name "external-reader" \
  --output tsv
```

If you need to revoke access, just delete the policy:

```bash
# Revoke access by deleting the stored access policy
# All SAS tokens referencing this policy become invalid immediately
az storage container policy delete \
  --account-name mystorageaccount \
  --container-name shared-reports \
  --name "external-reader"
```

### Prefer User Delegation SAS

When possible, use User Delegation SAS tokens. They are signed with Azure AD credentials instead of the storage account key, which means:

- The account key is never exposed
- Token creation is audited through Azure AD
- Permissions are tied to the Azure AD identity's RBAC roles

### Restrict by IP Address

If you know the client's IP address, add an IP restriction to the SAS token. This way, even if the token is leaked, it can only be used from the authorized IP.

```bash
# Generate a SAS restricted to a specific IP address
az storage container generate-sas \
  --account-name mystorageaccount \
  --name my-container \
  --permissions rl \
  --expiry $(date -u -d "+24 hours" +%Y-%m-%dT%H:%MZ) \
  --ip "203.0.113.50" \
  --https-only \
  --output tsv
```

## Troubleshooting SAS Token Issues in Storage Explorer

If your SAS token connection is not working, here are the common problems:

**AuthenticationFailed error**: The SAS token has expired or the permissions do not match what you are trying to do. Check the `se` (expiry) parameter in the token.

**AuthorizationPermissionMismatch**: The SAS token does not include the necessary permission. For example, trying to list blobs with a token that only has read (r) permission. You also need list (l).

**AuthorizationSourceIPMismatch**: The token has an IP restriction and your current IP does not match. Check with `curl ifconfig.me` to see your public IP.

**InvalidQueryParameterValue**: The SAS token might be malformed. Make sure you copied the entire token without extra whitespace or missing characters.

**Clock skew**: SAS tokens have a start time. If your local clock is significantly ahead of Azure's servers, the token might not be valid yet. The safest approach is to set the start time a few minutes in the past.

SAS tokens paired with Storage Explorer give you a practical way to share access to Azure Storage without over-provisioning permissions or exposing sensitive credentials. Keep the tokens short-lived, scoped, and use stored access policies when you need the ability to revoke. This approach works well for development teams, cross-organization sharing, and any scenario where full Azure AD integration is not feasible.
