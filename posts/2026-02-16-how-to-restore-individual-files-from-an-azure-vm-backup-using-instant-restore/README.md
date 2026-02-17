# How to Restore Individual Files from an Azure VM Backup Using Instant Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Backup, Instant Restore, File Recovery, Azure VMs, Recovery Services Vault, Data Recovery, Snapshots

Description: Learn how to recover individual files and folders from Azure VM backups using the instant restore and file recovery feature without restoring the entire VM.

---

Sometimes you do not need to restore an entire VM. Maybe someone accidentally deleted an important configuration file, a log directory got wiped, or a developer overwrote a critical data file. Restoring the whole VM for a single file is overkill and takes too long. Azure Backup's file recovery feature lets you mount a recovery point as a drive on any machine and browse to the exact files you need.

This guide covers how to use file-level recovery from Azure VM backups, including both the portal-driven approach and the script-based method.

## How File Recovery Works

Instead of creating a new VM from a backup, file recovery mounts the backup disks directly to a machine you specify. The flow is:

1. You select a recovery point in the Azure portal
2. Azure generates a script (PowerShell for Windows, shell script for Linux)
3. You run the script on any machine (could be the original VM, another VM, or even your workstation)
4. The script mounts the recovery point's disks as local drives/volumes
5. You browse the mounted drives and copy the files you need
6. You unmount the drives when done

The whole process typically takes just a few minutes, compared to 30-60 minutes for a full VM restore.

```mermaid
flowchart LR
    A[Recovery Point in Vault] -->|Generate script| B[Download Script]
    B -->|Execute on target machine| C[Mount Backup Disks]
    C -->|Browse and copy| D[Recovered Files]
    D -->|Unmount| E[Cleanup]
```

## Prerequisites

- An Azure VM with at least one successful backup in a Recovery Services vault
- A machine to mount the recovery point on:
  - For Windows recovery points: Windows Server 2012 R2 or later, or Windows 10/11
  - For Linux recovery points: A Linux machine with Python 2.7+ and open-iscsi and lvm2 packages
- Network connectivity from the mount machine to Azure (outbound HTTPS)
- The mount machine must not be the same VM you are recovering files from if the original VM's disks are encrypted with Azure Disk Encryption using BEK+KEK

## Step 1: Select the Recovery Point

1. Open the Azure portal and navigate to your Recovery Services vault
2. Go to "Backup items" and select "Azure Virtual Machine"
3. Click on the VM you want to recover files from
4. Click "File Recovery" in the toolbar

You are presented with a list of available recovery points. Each one shows:
- The date and time of the backup
- The type (snapshot or vault tier)
- Whether it is crash-consistent or application-consistent

For file recovery, any recovery point type works. Choose the one that contains the version of the file you need. If you need a file from yesterday, pick yesterday's recovery point. If the file was deleted three weeks ago, pick a recovery point from before the deletion.

## Step 2: Generate and Download the Recovery Script

After selecting a recovery point:

1. Click "Download Executable" (Windows) or "Download Script" (Linux)
2. Save the file along with the password displayed in the portal
3. Note the password - you will need it when running the script

The portal displays the password only once. Copy it to a safe location before downloading the script.

## Step 3: Run the Script on Windows

Copy the downloaded executable to the machine where you want to mount the drives. Right-click and "Run as administrator."

```powershell
# The script is a self-extracting executable
# Run it from an elevated PowerShell prompt

# Navigate to the download directory
Set-Location "C:\Users\admin\Downloads"

# Execute the recovery script
# It will prompt for the password shown in the portal
.\IaaSVMILRExeForWindows.exe

# When prompted, enter the password from the portal
# The script establishes an iSCSI connection to the recovery point
# and mounts the backup disks as local drive letters
```

Once the script runs successfully, you will see output like:

```
Successfully connected to the recovery point.
Volumes mounted:
  F:\ (OS Disk)
  G:\ (Data Disk 1)
```

The backup disks appear as new drive letters in Windows Explorer. You can browse them like any other drive.

## Step 4: Run the Script on Linux

For Linux VMs, the process uses a Python script:

```bash
# Install required packages if not already present
# These are needed for iSCSI connection and LVM support
sudo apt-get update
sudo apt-get install -y open-iscsi lvm2 python3

# Make the downloaded script executable
chmod +x LinuxILRScript.py

# Run the script with sudo (required for iSCSI and mount operations)
sudo python3 LinuxILRScript.py

# Enter the password when prompted
# The script connects via iSCSI and mounts the volumes
```

On Linux, the volumes are mounted under `/mnt/vmmount/` by default. If the original VM had LVM, the script automatically activates the volume groups and mounts the logical volumes.

The mount points follow this pattern:
```
/mnt/vmmount/sdc1/     (OS partition)
/mnt/vmmount/sdd1/     (Data disk 1)
/mnt/vmmount/vg-data-lv-data/  (LVM logical volume)
```

## Step 5: Locate and Copy Files

With the drives mounted, navigate to the files you need and copy them.

### Windows Example

