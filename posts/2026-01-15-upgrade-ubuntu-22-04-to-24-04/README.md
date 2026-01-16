# How to Upgrade Ubuntu to a Newer Version (22.04 to 24.04)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Upgrade, System Administration, LTS, Tutorial

Description: A step-by-step guide to safely upgrading Ubuntu from 22.04 LTS to 24.04 LTS with pre-upgrade checks and rollback strategies.

---

Upgrading Ubuntu to a new LTS (Long Term Support) release brings security patches, new features, and extended support. This guide covers upgrading from Ubuntu 22.04 LTS (Jammy Jellyfish) to 24.04 LTS (Noble Numbat), but the process applies to other version upgrades as well.

## Prerequisites

- Ubuntu 22.04 LTS fully updated
- Root or sudo access
- At least 10GB free disk space
- Backup of critical data
- Stable internet connection

## Pre-Upgrade Checklist

### 1. Backup Your System

Before any major upgrade, create backups:

```bash
# Create a list of installed packages for reference
dpkg --get-selections > ~/installed-packages-backup.txt

# Backup important configuration files
sudo tar -czvf ~/etc-backup.tar.gz /etc

# If using databases, dump them
# For MySQL:
mysqldump --all-databases > ~/all-databases-backup.sql

# For PostgreSQL:
pg_dumpall > ~/postgresql-backup.sql
```

### 2. Check Current Version

Verify your starting point:

```bash
# Display current Ubuntu version and release information
lsb_release -a

# Check kernel version
uname -r
```

### 3. Update Current System

Ensure your current system is fully updated:

```bash
# Update package lists
sudo apt update

# Upgrade all installed packages to latest versions
sudo apt upgrade -y

# Perform distribution upgrade to handle held-back packages
sudo apt dist-upgrade -y

# Remove unnecessary packages
sudo apt autoremove -y

# Clean package cache
sudo apt autoclean
```

### 4. Check for Held Packages

Held packages can block upgrades:

```bash
# List any packages marked as held
apt-mark showhold

# If packages are held, consider unholdling them temporarily
# sudo apt-mark unhold package_name
```

### 5. Check Disk Space

Verify you have enough free space:

```bash
# Show disk usage for all mounted filesystems
df -h

# Check space in /boot (needs at least 500MB free)
df -h /boot
```

If `/boot` is nearly full, remove old kernels:

```bash
# Remove old kernel versions to free space
sudo apt autoremove --purge
```

### 6. Review Third-Party Repositories

Third-party PPAs may cause issues during upgrade:

```bash
# List all PPAs and third-party sources
ls /etc/apt/sources.list.d/

# Consider disabling non-essential PPAs before upgrading
# They will be disabled automatically during upgrade anyway
```

## Upgrade Methods

### Method 1: Using do-release-upgrade (Recommended)

This is the official and safest method.

```bash
# Install the update manager if not present
sudo apt install update-manager-core -y

# Check if a new LTS release is available
sudo do-release-upgrade -c
```

If an upgrade is available, start it:

```bash
# Begin the upgrade process (use -d flag for development releases)
sudo do-release-upgrade
```

**For Server Systems:** If you're connected via SSH, the upgrade tool will:
- Start an additional SSH daemon on port 1022 as a backup
- Prompt you to confirm before proceeding

### Method 2: Force LTS Upgrade

If `do-release-upgrade` doesn't find a new version, you may need to modify settings:

```bash
# Edit the release upgrade configuration
sudo nano /etc/update-manager/release-upgrades
```

Ensure it says:

```
Prompt=lts
```

For normal releases (not just LTS), use `Prompt=normal`.

Then run:

```bash
# Force check for new LTS release
sudo do-release-upgrade
```

## During the Upgrade

The upgrade process takes 30-90 minutes depending on your system and internet speed.

### What to Expect

1. **Package download**: All new packages are downloaded first
2. **Configuration prompts**: You may be asked about changed config files
   - Choose "keep local version" to preserve your customizations
   - Choose "install package maintainer's version" for default configs
