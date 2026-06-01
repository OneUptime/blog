# Validation Summary: How to Mount an Azure File Share on Windows Using SMB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Files
- Azure Storage accounts
- SMB file shares
- Windows File Explorer network drive mapping
- Windows PowerShell
- Azure CLI
- IIS virtual directories
- Windows Credential Manager

## Sources Consulted
- Microsoft Learn: Mount SMB Azure file share on Windows - https://learn.microsoft.com/azure/storage/files/storage-how-to-use-files-windows
- Microsoft Learn: SMB Azure file shares - https://learn.microsoft.com/azure/storage/files/files-smb-protocol
- Microsoft Learn: Azure Files networking considerations - https://learn.microsoft.com/azure/storage/files/storage-files-networking-overview
- Microsoft Learn: az storage account keys - https://learn.microsoft.com/cli/azure/storage/account/keys
- Microsoft Learn: Improve SMB Azure file share performance - https://learn.microsoft.com/azure/storage/files/smb-performance
- Microsoft Learn: SMB features in Windows and Windows Server - https://learn.microsoft.com/windows-server/storage/file-server/smb-feature-descriptions
- Microsoft Learn: What is SMB file sharing for Windows and Windows Server? - https://learn.microsoft.com/windows-server/storage/file-server/file-server-smb-overview
- Microsoft Learn: New-PSDrive - https://learn.microsoft.com/powershell/module/microsoft.powershell.management/new-psdrive
- Microsoft Learn: Register-ScheduledTask - https://learn.microsoft.com/powershell/module/scheduledtasks/register-scheduledtask
- Microsoft Learn: New-ScheduledTaskTrigger - https://learn.microsoft.com/powershell/module/scheduledtasks/new-scheduledtasktrigger
- Microsoft Learn: cmdkey - https://learn.microsoft.com/windows-server/administration/windows-commands/cmdkey
- Microsoft Learn: New-WebVirtualDirectory - https://learn.microsoft.com/powershell/module/webadministration/new-webvirtualdirectory

## Issues Found
- The tags listed "Window" instead of "Windows". Changed the tag to "Windows".
- The prerequisites said SMB 3.0 is available on Windows 8.1/Windows Server 2012 R2 and later. Microsoft documents SMB 3.0 as introduced in Windows 8 and Windows Server 2012, with SMB 3.02 in Windows 8.1 and Windows Server 2012 R2. Updated the prerequisite text.
- The IIS section implied that storing credentials once would store them for the machine account and satisfy the IIS app pool. Azure Files guidance notes that credentials must be mounted and saved from the context of the service account that will access the share. Updated the comments to make the identity context explicit.
- The performance section described SMB Multichannel as available on premium file shares. Microsoft now describes Azure Files SMB Multichannel support as available on SSD file shares, also referred to as premium. Updated the wording to "SSD/premium".
- The security section used `az storage account show --query "enableHttpsTrafficOnly"` to verify encryption in transit. Microsoft now documents a dedicated Azure Files "Require Encryption in Transit for SMB" setting, and the storage-account secure transfer setting now applies only to REST/HTTPS traffic once the SMB-specific setting is configured. Replaced the command with `az storage account file-service-properties show --query "protocolSettings.smb.encryptionInTransit.required"`.

## Review Notes
The Azure CLI could not be tested locally because `az` is not installed in the review environment, so command syntax was verified against the official Azure CLI command reference. The post still uses storage account key authentication in most examples; this works, but Microsoft recommends identity-based authentication where possible because storage account keys grant broad administrative access.
