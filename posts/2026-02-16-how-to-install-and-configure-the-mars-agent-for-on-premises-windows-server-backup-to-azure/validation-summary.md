# Validation Summary: How to Configure the MARS Agent for On-Premises Windows Server Backup to Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Backup
- Microsoft Azure Recovery Services (MARS) agent
- Recovery Services vaults
- Azure CLI
- MSOnlineBackup PowerShell module
- Windows Server backup and restore

## Sources Consulted
- Microsoft Learn: About the Microsoft Azure Recovery Services (MARS) agent for Azure Backup - https://learn.microsoft.com/en-us/azure/backup/backup-azure-about-mars
- Microsoft Learn: Support matrix for backup with the Microsoft Azure Recovery Services (MARS) agent - https://learn.microsoft.com/en-us/azure/backup/backup-support-matrix-mars-agent
- Microsoft Learn: Install the Azure Backup MARS agent - https://learn.microsoft.com/en-us/azure/backup/install-mars-agent
- Microsoft Learn: Tutorial: Back up Windows Server to Azure - https://learn.microsoft.com/en-us/azure/backup/tutorial-backup-windows-server-to-azure
- Microsoft Learn: PowerShell Script to register an on-premises Windows server or client machine with Recovery Services vault - https://learn.microsoft.com/en-us/azure/backup/scripts/register-microsoft-azure-recovery-services-agent
- Microsoft Learn: Use PowerShell to back up Windows Server to Azure - https://learn.microsoft.com/en-us/azure/backup/backup-client-automation
- Microsoft Learn: New-OBSchedule - https://learn.microsoft.com/en-us/powershell/module/msonlinebackup/new-obschedule
- Microsoft Learn: Set-OBMachineSetting - https://learn.microsoft.com/en-us/powershell/module/msonlinebackup/set-obmachinesetting
- Microsoft Learn: Get-OBJob - https://learn.microsoft.com/en-us/powershell/module/msonlinebackup/get-objob
- Microsoft Learn: az backup vault backup-properties - https://learn.microsoft.com/en-us/cli/azure/backup/vault/backup-properties
- Microsoft Learn: Troubleshoot the Azure Backup agent - https://learn.microsoft.com/en-us/azure/backup/backup-azure-mars-troubleshoot
- Microsoft Learn: Restore files to Windows Server using the MARS Agent - https://learn.microsoft.com/en-us/azure/backup/backup-azure-restore-windows-server
- Microsoft Learn: About restore using the Microsoft Azure Recovery Services (MARS) agent - https://learn.microsoft.com/en-us/azure/backup/about-restore-microsoft-azure-recovery-services

## Issues Found
- The backup capabilities section described "any local or mounted volume" and "bare metal recovery." Microsoft documents MARS support as files/folders, volume-level backup, and system state, with unsupported network shares and Server Core SKUs. Updated the wording to supported local NTFS volumes and volume-level backup/restore, and added Server Core to the unsupported list.
- The prerequisites listed .NET Framework 4.7.2 or later. Current Microsoft documentation lists .NET Framework 4.8 and Windows PowerShell 5.0 for MARS installation. Updated the prerequisites.
- The PowerShell registration sample set the encryption passphrase without a security PIN. Microsoft's registration guidance notes that a Security PIN may be required and the Set-OBMachineSetting cmdlet supports the SecurityPIN parameter. Updated the sample to include a generated vault Security PIN and removed an unused Get-OBMachineSetting assignment.
- The network throttling example said 5 Mbps but used 5,242,880 as the bandwidth value, and it stated that 0 means unlimited for NonWorkHourBandwidth. Microsoft documents the throttling parameters as UInt32 limits and provides Set-OBMachineSetting -NoThrottle to disable throttling. Updated the example to use explicit 5 MB/s and 20 MB/s limits.

## Review Notes
The Azure CLI commands and MSOnlineBackup schedule, file-spec, retention, policy, backup, and job-query cmdlets match current Microsoft documentation. The Azure CLI was not installed locally, so CLI syntax was verified against Microsoft Learn rather than local --help output.
