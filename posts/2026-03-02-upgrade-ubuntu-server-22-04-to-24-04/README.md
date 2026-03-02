# How to Upgrade Ubuntu Server from 22.04 LTS to 24.04 LTS Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Upgrade, LTS, Server Administration

Description: A careful walkthrough for upgrading Ubuntu Server from 22.04 Jammy Jellyfish to 24.04 Noble Numbat, including pre-upgrade preparation, the upgrade process, and post-upgrade verification.

---

Upgrading an LTS Ubuntu Server requires more care than a desktop upgrade. Production systems running real workloads need thorough preparation, a tested rollback plan, and systematic verification after the upgrade completes. Rushing through this process is how upgrades turn into outages.

## Should You Upgrade Now?

Ubuntu 24.04 LTS (Noble Numbat) was released in April 2024. Canonical's policy is to make the upgrade path from the previous LTS available after the first point release, which for 24.04 was 24.04.1, released in August 2024.

Before upgrading, check:
- Are all your critical packages available in 24.04?
- Are any third-party PPAs or repositories compatible with Noble?
- Does your hardware support the 24.04 kernel?
- Have you verified the upgrade on a test system first?

For production servers, never upgrade without testing on a staging environment that mirrors production.

## Pre-Upgrade: Preparation Checklist

### 1. Create a Backup

Before anything else, back up your data. If you are on a VM, take a snapshot now:

```bash
# On AWS: create an AMI or EBS snapshot
# On DigitalOcean: use the Snapshot feature in the control panel
# On bare metal: back up critical directories

# Back up key configuration directories
sudo tar -czf /backup/etc-backup-$(date +%Y%m%d).tar.gz /etc
sudo tar -czf /backup/home-backup-$(date +%Y%m%d).tar.gz /home

# Back up database data if applicable
# PostgreSQL example:
sudo -u postgres pg_dumpall > /backup/postgres-backup-$(date +%Y%m%d).sql

# MySQL/MariaDB example:
sudo mysqldump --all-databases --single-transaction > /backup/mysql-backup-$(date +%Y%m%d).sql
```

### 2. Update All Current Packages

The upgrade will go more smoothly if the current system is fully patched:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt dist-upgrade -y
sudo apt autoremove -y
sudo apt autoclean
```

Reboot after the update to ensure you are running the latest kernel:

```bash
sudo reboot
```

### 3. Check the Current Ubuntu Version

```bash
lsb_release -a
uname -r
```

Confirm you are on 22.04 before proceeding.

### 4. Check for Held Packages

Held packages can block or complicate an upgrade:

```bash
sudo apt-mark showhold
```

If any packages are held, understand why before releasing them. Some packages are held for good reasons (like pinned third-party software).

### 5. Disable Third-Party PPAs

Third-party PPAs often do not have packages for the new Ubuntu version and can cause the upgrade to fail or install incompatible software:

```bash
# List all enabled PPAs and external repositories
grep -r "^deb" /etc/apt/sources.list /etc/apt/sources.list.d/

# Disable them (rename to .disabled)
cd /etc/apt/sources.list.d/
for file in *.list; do
    sudo mv "$file" "${file}.disabled"
