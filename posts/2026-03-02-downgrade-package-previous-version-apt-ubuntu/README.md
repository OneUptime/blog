# How to Downgrade a Package to a Previous Version with APT on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Troubleshooting, System Administration

Description: Learn how to downgrade a package to a previous version on Ubuntu using APT, including finding available versions, pinning to prevent re-upgrade, and handling dependency issues.

---

An upgrade breaks something. Maybe a new version of nginx introduced a configuration syntax change, or a library update made a compiled application crash. Whatever the cause, reverting to a known-good package version is sometimes the fastest path to restoring service while you investigate properly.

## Before Downgrading: Alternatives to Consider

Downgrading can introduce dependency complications. Before proceeding, consider:

- **Check if there's a patch version**: The issue might be fixed in a newer minor version
- **Use a configuration rollback**: If the issue is configuration-related, fix the config rather than the package
- **Hold the package**: If you want to prevent future upgrades until you're ready, `apt-mark hold` is the tool

If downgrade is genuinely what you need, proceed with these steps.

## Step 1: Find Available Versions

APT can only downgrade to versions available in your configured repositories or the local cache:

```bash
# Show all available versions of a package
apt-cache policy nginx

# Output:
# nginx:
#   Installed: 1.24.0-1
#   Candidate: 1.24.0-1
#   Version table:
#  *** 1.24.0-1 500
#         500 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 Packages
#         100 /var/lib/dpkg/status
#      1.18.0-6ubuntu14.4 500
#         500 http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages

# Also check the package cache (may have older versions you downloaded)
ls /var/cache/apt/archives/ | grep nginx
```

The version table shows all versions APT knows about from your current sources.

## Step 2: Downgrade to a Specific Version

```bash
# Install a specific version (this triggers a downgrade if it's older)
sudo apt install nginx=1.18.0-6ubuntu14.4

# Confirm when APT warns you about the downgrade:
# The following packages will be DOWNGRADED:
#   nginx
# Do you want to continue? [Y/n]
```

If the version number isn't in your repository's package lists (only in cache), you might see it listed in `apt-cache policy` but APT won't install it by default. Use `--allow-downgrades`:

```bash
# Force downgrade even when APT is hesitant
sudo apt install --allow-downgrades nginx=1.18.0-6ubuntu14.4
```

## Step 3: Handling Dependency Issues During Downgrade

Downgrading often triggers dependency conflicts because the older package version requires older dependency versions too:

```bash
# Simulate the downgrade to see what it affects
sudo apt install --simulate nginx=1.18.0-6ubuntu14.4

# If dependencies are a problem, use the force flag (with caution)
sudo apt install -f nginx=1.18.0-6ubuntu14.4

# Or with dpkg directly for more control
sudo dpkg -i /var/cache/apt/archives/nginx_1.18.0-6ubuntu14.4_amd64.deb
sudo apt install -f  # Fix any dependency issues
```

## Step 4: Prevent Re-Upgrade After Downgrade

After downgrading, prevent APT from automatically upgrading back:

```bash
# Hold the package at the downgraded version
sudo apt-mark hold nginx

# Verify the hold
apt-mark showhold

# When you're ready to re-enable upgrades
sudo apt-mark unhold nginx
```

## Downgrading Kernel Packages

Kernel downgrades require extra steps because the running kernel can't be replaced while running:

```bash
# Check current kernel
uname -r
# 6.5.0-26-generic

# List available kernel versions
dpkg -l | grep linux-image-

# The old kernel is likely still installed (Ubuntu keeps previous kernels)
# Just reboot and select the old kernel in GRUB

# To set the old kernel as default:
# Edit /etc/default/grub and set GRUB_DEFAULT to the specific kernel

# Update GRUB after changes
sudo update-grub
```

For kernels, downgrade typically means just selecting an older installed kernel at boot, not uninstalling and reinstalling.

## Downgrading from a PPA

When you've added a PPA and want to revert to the official Ubuntu version:

```bash
# Remove the PPA and downgrade its packages automatically
sudo apt install ppa-purge
sudo ppa-purge ppa:owner/ppa-name

# This removes the PPA and downgrades all packages that came from it
# to the versions in the official Ubuntu repos
```

This is the cleanest way to revert a PPA installation.

## Using apt-get with --force-yes for Scripted Downgrades

In automation scripts where interactive prompts aren't possible:

```bash
# Non-interactive downgrade
sudo apt-get install -y --allow-downgrades nginx=1.18.0-6ubuntu14.4

# Or with dpkg environment variable to suppress prompts
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    --allow-downgrades \
    nginx=1.18.0-6ubuntu14.4
```

## Downgrading When the Old Version Is Not in Repositories

If the version you need isn't in any configured repository, you have a few options:

### Option A: Check the Local Cache

```bash
# APT caches downloaded packages (until apt clean is run)
ls /var/cache/apt/archives/ | grep -i nginx

# If found, install from cache
sudo dpkg -i /var/cache/apt/archives/nginx_1.18.0-6ubuntu14.4_amd64.deb
sudo apt install -f
```

### Option B: Download from Ubuntu Launchpad

Ubuntu maintains package snapshots at `launchpad.net/ubuntu`:

```bash
# Find the package version in Launchpad's package search
# https://launchpad.net/ubuntu/+source/nginx

# Download a specific version
wget https://launchpad.net/ubuntu/+archive/ubuntu/pool/main/n/nginx/nginx_1.18.0-6ubuntu14.4_amd64.deb

# Install it
sudo dpkg -i nginx_1.18.0-6ubuntu14.4_amd64.deb
sudo apt install -f
```

### Option C: Use Snapshot Repositories

Some projects maintain historical snapshot repositories. For Ubuntu packages, Launchpad's API can be queried for exact package versions.

## Downgrading Multiple Related Packages

When a package has multiple components that all need to be downgraded together:

```bash
# Downgrade all nginx-related packages at once
sudo apt install \
    nginx=1.18.0-6ubuntu14.4 \
    nginx-common=1.18.0-6ubuntu14.4 \
    nginx-core=1.18.0-6ubuntu14.4 \
    --allow-downgrades

# Hold them all to prevent re-upgrade
sudo apt-mark hold nginx nginx-common nginx-core
```

## Verifying the Downgrade

```bash
# Check the installed version
dpkg -l nginx
nginx --version

# Verify the package is the expected version
apt-cache policy nginx | grep "Installed:"
```

## Documenting the Downgrade

For operational discipline, document any intentional downgrades:

```bash
# Create a note in a standard location
sudo tee /etc/apt/preferences.d/nginx-downgrade-note << 'EOF'
# NOTE: nginx downgraded from 1.24.0 to 1.18.0 on 2026-03-02
# Reason: Version 1.24.0 introduced breaking change in SSL config handling
# Ticket: OPS-1234
# See apt-mark showhold for hold status
EOF
```

This helps future you (and future colleagues) understand why a package is on an unexpected version.

## Summary

The downgrade process on Ubuntu follows this sequence:

1. Find available versions with `apt-cache policy package-name`
2. Install the specific version: `sudo apt install package=version --allow-downgrades`
3. Hold it to prevent re-upgrade: `sudo apt-mark hold package`
4. Document the reason for the downgrade

For PPAs, use `ppa-purge` for a clean revert. For packages no longer in the repository, check the local cache or download from Launchpad. Always test the downgraded version before declaring the issue resolved.
