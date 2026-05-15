# How to Install and Configure BorgBackup for Deduplicated Backups on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, BorgBackup, Backup, Linux

Description: Learn how to install and Configure BorgBackup for Deduplicated Backups on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure BorgBackup for Deduplicated Backups on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Install and Configure BorgBackup for Deduplicated Backups requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-$(rpm -E %rhel).noarch.rpm
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y borgbackup
```

Verify the installation:

```bash
borg --version
rpm -qi borgbackup
```

## Step 3: Initialize the Repository

Create a backup repository. The encryption mode must be selected when the repository is initialized:

```bash
sudo mkdir -p /backup/borg
sudo borg init --encryption=repokey /backup/borg
```

Keep the passphrase and exported key in a safe location. Without them, encrypted backups cannot be restored.

## Step 4: Create a Backup Archive

```bash
sudo borg create --stats --compression lz4 /backup/borg::'{hostname}-{now}' /etc /home
sudo borg list /backup/borg
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo borg check /backup/borg
```

List the latest archive and confirm that expected files are present:

```bash
sudo borg list /backup/borg::$(sudo borg list --short /backup/borg | tail -n 1)
```

## Step 6: Configure Remote Repository Access

If you store backups on a remote server, Borg normally connects over SSH. Make sure SSH is available on the backup server:

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

Use a remote repository path when initializing and creating archives:

```bash
borg init --encryption=repokey backupuser@backup.example.com:/srv/borg/repo
borg create --stats --compression lz4 backupuser@backup.example.com:/srv/borg/repo::'{hostname}-{now}' /etc /home
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
borg create --progress --stats --compression zstd,3 /backup/borg::'{hostname}-{now}' /etc /home
borg prune --list --keep-daily=7 --keep-weekly=4 --keep-monthly=6 /backup/borg
borg compact /backup/borg
```

## Security Considerations

- Run backups with the least-privileged user that can read the files being backed up
- Use repository encryption and protect the Borg passphrase
- Export and store the repository key separately with `borg key export`
- Restrict remote access with SSH keys and firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Repository cannot be opened**: Verify the repository path and that the Borg passphrase is available
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Remote connection fails**: Test SSH access with `ssh backupuser@backup.example.com`

## Conclusion

You have successfully configured BorgBackup for deduplicated backups on RHEL. Monitor backup jobs regularly and keep BorgBackup updated to maintain security and performance.