done
```

Re-enable them after the upgrade once you have verified their compatibility.

### 6. Verify Disk Space

The upgrade download and installation requires significant disk space:

```bash
df -h
```

You need at least 5-10GB free on `/`. Check that `/boot` is not almost full (a common issue):

```bash
df -h /boot
# Remove old kernels if /boot is more than 75% full
sudo apt autoremove --purge
```

### 7. Check for Running Services

Note all services that are currently running so you can verify they come back up correctly:

```bash
systemctl list-units --type=service --state=running > /backup/running-services-$(date +%Y%m%d).txt
```

## Running the Upgrade

Ensure you have a way to reconnect if your SSH session drops. Use tmux or screen to run the upgrade inside a persistent session:

```bash
# Install and start a tmux session
sudo apt install tmux
tmux new -s upgrade
```

If your SSH connection drops, reconnect and run `tmux attach -t upgrade` to resume.

### Run do-release-upgrade

```bash
sudo do-release-upgrade
```

The tool will:
1. Check upgrade prerequisites
2. Download the new packages
3. Ask for confirmation before making changes
4. Perform the upgrade
5. Ask about restarting services
6. Prompt about configuration file changes

### Configuration File Decisions

During the upgrade, you will be asked about configuration files that have been modified. The options are:
- **Keep the local version**: Your custom configuration is preserved
- **Use the new maintainer's version**: Replaces your config with the package default
- **Show diff**: See what changed before deciding

For system files you have heavily customized (like `/etc/ssh/sshd_config`, `/etc/nginx/nginx.conf`), choose to keep your local version. You can manually review new defaults later.

For files you have not touched, accepting the package version is usually fine.

### Handling Service Restarts

The upgrade will ask whether to restart services automatically or defer until reboot. For a server, deferring to the final reboot is safer - services may fail to restart mid-upgrade if they depend on packages not yet fully upgraded.

Choose "Yes" when asked if you want to keep the existing behavior (reboot after upgrade completes).

## Post-Upgrade Verification

After the system reboots:

```bash
# Verify the new version
lsb_release -a
# Should show Ubuntu 24.04.x LTS

# Check the new kernel
uname -r
# Should show a 6.8.x or later kernel
```

### Check Critical Services

```bash
# Compare running services against pre-upgrade list
systemctl list-units --type=service --state=running

# Check for failed services
systemctl --failed

# Start any failed services and investigate why they failed
sudo systemctl start service-name
sudo journalctl -u service-name -n 50
```

### Verify Network Configuration

```bash
# Check interfaces
ip addr show
ip route show

# Test DNS resolution
host ubuntu.com

# If using Netplan, check for syntax changes
sudo netplan try
```

### Check Application Functionality

Test each application that runs on the server:
- Web applications: make HTTP requests, check response codes
- Databases: connect and run a test query
- Background services: check they are processing work

### Review Logs for Errors

```bash
# Check boot log for errors
sudo journalctl -b -p err

# Check recent system logs
sudo journalctl --since="1 hour ago" -p err
```

## Cleaning Up After the Upgrade

```bash
# Remove packages no longer needed
sudo apt autoremove --purge

# Clean the package cache
sudo apt autoclean

# Remove old kernels (keep at least one backup)
sudo apt autoremove --purge

# Re-enable compatible PPAs
cd /etc/apt/sources.list.d/
# Review each .disabled file and re-enable if the PPA has 24.04 support
# Update the "noble" reference or check the PPA's documentation
sudo mv ppa-name.list.disabled ppa-name.list
sudo apt update
```

## Rollback Options

If the upgrade causes severe problems:

1. **VM snapshot**: Restore from the snapshot taken before the upgrade
2. **Backup restore**: Reinstall 22.04 and restore from backup
3. **ZFS boot environments**: If using ZFS with zsys, boot the pre-upgrade snapshot from GRUB
4. **Btrfs snapshots**: Roll back the root subvolume to the pre-upgrade snapshot

There is no supported in-place downgrade from 24.04 to 22.04. The rollback options all involve restoring a previous state.

## Common Post-Upgrade Issues

### Python 3 Differences

Ubuntu 24.04 ships with Python 3.12. Scripts that depend on specific Python versions or packages may break. Check virtual environments and update them:

```bash
# Rebuild virtual environments
python3 -m venv --upgrade /path/to/venv
```

### OpenSSL Version Changes

24.04 uses OpenSSL 3.x. Some older applications that relied on deprecated cryptographic algorithms may fail. Check `/var/log/syslog` for SSL-related errors.

### Removed Packages

Some packages present in 22.04 are removed or renamed in 24.04. If something is missing:

```bash
apt search package-name
```

Upgrades between LTS versions are well-tested by Canonical, but the combination of your specific installed software, customizations, and workloads creates unique upgrade challenges. The thorough preparation described here is what separates smooth upgrades from emergency recoveries.