```powershell
# Browse the mounted backup drive and find the files you need
# In this example, recovering a deleted IIS configuration file

# List files in the IIS directory on the backup
Get-ChildItem "F:\inetpub\wwwroot\web.config"

# Copy the file to the current VM's filesystem
Copy-Item "F:\inetpub\wwwroot\web.config" "C:\inetpub\wwwroot\web.config.restored"

# If you need to recover an entire directory
# Use robocopy for better handling of large directories with logging
robocopy "F:\Data\Reports\2026" "C:\Data\Reports\2026-restored" /E /LOG:C:\temp\recovery.log

# Verify the recovered files
Get-FileHash "C:\inetpub\wwwroot\web.config.restored" -Algorithm SHA256
```

### Linux Example

```bash
# Browse the mounted backup and find files
ls -la /mnt/vmmount/sdc1/etc/nginx/

# Copy a configuration file
cp /mnt/vmmount/sdc1/etc/nginx/nginx.conf /etc/nginx/nginx.conf.restored

# Recover an entire directory with rsync for progress tracking
rsync -avh --progress /mnt/vmmount/sdd1/var/lib/mysql/ /var/lib/mysql-restored/

# Verify file integrity
sha256sum /etc/nginx/nginx.conf.restored
```

## Step 6: Handle Special Cases

### Recovering from Encrypted Disks

If the original VM used Azure Disk Encryption (ADE), the file recovery script handles decryption automatically, provided:
- You have access to the Key Vault containing the encryption keys
- The mount machine has connectivity to the Key Vault
- Your Azure AD credentials have permission to access the keys

### Recovering Large Files or Many Files

The iSCSI connection used by file recovery has decent throughput, but for very large restores (tens of GB or more), consider doing a full VM restore instead. The iSCSI connection can time out during very long copy operations.

To handle this, copy in batches and verify each batch:

```powershell
# For large recovery jobs, copy in batches with verification
# This script copies files in chunks and verifies checksums

$sourcePath = "F:\Data\Database\Backups"
$targetPath = "C:\Data\Database\Backups-Restored"

# Get all files to recover
$files = Get-ChildItem -Path $sourcePath -Recurse -File

$totalSize = ($files | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Output "Total recovery size: $([math]::Round($totalSize, 2)) GB"
Write-Output "Files to recover: $($files.Count)"

# Copy each file and verify
$copied = 0
foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($sourcePath.Length)
    $targetFile = Join-Path $targetPath $relativePath

    # Create target directory if needed
    $targetDir = Split-Path $targetFile -Parent
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    # Copy the file
    Copy-Item $file.FullName $targetFile -Force

    # Verify the copy
    $sourceHash = (Get-FileHash $file.FullName -Algorithm MD5).Hash
    $targetHash = (Get-FileHash $targetFile -Algorithm MD5).Hash

    if ($sourceHash -ne $targetHash) {
        Write-Warning "MISMATCH: $relativePath"
    }

    $copied++
    if ($copied % 100 -eq 0) {
        Write-Output "Progress: $copied / $($files.Count) files"
    }
}

Write-Output "Recovery complete: $copied files copied"
```

### Recovering System Files

If you need to recover system files (like Windows registry hives or boot configuration), you will likely need to do a full VM restore. File recovery mounts the disks read-only, and system files typically need to be restored offline.

## Step 7: Unmount and Clean Up

After you have copied everything you need, unmount the recovery point:

### Windows

Close any File Explorer windows or command prompts that have the mounted drives open, then run:

```powershell
# Unmount the recovery point drives
# Run the script again with the unmount parameter
.\IaaSVMILRExeForWindows.exe -Unmount
```

Or simply close the script window. It will prompt you to unmount.

### Linux

```bash
# Unmount the recovery point
sudo python3 LinuxILRScript.py -unmount

# Verify all mounts are cleaned up
mount | grep vmmount
```

If the script does not clean up properly, you can manually disconnect the iSCSI sessions:

```bash
# Manual cleanup if the script fails to unmount
sudo iscsiadm -m session -u
sudo iscsiadm -m node --logout
```

Important: File recovery sessions time out automatically after 12 hours. If you leave drives mounted longer than that, the connection drops and you need to generate a new script.

## When to Use File Recovery vs. Full VM Restore

| Scenario | File Recovery | Full VM Restore |
|----------|:---:|:---:|
| Single file or folder recovery | Best | Overkill |
| Recover application data | Good | Good |
| Recover entire VM after corruption | Not suitable | Best |
| Recover system files/OS | Not suitable | Best |
| Large data recovery (100+ GB) | Slow | Better |
| Quick recovery needed | Fast (minutes) | Slow (30-60 min) |

## Wrapping Up

File-level recovery from Azure VM backups is one of those features that seems minor until you desperately need it. Being able to mount a recovery point as a drive, browse to the exact file you need, and copy it back in minutes is vastly better than waiting for a full VM restore. Keep it in your toolkit, test it periodically so you know the workflow, and make sure the people on your team who handle incidents know it exists.
