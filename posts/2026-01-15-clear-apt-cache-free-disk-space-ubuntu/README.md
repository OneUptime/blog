# How to Clear APT Cache and Free Disk Space on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, APT, Disk Space, Cleanup, System Administration, Tutorial

Description: Learn how to safely reclaim disk space on Ubuntu by clearing package caches, removing old kernels, and cleaning up system files.

---

Over time, Ubuntu accumulates downloaded packages, old kernels, temporary files, and logs that consume disk space. This guide covers safe ways to reclaim space without breaking your system.

## Check Disk Usage

```bash
# Overview of disk usage
df -h

# Find large directories
sudo du -sh /* 2>/dev/null | sort -hr | head -20

# Interactive disk usage tool
sudo apt install ncdu -y
sudo ncdu /
```

## Clear APT Cache

### View Cache Size

```bash
# Check cache size
sudo du -sh /var/cache/apt/archives

# List cached packages
ls /var/cache/apt/archives | wc -l
```

### Clean Cache

```bash
# Remove all cached packages
sudo apt clean

# Remove only outdated packages (keeps current versions)
sudo apt autoclean
```

### Configure Automatic Cleanup

```bash
# Edit apt configuration
sudo nano /etc/apt/apt.conf.d/10periodic
```

```
APT::Periodic::AutocleanInterval "7";
```

## Remove Unused Packages

### Autoremove Orphaned Packages

```bash
# Remove unused dependencies
sudo apt autoremove

# Remove with configuration files
sudo apt autoremove --purge

# See what would be removed
sudo apt autoremove --dry-run
```

### Remove Residual Config Files

```bash
# List packages with leftover configs
dpkg -l | grep '^rc'

# Remove all residual configs
sudo apt purge $(dpkg -l | grep '^rc' | awk '{print $2}')
```

## Remove Old Kernels

### List Installed Kernels

```bash
# List installed kernels
dpkg --list | grep linux-image

# Show current kernel (DON'T remove this)
uname -r
```

### Remove Old Kernels Safely

```bash
# Remove old kernels automatically
sudo apt autoremove --purge

# Manual removal of specific kernel
sudo apt purge linux-image-5.4.0-42-generic

# Remove associated headers
sudo apt purge linux-headers-5.4.0-42-generic
```

### Keep Only Last N Kernels

```bash
# List kernels to remove (keep current and one previous)
dpkg --list | grep -E 'linux-image-[0-9]' | awk '{print $2}' | sort -V | head -n -2

# Remove old kernels
sudo apt purge $(dpkg --list | grep -E 'linux-image-[0-9]' | awk '{print $2}' | sort -V | head -n -2)
```

## Clear System Logs

### View Log Sizes

```bash
# Check journald size
journalctl --disk-usage

# Check /var/log size
sudo du -sh /var/log
```

### Clean journald Logs

```bash
# Keep only last 7 days
sudo journalctl --vacuum-time=7d

# Limit to 500MB
sudo journalctl --vacuum-size=500M

# Keep only last 100 entries
sudo journalctl --vacuum-files=100
```

### Configure Journal Size Limit

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
SystemMaxUse=500M
SystemMaxFileSize=50M
MaxRetentionSec=7d
```

```bash
sudo systemctl restart systemd-journald
```

### Clean Old Logs

```bash
# Remove old rotated logs
sudo find /var/log -type f -name "*.gz" -delete
sudo find /var/log -type f -name "*.1" -delete

# Clear specific logs
sudo truncate -s 0 /var/log/syslog
sudo truncate -s 0 /var/log/kern.log
```

## Clear Temporary Files

```bash
# Remove old temp files (older than 7 days)
sudo find /tmp -type f -mtime +7 -delete

# Clear user temp files
rm -rf ~/.cache/*

# Clear thumbnail cache
rm -rf ~/.cache/thumbnails/*
```

## Clear Snap Cache

```bash
# Check snap usage
du -sh /var/lib/snapd/snaps

# List old snap revisions
snap list --all | awk '/disabled/{print $1, $3}'

# Remove old snap revisions
#!/bin/bash
snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
    sudo snap remove "$snapname" --revision="$revision"
done
```

### Set Snap Retention

```bash
# Keep only 2 revisions
sudo snap set system refresh.retain=2
```

## Clear Docker Resources

```bash
# Check Docker disk usage
docker system df

# Remove unused containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove all unused resources
docker system prune -a --volumes
```

## Clear Flatpak Cache

```bash
# Remove unused Flatpak runtimes
flatpak uninstall --unused

# Clear Flatpak cache
sudo rm -rf /var/tmp/flatpak-cache-*
```

## Find and Remove Large Files

### Find Large Files

```bash
# Find files larger than 100MB
sudo find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null

# Find largest files
sudo find / -type f -printf '%s %p\n' 2>/dev/null | sort -rn | head -20
```

### Find Duplicate Files

```bash
# Install fdupes
sudo apt install fdupes -y

# Find duplicates
fdupes -r /home/user

# Remove duplicates (interactive)
fdupes -rd /home/user
```

## Clear User Cache

```bash
# Browser caches
rm -rf ~/.cache/mozilla/
rm -rf ~/.cache/google-chrome/
rm -rf ~/.cache/chromium/

# Application caches
rm -rf ~/.cache/pip
rm -rf ~/.cache/yarn
rm -rf ~/.npm/_cacache

# Trash
rm -rf ~/.local/share/Trash/*
```

## Automated Cleanup Script

```bash
#!/bin/bash
# cleanup.sh - System cleanup script

echo "=== Ubuntu Cleanup Script ==="

echo -e "\n[1/7] Updating package lists..."
sudo apt update

echo -e "\n[2/7] Cleaning APT cache..."
sudo apt clean

echo -e "\n[3/7] Removing unused packages..."
sudo apt autoremove -y

echo -e "\n[4/7] Removing old kernels..."
sudo apt autoremove --purge -y

echo -e "\n[5/7] Cleaning journal logs..."
sudo journalctl --vacuum-time=7d

echo -e "\n[6/7] Cleaning thumbnail cache..."
rm -rf ~/.cache/thumbnails/*

echo -e "\n[7/7] Emptying trash..."
rm -rf ~/.local/share/Trash/*

echo -e "\n=== Cleanup Complete ==="
df -h /
```

## Schedule Regular Cleanup

```bash
# Add to crontab
sudo crontab -e
```

```bash
# Weekly cleanup at 3 AM Sunday
0 3 * * 0 apt clean && apt autoremove -y && journalctl --vacuum-time=7d
```

## Monitor Disk Usage

```bash
# Create alert script
sudo nano /usr/local/bin/disk-alert.sh
```

```bash
#!/bin/bash
THRESHOLD=80
CURRENT=$(df / | awk 'NR==2 {print int($5)}')

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
    echo "Disk usage is ${CURRENT}% on $(hostname)" | \
    mail -s "Disk Space Alert" admin@example.com
fi
```

```bash
# Add to cron
0 */6 * * * /usr/local/bin/disk-alert.sh
```

---

Regular cleanup prevents disk space issues and keeps your system running smoothly. Schedule automated cleanup tasks and monitor disk usage to avoid running out of space unexpectedly.
