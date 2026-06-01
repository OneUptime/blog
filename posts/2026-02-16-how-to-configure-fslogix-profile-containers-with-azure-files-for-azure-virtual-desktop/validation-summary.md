# Validation Summary: How to Configure FSLogix Profile Containers with Azure Files

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Virtual Desktop
- FSLogix Profile Containers and ODFC Containers
- Azure Files
- Azure Storage accounts and file shares
- Azure CLI
- Azure RBAC for SMB file shares
- Windows ACLs / NTFS permissions
- PowerShell registry configuration

## Sources Consulted
- Microsoft Learn: Store FSLogix profile containers on Azure Files and Active Directory Domain Services or Microsoft Entra Domain Services - https://learn.microsoft.com/en-us/fslogix/how-to-configure-profile-container-azure-files-active-directory
- Microsoft Learn: Configure profile containers using FSLogix - https://learn.microsoft.com/en-us/fslogix/how-to-configure-profile-containers
- Microsoft Learn: Configure SMB Storage Permissions - https://learn.microsoft.com/en-us/fslogix/how-to-configure-storage-permissions
- Microsoft Learn: Storage options for FSLogix profile containers in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/store-fslogix-profile
- Microsoft Learn: Azure CLI az storage account reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Assign share-level permissions for Azure file shares - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-assign-share-level-permissions
- Microsoft Learn: Configure directory and file-level permissions over SMB - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-configure-file-level-permissions
- Microsoft Learn: Configure ODFC containers - https://learn.microsoft.com/en-us/fslogix/how-to-configure-odfc-containers
- Microsoft Learn: Custom profile redirections.xml - https://learn.microsoft.com/en-us/fslogix/concepts-redirections-xml
- Microsoft Learn: Issues with container lock or in use - https://learn.microsoft.com/en-us/fslogix/troubleshooting-container-locked
- Microsoft Learn: frx command-line utility - https://learn.microsoft.com/en-us/fslogix/utilities/frx/frx

## Issues Found
- The NTFS permissions example granted broad root-level Modify permission to Authenticated Users and Full Control to CREATOR OWNER. Replaced it with the current Microsoft-recommended ACL pattern: remove inheritance, grant CREATOR OWNER Modify on subfolders/files, grant an admin group Full Control, grant the AVD user group Modify on the root, and remove Authenticated Users and Builtin Users.
- The example profile folder names used a hyphen between the SID and username. Corrected them to the default FSLogix format using an underscore, such as `S-1-5-21-xxxx_user1`.
- The Office Container section implied a separate ODFC container is generally needed to prevent Profile Container growth. Updated it to reflect current FSLogix guidance that a single Profile Container already includes Microsoft 365 application data and ODFC is only needed when intentionally splitting Office data.
- The troubleshooting note said `frx.exe` can be used to release a profile container lock. The official `frx` command reference does not provide a release-lock operation. Replaced this with supported guidance: clean up stale sessions, consider `CleanupInvalidSessions`, or close an Azure Files SMB handle after confirming no active session is using it.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI flags were verified against Microsoft Learn rather than local `az --help`.
- Microsoft currently recommends provisioned v2 Azure Files for new file share deployments, but the article's Premium_LRS/FileStorage provisioned v1 example is still supported and technically valid.
- FSLogix documentation now includes a Kerberos AES-SHA1 hardening warning for SMB profile storage before the April 2026 Windows Server update; this is worth adding in a future broader content update.
