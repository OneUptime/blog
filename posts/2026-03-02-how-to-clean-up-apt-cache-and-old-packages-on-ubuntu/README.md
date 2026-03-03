# How to Clean Up APT Cache and Old Packages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Disk Management, Package Management, Linux

Description: Reclaim disk space on Ubuntu by cleaning the APT package cache, removing orphaned packages, purging old kernels, and automating routine package maintenance.

---

APT caches every package it downloads to speed up reinstallation and support offline use. Over months of updates and package installations, this cache grows substantially. Combined with orphaned packages left behind when their parent packages were removed, a neglected Ubuntu system can waste several gigabytes on package management overhead.

## Understanding What APT Caches

APT stores downloaded packages in `/var/cache/apt/archives/`. When you run `apt install` or `apt upgrade`, packages are downloaded here before installation. They stay until you explicitly clear them.

```bash
# Check the current cache size
du -sh /var/cache/apt/archives/
du -sh /var/cache/apt/archives/partial/  # Partially downloaded packages

# List the largest cached packages
ls -lhS /var/cache/apt/archives/*.deb | head -20

# Count total packages in cache
ls /var/cache/apt/archives/*.deb 2>/dev/null | wc -l
```

## Basic APT Cleanup Commands

```bash
# Remove all cached packages
# Safe: installed packages don't need their .deb files to keep running
sudo apt clean

# Verify the cache is cleared
du -sh /var/cache/apt/archives/
# Should show a few KB at most

# autoclean: remove only outdated packages
# Keeps the latest version of each installed package's .deb
# Removes .deb files for versions that are no longer available in repositories
sudo apt autoclean

# autoremove: remove packages installed as dependencies
# that are no longer needed by any installed package
sudo apt autoremove

# Combine cleanup and autoremove
sudo apt autoremove --purge && sudo apt clean
```

The difference between `clean` and `autoclean` matters if you value the ability to reinstall packages without downloading them:
- `apt clean` removes everything
- `apt autoclean` removes only packages that are no longer downloadable (superseded versions)

## Removing Orphaned Packages

After removing packages over time, dependency packages they installed are left behind. `apt autoremove` handles the most obvious cases, but some orphaned packages slip through:

```bash
# Show packages marked as auto-installed but no longer needed
apt-mark showauto | head -30

# List packages that were auto-installed (installed as dependencies)
apt list --installed 2>/dev/null | grep "automatic" | head -20

# Install deborphan for more thorough orphan detection
sudo apt install -y deborphan

# Find packages with no dependencies and no reverse dependencies
deborphan

# Remove what deborphan found
sudo apt remove --purge $(deborphan)

# Run deborphan again - some orphans are only visible after removing others
deborphan

# For a more interactive approach, use orphaner
sudo apt install -y deborphan
sudo orphaner
```

Another useful tool is `apt-mark` for managing the auto-install status:

```bash
# Mark a package as manually installed (won't be autoremoved)
sudo apt-mark manual package-name

# Mark a package as auto-installed (will be removed if no longer needed)
sudo apt-mark auto package-name

# Show all manually installed packages
apt-mark showmanual | sort | head -30
```

## Purging Package Configuration Files

When you remove a package with `apt remove`, configuration files stay on disk. Use `purge` to remove both the package and its config:

```bash
# List packages in "rc" state (removed but config files remain)
dpkg --list | grep "^rc"

# Example output:
# rc  apache2    2.4.52  ...  (removed but config remains)

# Remove all lingering config files at once
dpkg --list | grep "^rc" | awk '{print $2}' | \
  sudo xargs -r dpkg --purge

# Or with apt
sudo apt purge $(dpkg --list | grep "^rc" | awk '{print $2}')

# After purging, verify no more rc packages
dpkg --list | grep "^rc" | wc -l
# Should be 0
```

## Cleaning Up Old Kernels

Ubuntu keeps multiple kernel versions. Each kernel image is typically 100-200MB, and with headers it can be 500MB or more per version:

