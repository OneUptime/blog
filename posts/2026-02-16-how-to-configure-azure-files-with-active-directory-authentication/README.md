# How to Configure Azure Files with Active Directory Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, Active Directory, Authentication, Identity, Azure Storage, Security

Description: Learn how to configure Azure Files with Active Directory authentication for identity-based access control using on-premises AD DS or Azure AD DS.

---

By default, SMB access to Azure File Shares uses storage account keys, while REST access can also use SAS tokens. These are shared secrets - anyone with the key can access everything. Active Directory authentication changes this by letting users and groups access file shares using their existing AD credentials, with file-level and folder-level permissions enforced through standard NTFS ACLs.

This is essential for enterprise environments where you need per-user access control, audit trails tied to specific identities, and integration with existing permission models.

## Authentication Options

Azure Files supports three identity-based authentication methods:

1. **On-premises Active Directory Domain Services (AD DS)** - Your existing on-premises AD. Requires AD DS synced to Microsoft Entra ID via Microsoft Entra Connect Sync or Microsoft Entra Cloud Sync when you assign share-level RBAC to specific users or groups.
2. **Microsoft Entra Domain Services** - Microsoft's managed domain service in Azure. No on-premises infrastructure needed.
3. **Microsoft Entra Kerberos** - For hybrid or cloud-only identities accessing file shares from Microsoft Entra-joined or Microsoft Entra hybrid-joined devices.

You can enable only one identity source per storage account.

The right choice depends on your existing infrastructure:

- Have on-premises AD and want to use it? Go with AD DS.
- Already using managed domain services in Azure? Use Microsoft Entra Domain Services.
- Microsoft Entra-joined devices accessing file shares, or cloud-only identities without domain controllers? Consider Microsoft Entra Kerberos.

```mermaid
graph TD
    A{Do you have on-prem AD?}
    A -->|Yes| B[Use on-premises AD DS]
    A -->|No| C{Need domain services?}
    C -->|Yes| D[Use Microsoft Entra Domain Services]
    C -->|No, just Entra ID| E[Use Microsoft Entra Kerberos]
    B --> F[Azure File Share<br/>with identity auth]
    D --> F
    E --> F
```

## Setting Up AD DS Authentication (On-Premises AD)

This is the most common scenario for organizations with existing Windows Server AD.

### Prerequisites

- On-premises AD DS domain
- Microsoft Entra Connect Sync or Microsoft Entra Cloud Sync configured and syncing identities to Microsoft Entra ID
- Storage account in the same Microsoft Entra tenant
- A domain-joined machine with the AzFilesHybrid PowerShell module

### Step 1: Download and Install the AzFilesHybrid Module

```powershell
# Download the AzFilesHybrid module

# Get the latest release from https://github.com/Azure-Samples/azure-files-samples/releases

# Extract and import the module
Expand-Archive -Path "AzFilesHybrid.zip" -DestinationPath "C:\AzFilesHybrid"
Import-Module "C:\AzFilesHybrid\AzFilesHybrid.psd1"

# Connect to Azure
Connect-AzAccount
```

### Step 2: Register the Storage Account with AD

This creates a computer account (or service logon account) in your AD that represents the storage account:

```powershell
# Register the storage account with on-premises AD
# This must be run from a domain-joined machine
Join-AzStorageAccount `
  -ResourceGroupName "myresourcegroup" `
  -StorageAccountName "myfilesaccount" `
  -SamAccountName "myfilesaccount" `
  -DomainAccountType "ComputerAccount" `
  -OrganizationalUnitDistinguishedName "OU=StorageAccounts,DC=contoso,DC=com"
```

The `-DomainAccountType` can be:
- `ComputerAccount` - Creates a computer object in AD (recommended)
- `ServiceLogonAccount` - Creates a user object

For either account type, check the password expiration policy on the AD domain or OU and update the password before the maximum password age to avoid authentication failures.

### Step 3: Verify the Registration

```powershell
# Verify that AD DS authentication is enabled
$storageAccount = Get-AzStorageAccount -ResourceGroupName "myresourcegroup" -Name "myfilesaccount"
$storageAccount.AzureFilesIdentityBasedAuth.DirectoryServiceOptions
# Should output: AD

$storageAccount.AzureFilesIdentityBasedAuth.ActiveDirectoryProperties
# Should show your domain information
```

### Step 4: Enable AD DS Authentication via CLI

Alternatively, if you have already created the AD object manually:

```bash
# Enable AD DS authentication on the storage account
az storage account update \
  --name myfilesaccount \
  --resource-group myresourcegroup \
  --enable-files-adds true \
  --domain-name "contoso.com" \
  --net-bios-domain-name "CONTOSO" \
  --forest-name "contoso.com" \
  --domain-guid "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --domain-sid "S-1-5-21-xxxxxxxxx-xxxxxxxxx-xxxxxxxxx" \
  --azure-storage-sid "S-1-5-21-xxxxxxxxx-xxxxxxxxx-xxxxxxxxx-xxxx"
```

## Setting Up Microsoft Entra Domain Services Authentication

If you do not have on-premises AD, Microsoft Entra Domain Services is a managed alternative.

### Prerequisites

- Microsoft Entra Domain Services instance deployed and running
- VMs joined to the Microsoft Entra Domain Services managed domain
- Users synced from Microsoft Entra ID to Microsoft Entra Domain Services

### Enable Microsoft Entra Domain Services Authentication

```bash
# Enable Microsoft Entra Domain Services authentication on the storage account
az storage account update \
  --name myfilesaccount \
  --resource-group myresourcegroup \
  --enable-files-aadds true
