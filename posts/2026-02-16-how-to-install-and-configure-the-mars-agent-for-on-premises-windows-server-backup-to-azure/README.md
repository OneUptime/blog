# How to Install and Configure the MARS Agent for On-Premises Windows Server Backup to Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Backup, MARS Agent, Windows Server, On-Premises Backup, Recovery Services Vault, Cloud Backup, Hybrid

Description: Learn how to install and configure the Microsoft Azure Recovery Services (MARS) agent to back up on-premises Windows Server files and folders to Azure.

---

Not every backup scenario involves Azure VMs. Plenty of organizations still run Windows Servers on-premises and need a reliable offsite backup solution. The Microsoft Azure Recovery Services (MARS) agent is a lightweight backup client that installs directly on Windows Server and backs up files, folders, and system state to an Azure Recovery Services vault. No additional infrastructure required - just the agent and an internet connection.

This guide covers the full setup, from installing the agent to configuring backup schedules and running your first restore.

## What the MARS Agent Can Back Up

The MARS agent handles:

- **Files and folders** - Any file on any local or mounted volume
- **System state** - Windows registry, boot files, COM+ class registration, Active Directory (on domain controllers), SYSVOL, and more
- **Bare metal recovery** - Full server restore (when combined with Windows Server Backup)

What it cannot do:

- Back up application-level workloads (SQL Server, Exchange, SharePoint) - use Azure Backup Server or DPM for those
- Back up Linux servers - it is Windows-only
- Back up network shares directly - the agent must be installed on the server hosting the data

## Prerequisites

- Windows Server 2012 R2 or later (also works on Windows 10/11 for client scenarios)
- .NET Framework 4.7.2 or later
- Outbound HTTPS (port 443) connectivity to Azure
- A Recovery Services vault in Azure
- At least 5-10% free space on the volume where the cache folder is located
- Local administrator privileges for installation

## Step 1: Create a Recovery Services Vault

If you do not already have one:

```bash
# Create a resource group and vault for on-premises backups
az group create --name rg-backup-onprem --location eastus2

az backup vault create \
    --resource-group rg-backup-onprem \
    --name rsv-onprem-backup-001 \
    --location eastus2
```

Set the storage redundancy based on your needs. For on-premises backups, geo-redundant storage (GRS) is strongly recommended because it protects against regional disasters:

```bash
# Set storage redundancy to GRS for cross-region protection
az backup vault backup-properties set \
    --resource-group rg-backup-onprem \
    --name rsv-onprem-backup-001 \
    --backup-storage-redundancy GeoRedundant
```

## Step 2: Download the MARS Agent and Vault Credentials

1. Open the Recovery Services vault in the Azure portal
2. Go to "Backup"
3. Select workload: "On-premises" and what to back up: "Files and folders"
4. Click "Prepare Infrastructure"
5. Download the MARS agent installer (MARSAgentInstaller.exe)
6. Download the vault credentials file (valid for 10 days)

The vault credentials file contains the registration information that links the agent to your specific vault. Keep it secure and do not share it.

## Step 3: Install the MARS Agent

Copy the installer and credentials file to your Windows Server and run the installation:

```powershell
# Install the MARS agent silently
# The /q switch enables silent installation
Start-Process -FilePath ".\MARSAgentInstaller.exe" -ArgumentList "/q" -Wait

# Verify installation
$service = Get-Service -Name "obengine" -ErrorAction SilentlyContinue
if ($service) {
    Write-Output "MARS agent service installed: $($service.Status)"
} else {
    Write-Output "MARS agent installation failed - service not found"
}
```

During installation, you are prompted for:
- **Installation folder** - Default is `C:\Program Files\Microsoft Azure Recovery Services Agent`
- **Cache folder** - Default is `C:\Program Files\Microsoft Azure Recovery Services Agent\Scratch` - change this to a volume with enough free space (minimum 5% of total backup data size)
- **Proxy settings** - Configure if your server uses a proxy for internet access

## Step 4: Register the Server with the Vault

After installation, register the server using the vault credentials file:

1. Open the MARS agent console (Microsoft Azure Backup)
2. Click "Register Server" in the Actions pane
3. Browse to the vault credentials file you downloaded
4. Click "Next"
5. Generate or provide an encryption passphrase

The encryption passphrase is critical. It encrypts your backup data before it leaves the server. Without this passphrase, you cannot restore data - not even Microsoft can recover it. Store it in a secure location like a password manager or Azure Key Vault.

```powershell
# Register the server with the vault using PowerShell
# This is useful for automated deployments across many servers

$VaultCredPath = "C:\temp\vault-credentials.VaultCredentials"
$Passphrase = "YourSuperSecurePassphrase2026!"

# Import the MARS agent PowerShell module
Import-Module "C:\Program Files\Microsoft Azure Recovery Services Agent\bin\Modules\MSOnlineBackup"

# Set vault credentials
$vaultCred = Get-OBMachineSetting
Start-OBRegistration -VaultCredentials $VaultCredPath

# Set the encryption passphrase
$passSecure = ConvertTo-SecureString -String $Passphrase -AsPlainText -Force
Set-OBMachineSetting -EncryptionPassphrase $passSecure

Write-Output "Server registered with vault successfully"
```

## Step 5: Configure the Backup Schedule

Now configure what to back up and when.

### Using the MARS Agent Console

1. Open the MARS agent console
2. Click "Schedule Backup" in the Actions pane
3. Select items to back up:
   - Check/uncheck volumes and folders
   - Use "Exclusion Settings" to skip file types (e.g., *.tmp, *.log)
4. Set the schedule:
   - Up to 3 backups per day
   - Choose the days and times
