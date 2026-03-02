# How to Perform a Clean Reinstall of Ubuntu Without Losing Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, System Recovery, Installation, Data Management

Description: A practical guide to reinstalling Ubuntu cleanly while preserving user data, configurations, and application settings on a separate home partition or through selective backups.

---

There are situations where a fresh Ubuntu installation is the right answer: a system that has accumulated years of conflicting package installations, a machine that will not boot after a failed upgrade, a security incident where you cannot trust the existing OS installation, or simply wanting a clean slate on hardware you plan to repurpose. The concern that stops most people is losing data. With the right preparation, a clean reinstall does not mean losing anything important.

There are two distinct approaches depending on whether your disk is already partitioned with a separate `/home` partition (the ideal case) or whether everything is on one partition (the common case for most Ubuntu installations).

## Approach 1: Separate /home Partition (Easiest)

If you set up Ubuntu with a separate `/home` partition during initial installation, a clean reinstall is nearly risk-free. You reinstall Ubuntu to the root partition, tell the installer not to format the home partition, and your data is untouched.

### Checking Your Partition Layout

```bash
lsblk -f
df -h
cat /etc/fstab
```

If you see separate entries for `/` and `/home` with different partition numbers, you have a separate home partition.

### Reinstalling with a Separate /home Partition

During Ubuntu installation:

1. Choose "Something else" (manual partitioning) rather than "Erase disk"
2. Select the root partition (`/dev/sda1` or equivalent) and configure it as:
   - Use as: ext4
   - Format: YES (check the format checkbox)
   - Mount point: `/`
3. Select the home partition and configure it as:
   - Use as: ext4
   - Format: NO (do not check the format checkbox)
   - Mount point: `/home`
4. Proceed with installation

The installer will install a fresh Ubuntu to the root partition while leaving the home partition and all its contents completely untouched.

## Approach 2: Single-Partition Layout (More Work Required)

Most Ubuntu installations put everything on one partition. Here you need to back up data before reinstalling.

### Step 1: Inventory What to Back Up

Not everything needs to be backed up - the OS files will be replaced. Focus on:

```bash
# Files that need backing up:
# 1. User home directories
ls -la /home/

# 2. Custom configuration files in /etc
# Identify which configs you have modified
sudo find /etc -newer /etc/fstab -type f 2>/dev/null | head -30

# 3. Installed package list (to reinstall later)
dpkg --get-selections > ~/package-list.txt
sudo apt-mark showmanual > ~/manually-installed-packages.txt

# 4. Service configurations
sudo find /etc/systemd/system/ -name "*.service" -o -name "*.timer" | head -20
sudo ls /etc/nginx/sites-enabled/ 2>/dev/null
sudo ls /etc/apache2/sites-enabled/ 2>/dev/null

# 5. Cron jobs
crontab -l > ~/user-crontab.txt 2>/dev/null
sudo crontab -l > ~/root-crontab.txt 2>/dev/null
ls /etc/cron.d/

# 6. SSH keys (host and user)
ls -la /etc/ssh/ssh_host_*
ls -la ~/.ssh/

# 7. SSL certificates
sudo find /etc/ssl /etc/letsencrypt -name "*.pem" -o -name "*.crt" 2>/dev/null

# 8. Application data
sudo ls /var/lib/mysql/ 2>/dev/null      # MySQL databases
sudo ls /var/lib/postgresql/ 2>/dev/null  # PostgreSQL data
sudo ls /var/lib/docker/ 2>/dev/null      # Docker volumes
```

### Step 2: Create a Comprehensive Backup

```bash
# Create a backup script
nano ~/pre-reinstall-backup.sh
```