```

That is it for the storage account side. Microsoft Entra Domain Services authentication is simpler to configure than on-premises AD DS because there is no manual domain join process.

## Configuring Share-Level Permissions

After enabling AD authentication, you need to assign Azure RBAC roles at the file share level. These roles determine what a user can do at the share level:

- **Storage File Data SMB Share Reader** - Read access to files and directories
- **Storage File Data SMB Share Contributor** - Read, write, and delete access
- **Storage File Data SMB Share Elevated Contributor** - Read, write, delete, and modify NTFS permissions

### Assign Share-Level Permissions

```bash
# Get the file share resource ID
SHARE_ID=$(az storage account show \
  --name myfilesaccount \
  --resource-group myresourcegroup \
  --query "id" --output tsv)/fileServices/default/fileshares/myfileshare

# Assign the Contributor role to a user
az role assignment create \
  --role "Storage File Data SMB Share Contributor" \
  --assignee "user@contoso.com" \
  --scope "$SHARE_ID"

# Assign the Reader role to a security group
az role assignment create \
  --role "Storage File Data SMB Share Reader" \
  --assignee-object-id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --assignee-principal-type Group \
  --scope "$SHARE_ID"
```

### Common Role Assignments

```bash
# Give the IT admins elevated access (can modify permissions)
az role assignment create \
  --role "Storage File Data SMB Share Elevated Contributor" \
  --assignee-object-id $(az ad group show --group "IT-Admins" --query id --output tsv) \
  --assignee-principal-type Group \
  --scope "$SHARE_ID"

# Give all employees read/write access
az role assignment create \
  --role "Storage File Data SMB Share Contributor" \
  --assignee-object-id $(az ad group show --group "All-Employees" --query id --output tsv) \
  --assignee-principal-type Group \
  --scope "$SHARE_ID"
```

## Configuring Directory and File-Level Permissions (NTFS ACLs)

Share-level permissions are the first gate. For granular control within the share, you configure NTFS ACLs on directories and files. You can do this by mounting with identity-based authentication using the Storage File Data SMB Admin role, or by mounting the share with the storage account key. The storage account key option gives immediate full access and should only be used when you cannot use identity-based admin access:

```powershell
# Mount the share with the storage account key (for initial ACL setup)
$storageKey = (Get-AzStorageAccountKey -ResourceGroupName "myresourcegroup" -Name "myfilesaccount")[0].Value
net use Z: \\myfilesaccount.file.core.windows.net\myfileshare /user:AZURE\myfilesaccount $storageKey

# Set NTFS permissions on a directory
$acl = Get-Acl "Z:\department-data\finance"

# Add read permission for the Finance group
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "CONTOSO\Finance-Team",
    "ReadAndExecute",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.AddAccessRule($rule)

# Add full control for Finance managers
$rule2 = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "CONTOSO\Finance-Managers",
    "FullControl",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.AddAccessRule($rule2)

# Apply the ACL
Set-Acl "Z:\department-data\finance" $acl

# Verify the permissions
Get-Acl "Z:\department-data\finance" | Format-List
```

After setting ACLs, unmount the key-based connection. Users should mount the share using their AD credentials instead.

## Mounting with AD Credentials

Once everything is configured, users mount the share with their domain credentials:

```powershell
# Mount the share using AD authentication (no storage key needed)
# The user must be logged into a domain-joined machine
net use Z: \\myfilesaccount.file.core.windows.net\myfileshare

# The user's Kerberos ticket is used for authentication automatically
```

On a domain-joined machine where the user is logged in with their AD credentials, the mount happens transparently without prompting for credentials.

## Troubleshooting

### "Access Denied" When Mounting

Verify that the user has a share-level RBAC role assigned:

```bash
# List role assignments on the file share
az role assignment list --scope "$SHARE_ID" --output table
```

### Kerberos Ticket Issues

On the client machine, check for valid Kerberos tickets:

```powershell
# List current Kerberos tickets
klist

# If no tickets for the storage account, try refreshing
klist purge
# Then re-mount the share
```

### SPN Not Found

If the storage account's computer object in AD does not have the correct Service Principal Names:

```powershell
# Check the SPNs on the storage account's computer object
setspn -L <ADAccountName>

# If missing, add the required SPN
setspn -S cifs/myfilesaccount.file.core.windows.net <ADAccountName>
```

## Best Practices

**Use security groups, not individual users.** Assign RBAC roles to AD security groups for easier management and auditability.

**Follow the principle of least privilege.** Give users Reader access by default and Contributor only where needed. Reserve Elevated Contributor for administrators.

**Document your permission structure.** Map out which groups have access to which directories. This documentation is invaluable during audits and troubleshooting.

**Test with a pilot group first.** Before rolling out AD authentication to the entire organization, test with a small group to catch configuration issues.

**Keep Microsoft Entra Connect Sync or Microsoft Entra Cloud Sync healthy.** If the sync between on-premises AD and Microsoft Entra ID breaks, new users and group changes will not propagate, and authentication can fail for affected users.

## Wrapping Up

Active Directory authentication for Azure Files brings enterprise-grade access control to cloud file shares. The setup varies in complexity depending on whether you use on-premises AD DS or Microsoft Entra Domain Services, but the end result is the same: per-user access with familiar NTFS permissions. Plan your share-level RBAC roles carefully, set directory-level ACLs for granular control, and use security groups for manageable permission structures.