5. Set the retention:
   - Daily, weekly, monthly, yearly retention
6. Choose initial backup method:
   - Over the network (default)
   - Offline backup using Azure Import/Export (for large initial backups)
7. Review and confirm

### Using PowerShell for Automated Configuration

```powershell
# Configure backup schedule and items using PowerShell
# Useful for deploying consistent policies across multiple servers

Import-Module "C:\Program Files\Microsoft Azure Recovery Services Agent\bin\Modules\MSOnlineBackup"

# Define the backup schedule - daily at 9 PM and 3 AM
$schedule = New-OBSchedule -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday -TimesOfDay "21:00","03:00"

# Define what to back up
$fileSpec1 = New-OBFileSpec -FileSpec "D:\Data" -NonRecursive:$false
$fileSpec2 = New-OBFileSpec -FileSpec "D:\Config" -NonRecursive:$false

# Define exclusions - skip temporary and log files
$exclusion1 = New-OBFileSpec -FileSpec "*.tmp" -Exclude
$exclusion2 = New-OBFileSpec -FileSpec "*.log" -Exclude
$exclusion3 = New-OBFileSpec -FileSpec "D:\Data\Temp" -Exclude

# Define retention policy
$retentionPolicy = New-OBRetentionPolicy -RetentionDays 30

# Create the backup policy
$policy = New-OBPolicy
Set-OBSchedule -Policy $policy -Schedule $schedule
Add-OBFileSpec -Policy $policy -FileSpec $fileSpec1
Add-OBFileSpec -Policy $policy -FileSpec $fileSpec2
Add-OBFileSpec -Policy $policy -FileSpec $exclusion1
Add-OBFileSpec -Policy $policy -FileSpec $exclusion2
Add-OBFileSpec -Policy $policy -FileSpec $exclusion3
Set-OBRetentionPolicy -Policy $policy -RetentionPolicy $retentionPolicy

# Apply the policy
Set-OBPolicy -Policy $policy -Confirm:$false

Write-Output "Backup policy configured successfully"
```

## Step 6: Configure Network Throttling

If you do not want backup traffic consuming all your bandwidth during business hours, configure throttling:

1. In the MARS agent console, click "Change Properties"
2. Go to the "Throttling" tab
3. Enable internet bandwidth throttling
4. Set work hours bandwidth (e.g., 5 Mbps) and non-work hours bandwidth (e.g., unlimited)
5. Define work hours (e.g., 8 AM to 6 PM, Monday through Friday)

```powershell
# Configure bandwidth throttling via PowerShell
# Limit to 5 Mbps during work hours, unlimited after hours

Set-OBMachineSetting -WorkDay Monday,Tuesday,Wednesday,Thursday,Friday `
    -StartWorkHour "08:00:00" `
    -EndWorkHour "18:00:00" `
    -WorkHourBandwidth 5242880 `
    -NonWorkHourBandwidth 0  # 0 means unlimited
```

## Step 7: Run the First Backup

The first backup is the largest because it copies all selected data. Subsequent backups are incremental.

Trigger the first backup manually:

1. In the MARS agent console, click "Back Up Now"
2. Confirm the items and settings
3. Click "Back Up"

Or via PowerShell:

```powershell
# Trigger an immediate backup
$policy = Get-OBPolicy
Start-OBBackup -Policy $policy

# Monitor backup progress
Get-OBJob | Where-Object { $_.JobStatus -eq "InProgress" } | Format-Table JobType, JobStatus, @{Name="PercentComplete"; Expression={$_.JobData.BytesTransferred / $_.JobData.TotalBytes * 100}}
```

The initial backup time depends on the data volume and network speed. For reference, 100 GB over a 50 Mbps connection takes roughly 4-5 hours.

## Step 8: Verify and Monitor Backups

Check backup status regularly:

```powershell
# Get the status of recent backup jobs
Get-OBJob -Previous 5 | Format-Table JobType, JobStatus, StartTime, EndTime, @{Name="DataTransferred"; Expression={
    if ($_.JobData.BytesTransferred) {
        "{0:N2} GB" -f ($_.JobData.BytesTransferred / 1GB)
    } else { "N/A" }
}}
```

In the Azure portal, you can also monitor from the vault:
1. Go to the Recovery Services vault
2. Click "Backup items" then "Azure Backup Agent"
3. View the status of each registered server

Set up alerts for backup failures in the vault's monitoring section.

## Restoring Files

When you need to restore files:

1. Open the MARS agent console
2. Click "Recover Data"
3. Choose the recovery source:
   - **This server** - Restore to the same server
   - **Another server** - Restore to a different registered server
4. Select the recovery point (date and time)
5. Select volumes and browse for specific files/folders
6. Choose the restore destination:
   - **Original location** - Overwrite existing files
   - **Another location** - Restore to a different path
7. Click "Recover"

For large restores, the recovery mounts the backup volume and you can browse and copy files at your own pace.

## Managing Multiple Servers

For environments with many servers, standardize the MARS agent deployment:

1. Create a deployment script that installs the agent, registers with the vault, and configures the backup policy
2. Distribute via Group Policy, SCCM, or another management tool
3. Monitor all servers from the central Recovery Services vault in the Azure portal
4. Use Azure Monitor Workbooks for consolidated reporting across all registered servers

## Wrapping Up

The MARS agent is the simplest way to get on-premises Windows Server data into Azure. Install the agent, register with a vault, configure your backup schedule, and you have offsite backup protection with minimal effort. The encryption passphrase is the one thing you absolutely must safeguard - without it, your backups are unrecoverable. Set up monitoring, test restores periodically, and you have a solid backup strategy for your on-premises Windows infrastructure.