```bash
# See all installed kernel packages
dpkg --list | grep -E "linux-(image|headers|modules)" | \
  grep -v "$(uname -r | sed 's/-generic//')"

# Check disk space used by kernel packages
dpkg --list | grep "linux-image" | awk '{print $2}' | \
  while read pkg; do
    size=$(dpkg-query -Wf '${Installed-Size}' "$pkg" 2>/dev/null)
    echo "${size}KB $pkg"
  done | sort -rn | head -10

# The safe way: let apt autoremove handle old kernels
sudo apt autoremove --purge

# Verify current kernel is not removed
uname -r  # This kernel will never be autoremoved

# If you want to manually remove a specific old kernel
# First verify it's not the running kernel
CURRENT=$(uname -r)
echo "Running: $CURRENT"
# Only remove kernels that are NOT $CURRENT
sudo apt purge linux-image-5.15.0-91-generic  # Example old kernel
sudo apt purge linux-headers-5.15.0-91-generic
sudo apt purge linux-modules-5.15.0-91-generic

# Update grub after removing kernels
sudo update-grub
```

## Setting Up Automatic Cleanup

Ubuntu has a built-in automatic cleanup mechanism through `unattended-upgrades`. You can also use `apt` timers directly:

```bash
# Install unattended-upgrades if not present
sudo apt install -y unattended-upgrades

# Configure automatic cleanup in /etc/apt/apt.conf.d/50unattended-upgrades
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

```text
# /etc/apt/apt.conf.d/50unattended-upgrades (relevant cleanup sections)
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
```

For automatic cache cleanup, create a periodic cleanup timer:

```bash
# Create a weekly cleanup script
sudo tee /etc/apt/apt.conf.d/99periodic << 'EOF'
// APT periodic configuration
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF
```

Or a cron job for more control:

```bash
# Create weekly apt cleanup cron job
sudo tee /etc/cron.weekly/apt-cleanup << 'EOF'
#!/bin/bash
# Weekly APT cleanup

LOG="/var/log/apt-cleanup.log"
echo "=== APT Cleanup $(date) ===" >> "$LOG"

# Remove orphaned packages
apt-get autoremove --purge -y >> "$LOG" 2>&1

# Clean package cache
apt-get clean >> "$LOG" 2>&1

# Remove lingering config files
dpkg --list | grep "^rc" | awk '{print $2}' | \
  xargs -r dpkg --purge >> "$LOG" 2>&1

echo "Done. Cache size: $(du -sh /var/cache/apt/archives/)" >> "$LOG"
EOF

sudo chmod +x /etc/cron.weekly/apt-cleanup
```

## Finding Large Installed Packages

Before removing packages, know which ones are actually large:

```bash
# List installed packages sorted by size
dpkg-query -Wf '${Installed-Size}\t${Package}\n' | \
  sort -rn | \
  head -30 | \
  awk '{printf "%s MB\t%s\n", $1/1024, $2}'

# Find packages you installed manually but might not need
apt-mark showmanual | \
  xargs -I{} dpkg-query -Wf '{}\t${Installed-Size}\n' {} | \
  sort -k2 -rn | \
  head -20

# Check package purpose before removing
apt show package-name
dpkg --listfiles package-name | head -20
```

## Full Cleanup Sequence

A complete cleanup in order of safety:

```bash
#!/bin/bash
# Complete APT cleanup sequence

echo "=== Before cleanup ==="
df -h /
du -sh /var/cache/apt/archives/

# Step 1: Remove packages no longer needed (safe)
sudo apt autoremove --purge -y

# Step 2: Clean package cache (safe - packages are still in repos)
sudo apt clean

# Step 3: Remove lingering config files (safe)
dpkg --list | grep "^rc" | awk '{print $2}' | \
  sudo xargs -r dpkg --purge

# Step 4: Check for manually orphaned packages (review output before acting)
if command -v deborphan &>/dev/null; then
    echo "Potential orphans (review before removing):"
    deborphan
fi

echo "=== After cleanup ==="
df -h /
du -sh /var/cache/apt/archives/ 2>/dev/null || echo "Cache empty"
```

Regular APT maintenance takes less than five minutes and typically reclaims hundreds of megabytes to several gigabytes on systems that haven't been cleaned in a while. The `autoremove` and `clean` commands are safe to run regularly without risking anything important.
