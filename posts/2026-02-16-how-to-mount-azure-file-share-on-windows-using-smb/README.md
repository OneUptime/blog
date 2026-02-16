# How to Mount an Azure File Share on Windows Using SMB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, SMB, Windows, File Shares, Network Drive, Azure Storage

Description: Step-by-step instructions for mounting an Azure File Share as a mapped network drive on Windows using SMB protocol with persistent and on-demand configurations.

---

Mounting an Azure File Share on Windows works exactly like mapping a network drive to a traditional file server. Once mounted, the Azure File Share appears as a drive letter in File Explorer, and all your applications can read and write to it as if it were local storage. The data lives in Azure, but the experience is completely transparent.

This is one of the simplest ways to give Windows applications access to cloud storage without changing any code. Let me walk through the different methods and the common issues you might run into.

## Prerequisites

Before you can mount an Azure File Share on Windows, verify these requirements:

- **Windows version**: Windows 10 version 1507 or later, or Windows Server 2016 or later. Older versions may work but with limited SMB protocol support.
- **SMB 3.0 or later**: Required for encryption in transit. SMB 3.0 is available on Windows 8.1/Server 2012 R2 and later.
- **Port 445 open**: SMB uses TCP port 445. Many ISPs and corporate firewalls block this port. This is the most common reason mounts fail.
- **Storage account credentials**: You need the storage account name and one of the access keys.

### Checking Port 445

Before anything else, verify that port 445 is not blocked:

```powershell
# Test if port 445 is reachable from your machine
Test-NetConnection -ComputerName myfilesaccount.file.core.windows.net -Port 445
```

If `TcpTestSucceeded` returns `False`, port 445 is blocked. You will need to work with your network administrator to open it, use a VPN/ExpressRoute connection, or use Azure File Sync as an alternative.

## Getting the Connection Details

You need two pieces of information from your storage account:

1. The UNC path: `\\myfilesaccount.file.core.windows.net\myfileshare`
2. The storage account key

### Using Azure CLI

```bash
# Get the storage account key
az storage account keys list \
  --account-name myfilesaccount \
  --resource-group myresourcegroup \
  --query "[0].value" \
  --output tsv
```

### Using the Azure Portal

1. Navigate to your storage account.
2. Under "Data storage," click "File shares."
3. Click on your file share.
4. Click "Connect" at the top.
5. Azure generates a ready-to-use PowerShell script with all the details filled in.

The portal-generated script is honestly the easiest path. It handles credential storage and mapping in one step.

## Method 1: Map a Network Drive via File Explorer

The GUI approach is the most familiar for most Windows users:

1. Open File Explorer.
2. Right-click "This PC" and select "Map network drive."
3. Choose a drive letter (for example, Z:).
4. In the Folder field, enter: `\\myfilesaccount.file.core.windows.net\myfileshare`
5. Check "Reconnect at sign-in" if you want the drive to persist across reboots.
6. Check "Connect using different credentials."
7. Click Finish.
8. When prompted for credentials:
   - Username: `AZURE\myfilesaccount` (or `localhost\myfilesaccount`)
   - Password: Your storage account key

The drive should appear in File Explorer immediately.

## Method 2: Map Using Command Line

For scripting and automation, use the `net use` command:

```powershell
# Map the Azure File Share to drive letter Z:
net use Z: \\myfilesaccount.file.core.windows.net\myfileshare /user:AZURE\myfilesaccount "your-storage-account-key" /persistent:yes
```

The `/persistent:yes` flag makes the mapping survive reboots.

## Method 3: Mount Using PowerShell (Recommended)

PowerShell gives you the most control and is the recommended approach for production setups:

```powershell
# Store the credentials securely using cmdkey
# This saves the credentials in Windows Credential Manager
cmdkey /add:myfilesaccount.file.core.windows.net `
  /user:AZURE\myfilesaccount `
  /pass:"your-storage-account-key"

# Map the drive using New-PSDrive
New-PSDrive -Name Z -PSProvider FileSystem `
  -Root "\\myfilesaccount.file.core.windows.net\myfileshare" `
  -Persist
```

The `cmdkey` command stores the credentials in Windows Credential Manager, so you do not need to include the key in every mount command. The `-Persist` flag ensures the mapping survives reboots.

### Complete Script from Azure Portal

Azure provides a ready-to-use script. Here is what it typically looks like:

