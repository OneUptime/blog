# How to Generate and Use SAS Tokens for Secure Azure Blob Storage Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, SAS Tokens, Security, Access Control, Azure Storage, Cloud Security

Description: A practical guide to generating and using Shared Access Signature tokens to grant temporary and scoped access to Azure Blob Storage resources.

---

Sharing access to Azure Blob Storage without handing over your account keys is a fundamental security practice. Shared Access Signatures, or SAS tokens, solve this problem by letting you create time-limited, permission-scoped URLs that grant access to specific blobs, containers, or even your entire storage account. You control exactly what a user or service can do and for how long.

I have seen teams pass around storage account keys in Slack channels and embed them in client-side code. SAS tokens exist so you never have to do that.

## What Exactly Is a SAS Token?

A SAS token is a string appended to a blob URL as query parameters. It contains an encoded set of permissions, an expiry time, and a cryptographic signature. When someone presents a URL with a valid SAS token, Azure verifies the signature and grants the specified access.

There are three types of SAS tokens:

- **Account SAS** - Grants access to resources across one or more storage services (Blob, Queue, Table, File).
- **Service SAS** - Grants access to resources in a single storage service.
- **User delegation SAS** - The most secure option. Signed with Azure AD credentials instead of the account key.

User delegation SAS is the recommended approach when possible because it does not rely on the storage account key. If the key gets rotated or compromised, account-key-based SAS tokens become invalid. User delegation SAS ties access to an Azure AD identity instead.

## Generating a SAS Token in the Azure Portal

The quickest way to get a SAS token for testing is through the portal.

1. Navigate to your storage account.
2. Click "Shared access signature" under "Security + networking."
3. Select the allowed services, resource types, and permissions.
4. Set the start and expiry date/time.
5. Choose the allowed IP addresses (optional but recommended for production).
6. Select the signing key.
7. Click "Generate SAS and connection string."

The portal gives you the SAS token string and the full connection string. Copy the token immediately because it will not be stored anywhere.

## Generating a SAS Token with Azure CLI

For automation, the CLI is more practical. Here is how to generate a service SAS for a specific container:

```bash
# Generate a SAS token for a container with read and list permissions
# Valid for 24 hours from now
az storage container generate-sas \
  --account-name mystorageaccount \
  --name mycontainer \
  --permissions rl \
  --expiry $(date -u -d "24 hours" '+%Y-%m-%dT%H:%MZ') \
  --auth-mode key \
  --account-key $STORAGE_ACCOUNT_KEY
```

The permissions string uses single-character codes: `r` (read), `w` (write), `d` (delete), `l` (list), `a` (add), `c` (create). You combine them as needed.

For a blob-level SAS:

```bash
# Generate a SAS token for a specific blob with read-only permission
az storage blob generate-sas \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name myfile.pdf \
  --permissions r \
  --expiry $(date -u -d "1 hour" '+%Y-%m-%dT%H:%MZ') \
  --auth-mode key \
  --account-key $STORAGE_ACCOUNT_KEY
```

## Generating a User Delegation SAS

User delegation SAS tokens are signed using Azure AD credentials rather than the storage account key. This is the preferred method for production scenarios.

First, you need to get a user delegation key:

```bash
# Get a user delegation key (requires Azure AD authentication)
az storage blob generate-sas \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name myfile.pdf \
  --permissions r \
  --expiry $(date -u -d "1 hour" '+%Y-%m-%dT%H:%MZ') \
  --auth-mode login \
  --as-user
```

The `--auth-mode login` flag tells Azure to use your Azure AD credentials, and `--as-user` creates a user delegation SAS instead of an account-key SAS.

## Generating SAS Tokens Programmatically

In most real applications, you generate SAS tokens in your backend code. Here is an example using the Azure SDK for Python:

```python
from datetime import datetime, timedelta, timezone
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions

# Initialize the BlobServiceClient with your connection string
account_name = "mystorageaccount"
account_key = "your-account-key"

# Define the SAS token parameters
container_name = "mycontainer"
blob_name = "reports/monthly-report.pdf"

# Generate the SAS token with read permission, valid for 2 hours
sas_token = generate_blob_sas(
    account_name=account_name,
    container_name=container_name,
    blob_name=blob_name,
    account_key=account_key,
    permission=BlobSasPermissions(read=True),
    expiry=datetime.now(timezone.utc) + timedelta(hours=2),
    start=datetime.now(timezone.utc) - timedelta(minutes=5),  # small buffer for clock skew
    protocol="https"  # enforce HTTPS only
)

# Build the full URL with the SAS token appended
blob_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"
print(f"Accessible URL: {blob_url}")
```