```bash
#!/bin/bash
# Pre-reinstall backup script
# Run as root or with sudo

BACKUP_DEST="/backup"  # Change to your external drive or remote location
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_DIR="${BACKUP_DEST}/ubuntu-backup-${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "Starting backup to $BACKUP_DIR"

# 1. User home directories
echo "Backing up home directories..."
sudo cp -a /home/ "$BACKUP_DIR/home/"
sudo cp -a /root/ "$BACKUP_DIR/root/" 2>/dev/null || true

# 2. Package lists
echo "Saving package lists..."
dpkg --get-selections > "$BACKUP_DIR/dpkg-selections.txt"
apt-mark showmanual > "$BACKUP_DIR/manually-installed.txt"
apt list --installed 2>/dev/null > "$BACKUP_DIR/apt-installed.txt"

# 3. Important /etc files
echo "Backing up /etc..."
sudo cp -a /etc/ "$BACKUP_DIR/etc/"

# 4. Cron jobs
echo "Backing up cron jobs..."
for user in $(cut -d: -f1 /etc/passwd); do
    crontab -l -u "$user" 2>/dev/null > "$BACKUP_DIR/cron-${user}.txt"
done

# 5. SSL certificates and keys
echo "Backing up SSL certificates..."
sudo cp -a /etc/ssl/ "$BACKUP_DIR/ssl/" 2>/dev/null || true
sudo cp -a /etc/letsencrypt/ "$BACKUP_DIR/letsencrypt/" 2>/dev/null || true

# 6. SSH host keys (to preserve server fingerprint)
echo "Backing up SSH host keys..."
sudo mkdir -p "$BACKUP_DIR/ssh-host-keys"
sudo cp /etc/ssh/ssh_host_* "$BACKUP_DIR/ssh-host-keys/"

# 7. Database dumps (if databases exist)
if command -v mysqldump &>/dev/null; then
    echo "Dumping MySQL databases..."
    sudo mysqldump --all-databases > "$BACKUP_DIR/mysql-all-databases.sql" 2>/dev/null || true
fi

if command -v pg_dumpall &>/dev/null; then
    echo "Dumping PostgreSQL databases..."
    sudo -u postgres pg_dumpall > "$BACKUP_DIR/postgresql-all.sql" 2>/dev/null || true
fi

# 8. Docker volumes (if Docker is installed)
if command -v docker &>/dev/null; then
    echo "Listing Docker volumes..."
    docker volume ls > "$BACKUP_DIR/docker-volumes.txt"
    # For a full backup, you would need to backup each volume individually
fi

# 9. List all custom systemd units
sudo find /etc/systemd/system -name "*.service" -o -name "*.timer" -o -name "*.mount" | \
    sudo xargs ls -la > "$BACKUP_DIR/custom-systemd-units.txt" 2>/dev/null

# 10. Installed snap packages
snap list 2>/dev/null > "$BACKUP_DIR/snap-packages.txt"

echo ""
echo "Backup complete: $BACKUP_DIR"
echo "Backup size: $(du -sh $BACKUP_DIR | cut -f1)"
```

```bash
chmod +x ~/pre-reinstall-backup.sh
# Run with root privileges
sudo bash ~/pre-reinstall-backup.sh
```

### Step 3: Copy Backup to External Storage

```bash
# Copy to external USB drive
rsync -avz /backup/ubuntu-backup-*/ /media/usb/server-backup/

# Or copy to a remote server
rsync -avz /backup/ubuntu-backup-*/ user@backup-server:/backups/$(hostname)/

# Verify the backup was copied successfully
du -sh /media/usb/server-backup/
ls -la /media/usb/server-backup/
```

## Performing the Reinstall

### Preparation Checklist

Before inserting the USB installer:

- [ ] Backup verified and accessible from external media
- [ ] Ubuntu installer ISO downloaded and written to USB
- [ ] You have a way to access the server if network comes up with a different IP
- [ ] Note the current IP configuration: `ip addr show && ip route show`
- [ ] Note the hostname: `hostname -f`
- [ ] Note disk layout: `lsblk -f && cat /etc/fstab`

### Creating the Ubuntu Installer USB

```bash
# On another Linux machine, write the ISO to USB
# Replace sdX with your USB device (use lsblk to identify it)
sudo dd if=ubuntu-24.04-live-server-amd64.iso of=/dev/sdX bs=4M status=progress && sync
```