```powershell
# Define variables
$storageAccountName = "myfilesaccount"
$storageAccountKey = "your-storage-account-key"
$fileShareName = "myfileshare"
$driveLetter = "Z"

# Save the credentials to Windows Credential Manager
$connectTestResult = Test-NetConnection -ComputerName "$storageAccountName.file.core.windows.net" -Port 445

if ($connectTestResult.TcpTestSucceeded) {
    # Store the credentials
    cmd.exe /C "cmdkey /add:`"$storageAccountName.file.core.windows.net`" /user:`"AZURE\$storageAccountName`" /pass:`"$storageAccountKey`""

    # Mount the drive
    New-PSDrive -Name $driveLetter -PSProvider FileSystem `
        -Root "\\$storageAccountName.file.core.windows.net\$fileShareName" `
        -Persist `
        -Scope Global

    Write-Host "Drive $driveLetter`: mapped successfully"
} else {
    Write-Error "Port 445 is blocked. Cannot mount the file share."
}
```

## Making the Mount Persist Across Reboots

For the mount to survive system reboots, you need both the credential stored in Credential Manager and the drive mapping set as persistent.

### Using a Startup Script

If `cmdkey` credentials get cleared after a reboot (which can happen with some Group Policy configurations), create a startup script:

```powershell
# Save this as mount-azure-share.ps1
# Run it as a scheduled task at logon

$accountName = "myfilesaccount"
$accountKey = "your-storage-account-key"
$shareName = "myfileshare"

# Re-add credentials if they are missing
$testCred = cmdkey /list | Select-String $accountName
if (-not $testCred) {
    cmd.exe /C "cmdkey /add:`"$accountName.file.core.windows.net`" /user:`"AZURE\$accountName`" /pass:`"$accountKey`""
}

# Check if the drive is already mapped
if (-not (Test-Path "Z:\")) {
    New-PSDrive -Name Z -PSProvider FileSystem `
        -Root "\\$accountName.file.core.windows.net\$shareName" `
        -Persist -Scope Global
}
```

Create a scheduled task to run this at logon:

```powershell
# Create a scheduled task to mount the share at user logon
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-ExecutionPolicy Bypass -File C:\Scripts\mount-azure-share.ps1"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Mount Azure File Share" `
  -Action $action -Trigger $trigger -RunLevel Highest
```

## Mounting on Windows Server

On Windows Server, the process is the same, but there are additional considerations:

### Server Manager Integration

Windows Server's File and Storage Services can manage mounted Azure File Shares alongside local shares. The Azure File Share appears as a network location.

### Using with IIS

If you need IIS to serve content from an Azure File Share:

```powershell
# Mount the share as the IIS application pool identity
# The IIS app pool needs access to the credentials

# First, store credentials for the machine account
cmdkey /add:myfilesaccount.file.core.windows.net `
  /user:AZURE\myfilesaccount `
  /pass:"your-storage-account-key"

# Create a virtual directory in IIS pointing to the share
New-WebVirtualDirectory -Site "Default Web Site" `
  -Name "shared-content" `
  -PhysicalPath "\\myfilesaccount.file.core.windows.net\myfileshare\web-content"
```

## Troubleshooting Common Issues

### Error 53: Network Path Not Found

This usually means port 445 is blocked. Test connectivity:

```powershell
# Detailed connection test
Test-NetConnection -ComputerName myfilesaccount.file.core.windows.net -Port 445 -InformationLevel Detailed
```

Solutions:
- Check your firewall rules
- Contact your ISP (many residential ISPs block port 445)
- Use a VPN or ExpressRoute connection
- Consider Azure File Sync as an alternative

### Error 86: Incorrect Password

Double-check the storage account key. Keys are long base64 strings and easy to copy incorrectly. Regenerate the key if needed:

```bash
# Regenerate the storage account key
az storage account keys renew \
  --account-name myfilesaccount \
  --resource-group myresourcegroup \
  --key primary
```

Remember to update the credentials in Windows Credential Manager after regenerating keys.

### Slow Performance

SMB performance over the internet depends on latency. For best results:

- Place your Azure VM (if accessing from a VM) in the same region as the storage account
- Use SMB Multichannel (available on premium file shares) for higher throughput
- Enable larger SMB message sizes

```powershell
# Enable SMB Multichannel on the client (Windows Server 2022+)
Set-SmbClientConfiguration -EnableMultiChannel $true
```

### Disconnections After Idle Period

Windows may disconnect idle SMB sessions. To prevent this:

```powershell
# Increase the idle timeout for SMB sessions
Set-SmbClientConfiguration -SessionTimeout 60 -KeepConn 600
```

## Security Considerations

**Use private endpoints** whenever possible. This routes traffic through your virtual network instead of the public internet.

**Enable encryption in transit.** Azure Files enforces SMB encryption by default on newer accounts. Verify it is enabled:

```bash
# Check if secure transfer is required
az storage account show \
  --name myfilesaccount \
  --query "enableHttpsTrafficOnly"
```

**Rotate storage account keys regularly.** When you rotate keys, update the credentials stored in Windows Credential Manager.

**Consider Azure AD authentication** for Azure Files instead of storage account keys. This provides per-user access control and eliminates the need to share account keys.

## Wrapping Up

Mounting an Azure File Share on Windows is as straightforward as mapping any network drive. The PowerShell approach with `cmdkey` for credential storage gives you the most reliable setup for production use. Make sure port 445 is open, store credentials properly for persistent mounts, and use private endpoints when security is a priority. Once mounted, the Azure File Share works seamlessly with any Windows application that reads and writes to file paths.
