# How to Configure BorgBackup with Remote Repositories Over SSH on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, BorgBackup, Backup, Linux

Description: Learn how to configure BorgBackup with Remote Repositories Over SSH on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure BorgBackup with Remote Repositories Over SSH on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- SSH access to the remote repository host
- A stable network connection

## Overview

Configuring BorgBackup with remote repositories over SSH requires Borg to be installed on the client and, for the standard SSH mode, on the remote host. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y openssh-clients openssh-server
sudo systemctl enable --now sshd
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

## Step 3: Configure the SSH Repository

Create a dedicated repository user and directory on the remote host:

```bash
sudo useradd --create-home --shell /bin/bash borg
sudo mkdir -p /home/borg/repos/server1
sudo chown -R borg:borg /home/borg/repos
```

Copy the backup client's SSH key to the remote `borg` user:

```bash
ssh-copy-id borg@backup.example.com
```

Borg does not use a long-running service for normal backups. It starts `borg serve` over SSH when the client connects.

## Step 4: Initialize the Repository and Create a Backup

```bash
borg init --encryption=repokey borg@backup.example.com:/home/borg/repos/server1
borg create --stats borg@backup.example.com:/home/borg/repos/server1::'{hostname}-{now}' /etc /home
```

## Step 5: Verify the Configuration

Test the setup:

```bash
borg list borg@backup.example.com:/home/borg/repos/server1
borg check borg@backup.example.com:/home/borg/repos/server1
```

If SSH authentication fails, test the SSH connection directly:

```bash
ssh borg@backup.example.com borg --version
```

## Step 6: Configure Firewall Rules

If the remote repository host uses firewalld, allow SSH:

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
borg create --stats --compression lz4 borg@backup.example.com:/home/borg/repos/server1::'{hostname}-{now}' /etc /home
borg prune --list borg@backup.example.com:/home/borg/repos/server1 --glob-archives '{hostname}-*' --keep-daily 7 --keep-weekly 4 --keep-monthly 6
borg compact borg@backup.example.com:/home/borg/repos/server1
```

## Security Considerations

- Use a dedicated non-root user on the remote repository host
- Use SSH key authentication and protect the private key
- Restrict SSH access with firewall rules
- Consider a forced command in `~borg/.ssh/authorized_keys`, such as `command="borg serve --restrict-to-path /home/borg/repos",restrict ssh-rsa AAAAB3[...]`
- Export and store a copy of the Borg repository key if you use encryption
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **SSH connection fails**: Verify that `sshd` is running on the remote host and that port 22 is reachable
2. **Permission denied**: Verify SSH key access, repository ownership, and SELinux contexts with `ls -laZ`
3. **Borg not found on the remote host**: Install `borgbackup` on the remote host or use a mounted remote filesystem instead of Borg's SSH mode

## Conclusion

You have successfully configured BorgBackup with a remote repository over SSH on RHEL. Test restores regularly, check repository health, and keep Borg and SSH updated to maintain security and reliability.