### During Installation

When the installer asks about storage:

- Choose "Custom storage layout" or "Manual" partitioning
- If reformatting everything: configure your partition layout, confirm formatting
- If keeping a separate home: select root partition to format, select home partition without formatting
- Set the hostname, username, and password to match your notes

### Post-Reinstall Verification

After the installation completes and the system reboots:

```bash
# Verify network is up
ip addr show
ping 8.8.8.8 -c 3

# Check the hostname
hostname -f

# Check disk layout
lsblk -f
df -h
```

## Restoring Data After Reinstall

### Restoring Home Directories

```bash
# Mount or access your backup
sudo mount /dev/sdb1 /mnt/backup

# Restore home directories
sudo cp -a /mnt/backup/ubuntu-backup-*/home/username/ /home/username/
sudo chown -R username:username /home/username/
```

### Reinstalling Applications

```bash
# Restore apt package selections
sudo apt update
sudo dpkg --set-selections < /mnt/backup/ubuntu-backup-*/dpkg-selections.txt
sudo apt-get dselect-upgrade -y

# Or just install the manually-installed packages
sudo xargs apt install -y < /mnt/backup/ubuntu-backup-*/manually-installed.txt
```

### Restoring SSH Host Keys

Restoring the original SSH host keys preserves the server's fingerprint, preventing "man in the middle" warnings for users who have connected before:

```bash
# Restore SSH host keys
sudo cp /mnt/backup/ubuntu-backup-*/ssh-host-keys/ssh_host_* /etc/ssh/
sudo chmod 600 /etc/ssh/ssh_host_*key
sudo chmod 644 /etc/ssh/ssh_host_*key.pub
sudo systemctl restart ssh
```

### Restoring SSL Certificates

```bash
# Restore Let's Encrypt certificates
sudo cp -a /mnt/backup/ubuntu-backup-*/letsencrypt/ /etc/
sudo systemctl restart nginx 2>/dev/null || sudo systemctl restart apache2 2>/dev/null || true
```

### Restoring Databases

```bash
# Restore MySQL
sudo mysql < /mnt/backup/ubuntu-backup-*/mysql-all-databases.sql

# Restore PostgreSQL
sudo -u postgres psql < /mnt/backup/ubuntu-backup-*/postgresql-all.sql
```

### Restoring Custom Configuration Files

Rather than blindly restoring all of `/etc`, selectively restore the files you need:

```bash
# Restore specific service configs
sudo cp /mnt/backup/ubuntu-backup-*/etc/nginx/nginx.conf /etc/nginx/
sudo cp -a /mnt/backup/ubuntu-backup-*/etc/nginx/sites-available/ /etc/nginx/
sudo cp -a /mnt/backup/ubuntu-backup-*/etc/nginx/sites-enabled/ /etc/nginx/

# Restore cron jobs
sudo crontab -u root /mnt/backup/ubuntu-backup-*/cron-root.txt

# Restore custom systemd units
sudo cp /mnt/backup/ubuntu-backup-*/etc/systemd/system/*.service /etc/systemd/system/ 2>/dev/null || true
sudo systemctl daemon-reload
```

## Validating the Restoration

```bash
# Check that services are running
sudo systemctl status nginx mysql postgresql ssh 2>/dev/null

# Check that user data is accessible
ls -la /home/username/

# Verify application health
curl -s http://localhost/health

# Check monitoring status via your platform
# Confirm that OneUptime (https://oneuptime.com) shows the server as back online
```

## Summary

A clean Ubuntu reinstall without data loss requires thorough preparation: inventory what to back up, create complete backups of home directories, /etc configuration, SSL certificates, SSH host keys, and database dumps, and store those backups off the machine. During reinstall, use the manual partitioning option to either preserve a separate home partition or start fresh. After reinstall, restore data methodically - home directories first, then configuration files, then databases. Combined with uptime monitoring through [OneUptime](https://oneuptime.com), you can track the recovery process and confirm the server returns to full operation.
