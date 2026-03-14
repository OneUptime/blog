# How to Configure Samba for macOS Time Machine Backups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, MacOS, Time Machine, Networking

Description: Learn how to configure a Samba share on Ubuntu to act as a Time Machine backup destination for macOS devices on your local network.

---

Using a Linux server as a Time Machine destination is a practical way to centralize Mac backups without buying dedicated Apple hardware. Samba has supported the Apple Filing Protocol extensions needed for Time Machine for several years now, and with Ubuntu as the host, you get a stable, low-cost network backup solution.

This guide walks through setting up Samba on Ubuntu to work as a Time Machine backup target. The configuration covers share creation, user authentication, disk quotas, and verifying the setup from a Mac.

## Prerequisites

Before starting, make sure you have:

- Ubuntu 20.04 or later
- Samba 4.8 or higher (included in Ubuntu 20.04+)
- A dedicated disk or partition for backups
- A user account on the Ubuntu server for each Mac user

## Installing Samba

If Samba is not already installed:

```bash
sudo apt update
sudo apt install samba -y
```

Confirm the installed version supports the required vfs modules:

```bash
smbd --version
# Should show 4.8 or higher
```

## Preparing the Backup Volume

Create a directory to hold Time Machine backups. A dedicated partition or disk is recommended to prevent backup data from filling your root filesystem.

```bash
# Create the backup directory
sudo mkdir -p /srv/timemachine

# Set ownership to nobody initially (Samba will map users)
sudo chown nobody:nogroup /srv/timemachine
sudo chmod 0777 /srv/timemachine
```

If you have a dedicated disk (e.g., `/dev/sdb`), format and mount it:

```bash
# Format the disk as ext4
sudo mkfs.ext4 /dev/sdb1

# Create mount point
sudo mkdir -p /mnt/backup

# Mount the disk
sudo mount /dev/sdb1 /mnt/backup

# Add to fstab for persistent mount
echo "/dev/sdb1  /mnt/backup  ext4  defaults  0  2" | sudo tee -a /etc/fstab

# Create the timemachine subdirectory on the mounted disk
sudo mkdir -p /mnt/backup/timemachine
sudo chmod 0777 /mnt/backup/timemachine
```

## Creating a Samba User

Each Mac user needs a corresponding Samba account:

```bash
# Add a system user (if not already present)
sudo useradd -M -s /usr/sbin/nologin tmuser

# Set Samba password for the user
sudo smbpasswd -a tmuser
# Enter and confirm a password when prompted

# Enable the user
sudo smbpasswd -e tmuser
```

## Configuring Samba for Time Machine

Open the main Samba configuration file:

```bash
sudo nano /etc/samba/smb.conf
```

Add or modify the `[global]` section and add a new share:

```ini
[global]
   # Basic server settings
   workgroup = WORKGROUP
   server string = Ubuntu Backup Server
   server role = standalone server

   # Enable Apple Extensions for Time Machine support
   fruit:metadata = stream
   fruit:model = MacSamba
   fruit:posix_rename = yes
   fruit:veto_appledouble = no
   fruit:wipe_intentionally_left_blank_rfork = yes
   fruit:delete_empty_adfiles = yes

   # Security settings
   security = user
   encrypt passwords = yes
   passdb backend = tdbsam

   # Logging
   log file = /var/log/samba/log.%m
   max log size = 1000
   logging = file

[TimeMachine]
   # Share path - adjust to your backup directory
   path = /mnt/backup/timemachine
   valid users = tmuser

   # Enable vfs modules required for Time Machine
   vfs objects = catia fruit streams_xattr

   # Time Machine specific options
   fruit:time machine = yes
   fruit:time machine max size = 500G   # Limit backup size to 500GB

   # Standard share settings
   read only = no
   browseable = yes
   create mask = 0600
   directory mask = 0700

   # Allow guest access if needed (optional, prefer no)
   guest ok = no
```

Save the file and test the configuration:

```bash
# Test Samba configuration for syntax errors
testparm

# Restart Samba to apply changes
sudo systemctl restart smbd nmbd
sudo systemctl enable smbd nmbd
```

## Firewall Configuration

Allow Samba traffic through UFW:

```bash
sudo ufw allow 'Samba'
sudo ufw status
```

This opens ports 137, 138 (UDP) and 139, 445 (TCP).

## Connecting from macOS

On the Mac, open Finder and select Go > Connect to Server, then enter:

```text
smb://ubuntu-server-ip/TimeMachine
```

Authenticate with the `tmuser` credentials. Once connected, open System Settings (or System Preferences on older macOS), go to Time Machine, click "Add Backup Disk," and select the mounted share.

macOS will display the share as an available Time Machine destination. Select it and Time Machine will begin the initial backup.

## Verifying the Share Works

Check active connections from the server side:

```bash
# Show current Samba connections
sudo smbstatus

# Check the share is being listed
smbclient -L localhost -U tmuser
```

Watch backup activity in real time:

```bash
# Monitor Samba logs
sudo tail -f /var/log/samba/log.smbd
```

## Setting Per-User Backup Limits

The `fruit:time machine max size` option sets a quota per share. For multiple users, create separate shares:

```ini
[TimeMachine-Alice]
   path = /mnt/backup/alice
   valid users = alice
   vfs objects = catia fruit streams_xattr
   fruit:time machine = yes
   fruit:time machine max size = 300G
   read only = no
   create mask = 0600
   directory mask = 0700

[TimeMachine-Bob]
   path = /mnt/backup/bob
   valid users = bob
   vfs objects = catia fruit streams_xattr
   fruit:time machine = yes
   fruit:time machine max size = 200G
   read only = no
   create mask = 0600
   directory mask = 0700
```

Create the directories and set ownership:

```bash
sudo mkdir -p /mnt/backup/alice /mnt/backup/bob
sudo chown alice:alice /mnt/backup/alice
sudo chown bob:bob /mnt/backup/bob
```

## Troubleshooting Common Issues

**Mac cannot find the share in Time Machine preferences:** Confirm the `fruit:time machine = yes` option is set and the `fruit` VFS module is loaded. Restart `nmbd` to re-announce the share via mDNS.

**Authentication failures:** Verify the Samba user was created with `smbpasswd -a` and is enabled. System users and Samba users have separate password databases.

**Backup stalls or disconnects:** Check the `max log size` setting and review `/var/log/samba/log.smbd` for errors. Slow networks or large backups can cause timeouts - consider increasing `deadtime` in smb.conf.

**Permission errors on backup files:** Ensure the backup directory has write permissions for the Samba user. Run `ls -la /mnt/backup/timemachine` and confirm the user can write there.

## Monitoring Backup Health

Add a basic monitoring check to confirm the backup disk has free space:

```bash
# Create a simple check script
cat > /usr/local/bin/check-tm-space.sh << 'EOF'
#!/bin/bash
THRESHOLD=90
USAGE=$(df /mnt/backup | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "WARNING: Backup disk usage at ${USAGE}%"
    logger "TimeMachine disk usage at ${USAGE}%"
fi
EOF

chmod +x /usr/local/bin/check-tm-space.sh

# Schedule it via cron
echo "0 * * * * root /usr/local/bin/check-tm-space.sh" | sudo tee /etc/cron.d/tm-space-check
```

With this setup, your Ubuntu server handles macOS Time Machine backups reliably. The `fruit` VFS module does the heavy lifting by implementing the Apple SMB extensions, making the share appear as a valid Time Machine destination without any additional software on the Mac side.