And here is the same thing in C# with the Azure.Storage.Blobs SDK:

```csharp
using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Azure.Storage;

// Create a BlobServiceClient using the storage account connection string
var credential = new StorageSharedKeyCredential("mystorageaccount", "your-account-key");
var blobServiceClient = new BlobServiceClient(
    new Uri("https://mystorageaccount.blob.core.windows.net"),
    credential
);

// Get a reference to the specific blob
var containerClient = blobServiceClient.GetBlobContainerClient("mycontainer");
var blobClient = containerClient.GetBlobClient("reports/monthly-report.pdf");

// Build the SAS token with read permission, valid for 2 hours
var sasBuilder = new BlobSasBuilder
{
    BlobContainerName = "mycontainer",
    BlobName = "reports/monthly-report.pdf",
    Resource = "b",  // "b" for blob, "c" for container
    ExpiresOn = DateTimeOffset.UtcNow.AddHours(2)
};
sasBuilder.SetPermissions(BlobSasPermissions.Read);

// Generate the full URI with the SAS token
var sasUri = blobClient.GenerateSasUri(sasBuilder);
Console.WriteLine($"Accessible URL: {sasUri}");
```

## Stored Access Policies

Instead of embedding all the parameters in the SAS token itself, you can create a stored access policy on a container and then generate SAS tokens that reference that policy. The big advantage is that you can revoke access by modifying or deleting the stored access policy, which invalidates all SAS tokens that reference it.

```bash
# Create a stored access policy on a container
az storage container policy create \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name readonly-policy \
  --permissions rl \
  --expiry 2026-12-31T00:00:00Z
```

Then generate a SAS token referencing that policy:

```bash
# Generate a SAS token based on the stored access policy
az storage container generate-sas \
  --account-name mystorageaccount \
  --name mycontainer \
  --policy-name readonly-policy
```

If you need to revoke access, just delete the policy:

```bash
# Delete the stored access policy to revoke all SAS tokens referencing it
az storage container policy delete \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name readonly-policy
```

## Security Best Practices

**Keep expiry times short.** Do not create SAS tokens that last for months. Generate them on demand with the shortest practical lifetime. For file downloads, a few minutes is usually enough.

**Use HTTPS only.** Always set the protocol parameter to HTTPS to prevent the token from being intercepted in transit.

**Restrict IP addresses.** When generating SAS tokens for server-to-server communication, restrict them to known IP ranges.

**Prefer user delegation SAS.** Whenever your architecture supports Azure AD authentication, use user delegation SAS tokens instead of account-key-based ones.

**Never put SAS tokens in client-side code.** Generate them on your backend and send the signed URL to the client. The client should never see your account key or have the ability to generate its own tokens.

**Use stored access policies for revocability.** If you need the ability to revoke access, stored access policies are essential.

**Log and monitor SAS usage.** Enable Azure Storage analytics and diagnostic logging to track who is using SAS tokens and what they are accessing.

## Common Mistakes

One frequent issue is clock skew. If the machine generating the SAS token has a clock that is even slightly ahead of Azure's servers, the token might not be valid yet when the client tries to use it. Setting the start time a few minutes in the past handles this.

Another mistake is setting overly broad permissions. If a client only needs to read a single blob, do not give them write access to the entire container. Scope your tokens as narrowly as possible.

Finally, some teams create long-lived SAS tokens and share them via documentation or config files. This is essentially the same as sharing the account key. Treat SAS tokens as short-lived, disposable credentials.

## Wrapping Up

SAS tokens give you fine-grained, temporary access control over Azure Blob Storage without exposing your account keys. Use user delegation SAS when you can, keep expiry times short, scope permissions tightly, and generate tokens server-side. Combined with stored access policies for revocability, SAS tokens are a core building block of any secure Azure Storage architecture.