3. **Service restarts**: Services will restart automatically
4. **Reboot prompt**: You'll be asked to reboot when complete

### Configuration File Decisions

When prompted about configuration files:

```
Configuration file '/etc/someconfig'
 ==> Modified (by you or by a script) since installation.
 ==> Package distributor has shipped an updated version.
   What would you like to do about it?

   Y or I  : install the package maintainer's version
   N or O  : keep your currently-installed version
   D       : show the differences between the versions
   Z       : start a shell to examine the situation
```

**Tip**: Press `D` to see differences before deciding.

## Post-Upgrade Tasks

### 1. Verify the Upgrade

```bash
# Confirm new Ubuntu version
lsb_release -a

# Check kernel version
uname -r

# Verify system is bootable and running correctly
uptime
```

### 2. Update and Clean Up

```bash
# Update package lists for new release
sudo apt update

# Upgrade any remaining packages
sudo apt upgrade -y

# Remove obsolete packages from previous release
sudo apt autoremove -y

# Clean package cache
sudo apt autoclean
```

### 3. Re-enable Third-Party Repositories

PPAs are disabled during upgrade. Re-enable needed ones:

```bash
# List disabled sources (they have .distUpgrade extension)
ls /etc/apt/sources.list.d/*.distUpgrade

# Re-enable a repository by renaming back
# First verify the PPA supports Ubuntu 24.04
sudo mv /etc/apt/sources.list.d/someppa.list.distUpgrade /etc/apt/sources.list.d/someppa.list

# Update after re-enabling
sudo apt update
```

### 4. Check Services

Verify critical services are running:

```bash
# Check status of your important services
sudo systemctl status apache2
sudo systemctl status mysql
sudo systemctl status nginx
sudo systemctl status ssh

# List failed services
sudo systemctl --failed
```

### 5. Review Logs

Check for any issues:

```bash
# View upgrade log
cat /var/log/dist-upgrade/main.log

# Check system log for errors
sudo journalctl -p err -b
```

## Troubleshooting

### Upgrade Interrupted

If the upgrade was interrupted:

```bash
# Try to fix broken packages
sudo dpkg --configure -a

# Fix broken dependencies
sudo apt --fix-broken install

# Continue the upgrade
sudo do-release-upgrade
```

### Boot Issues

If the system won't boot after upgrade:

1. Boot from Ubuntu Live USB
2. Mount your root partition
3. Chroot into the system:

```bash
# Mount the root partition (adjust sda1 as needed)
sudo mount /dev/sda1 /mnt

# Mount system directories
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys

# Chroot into the mounted system
sudo chroot /mnt

# Fix packages
apt update
apt --fix-broken install
dpkg --configure -a

# Update GRUB bootloader
update-grub

# Exit chroot and reboot
exit
sudo reboot
```

### Package Conflicts

For stubborn package conflicts:

```bash
# Force removal of problematic package
sudo dpkg --remove --force-remove-reinstreq package_name

# Clean up and reinstall
sudo apt clean
sudo apt update
sudo apt upgrade
```

### Reverting the Upgrade

If the upgrade fails catastrophically:

1. Restore from your backup
2. Or reinstall Ubuntu 22.04 and restore data

This is why backups are essential before upgrading.

## Command-Line Upgrade for Servers

For headless servers or when you want more control:

```bash
# Ensure screen is installed for session persistence
sudo apt install screen -y

# Start a screen session
screen -S upgrade

# Run the upgrade
sudo do-release-upgrade

# If disconnected, reattach with:
screen -r upgrade
```

## Best Practices

1. **Test first**: Upgrade a test/staging system before production
2. **Schedule downtime**: Plan for at least 2 hours of potential downtime
3. **Document changes**: Note any configuration decisions made during upgrade
4. **Verify applications**: Test all critical applications after upgrade
5. **Keep backups**: Maintain backups for at least a week after upgrade

---

After a successful upgrade, your system will have five years of security support with Ubuntu 24.04 LTS. Remember to check that all your applications are compatible with the new release and update any custom scripts that may reference version-specific paths.
