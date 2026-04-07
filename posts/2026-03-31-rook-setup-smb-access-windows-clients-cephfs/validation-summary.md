# Validation Summary: How to Set Up SMB Access for Windows Clients to CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook
- Ceph / CephFS
- Samba (SMB gateway)
- Windows SMB client
- PowerShell

## Sources Consulted
- Microsoft PowerShell documentation for `New-PSDrive`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-psdrive
- Microsoft documentation for `cmdkey`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmdkey
- Microsoft documentation for `net use`: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/gg651155(v=ws.11)
- Microsoft SMB PowerShell cmdlets documentation: https://learn.microsoft.com/en-us/powershell/module/smbshare/
- Microsoft documentation for `Set-NetTCPSetting`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-nettcpsetting
- Microsoft documentation for Offline Files / Client-Side Caching (CSC): https://learn.microsoft.com/en-us/windows-server/storage/offline-files/offline-files-overview
- Microsoft documentation for `Set-SmbClientConfiguration`: https://learn.microsoft.com/en-us/powershell/module/smbshare/set-smbclientconfiguration

## Issues Found

### 1. Invalid Offline Files setup commands
**What was wrong:** The post used `Enable-WindowsOptionalFeature -Online -FeatureName OfflineFiles` but "OfflineFiles" is not a valid Windows Optional Feature name. It also used `(New-Object -ComObject CSC.CSCManager).EnableShare($share, $true)` which references a COM object (`CSC.CSCManager`) that is not a documented or valid Windows COM class.

**What was changed:** Replaced with the correct approach: enabling the `CscService` (Client-Side Caching) Windows service via `Set-Service` and `Start-Service`, and added a note that individual share caching is configured through File Explorer's "Always available offline" context menu option.

**Why:** The original commands would fail with errors. Offline Files in Windows is managed through the CscService service, not as an optional Windows feature or through a COM object.

### 2. Multichannel setting mislabeled as diagnostic logging
**What was wrong:** The troubleshooting section contained `Set-SmbClientConfiguration -EnableMultiChannel $true -Force` under the heading "Enable SMB diagnostic logging." This cmdlet enables SMB Multichannel (using multiple network connections simultaneously) and has nothing to do with diagnostic logging.

**What was changed:** Removed the `Set-SmbClientConfiguration -EnableMultiChannel` line and changed the heading to "View SMB client diagnostic logs" since the remaining `Get-WinEvent` command is the actual log viewing command.

**Why:** Enabling multichannel is a performance/feature configuration, not a logging operation. Presenting it as a logging step is misleading and could confuse readers.

## Review Notes
- The `cmdkey` example in the "Storing Credentials Securely" section passes a plaintext password on the command line (`/pass:Password123`), which will be recorded in shell history. While the section's goal (storing credentials in Credential Manager for future use) is valid, readers should be aware that the initial `cmdkey` invocation still exposes the password. An interactive prompt approach or reading from a secure file would be more secure.
- The SMB version section uses `Set-SmbServerConfiguration` to disable SMB1, which configures the local machine's SMB **server** component. Since this post is about Windows as an SMB **client**, readers may also want to disable the SMB1 client via `Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol-Client`. The current advice is not wrong (disabling the server-side SMB1 is good practice) but is incomplete for a client-focused guide.
- The `EnableSMB2Protocol` property in `Get-SmbServerConfiguration` controls both SMB2 and SMB3 (SMB3 is built on SMB2). The comment "Verify SMB 3 is enabled" is slightly imprecise but functionally correct.
