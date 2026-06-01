# Validation Summary: How to Configure Azure Files with Active Directory Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Files
- SMB file shares
- On-premises Active Directory Domain Services (AD DS)
- Microsoft Entra ID
- Microsoft Entra Domain Services
- Microsoft Entra Kerberos
- Azure Storage accounts
- Azure CLI
- Azure PowerShell / AzFilesHybrid
- Azure RBAC
- NTFS ACLs
- Kerberos / SPNs

## Sources Consulted
- Microsoft Learn: Overview of Azure Files identity-based authentication options for SMB access - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-active-directory-overview
- Microsoft Learn: Overview - On-premises Active Directory Domain Services authentication over SMB for Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-ad-ds-overview
- Microsoft Learn: Enable Active Directory Domain Services authentication for Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-ad-ds-enable
- Microsoft Learn: Assign share-level permissions for Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-assign-share-level-permissions
- Microsoft Learn: Configure directory-level and file-level permissions for Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-configure-file-level-permissions
- Microsoft Learn: Enable Microsoft Entra Kerberos authentication on Azure Files - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-auth-hybrid-identities-enable
- Microsoft Learn: Authorize access to data in Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/authorize-data-access
- Microsoft Learn: Azure CLI reference for `az storage account update` - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for `az role assignment create` - https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest

## Issues Found
- The post used older Azure AD / Azure AD DS naming and implied Azure AD Kerberos was only for hybrid identities on Azure AD-joined devices. Updated the terminology to Microsoft Entra ID, Microsoft Entra Domain Services, and Microsoft Entra Kerberos, and corrected the scenario guidance to include cloud-only identities and Microsoft Entra-joined or hybrid-joined devices.
- The authentication options section did not state that only one identity source can be enabled per storage account. Added that constraint.
- The opening statement grouped storage account keys and SAS tokens together for Azure Files generally. Clarified that SMB access uses storage account keys by default, while REST access can also use SAS tokens.
- The AzFilesHybrid example used the older `Join-AzStorageAccountForAuth` cmdlet form. Updated it to the current documented `Join-AzStorageAccount` usage and included `-SamAccountName`.
- The `ComputerAccount` description said there was no password expiration. Replaced that with Microsoft guidance to check password expiration policy and update the storage account identity password before the maximum password age for either account type.
- The directory/file ACL section said storage account key mounting was required. Updated it to note that Microsoft recommends identity-based admin access with the Storage File Data SMB Admin role, while storage account key mounting remains a less secure fallback.
- The Azure RBAC group assignment examples used group object IDs without a principal type. Updated the examples to use `--assignee-object-id` with `--assignee-principal-type Group`.
- The SPN troubleshooting commands assumed the AD account name always matches the storage account name. Changed the examples to use a placeholder `<ADAccountName>`.

## Review Notes
The post is technically valid after the corrections. The Azure CLI was not installed in the local environment, so CLI flags were verified against the official Azure CLI reference instead of local `az --help` output.
