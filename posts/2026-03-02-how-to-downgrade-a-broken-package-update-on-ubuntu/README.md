# How to Downgrade a Broken Package Update on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Troubleshooting, System Administration

Description: Step-by-step guide to downgrading a broken package on Ubuntu using apt, dpkg, and the APT cache to restore a working system state after a bad update.

---

Package updates occasionally introduce regressions - a new version breaks an application, causes system instability, or conflicts with other installed software. When this happens, the fastest path to a working system is often reverting to the previous version. Ubuntu's package management tools support this, though downgrading is not always straightforward because it means going against the package manager's preferred direction.

## Before You Start: Identify the Problem Package

```bash
# Check recently installed/upgraded packages
grep " upgrade " /var/log/dpkg.log | tail -30
grep " install " /var/log/dpkg.log | tail -30

# Or use the apt history log for a cleaner view
grep "Upgrade:\|Install:" /var/log/apt/history.log | tail -20

# Check if a specific package version caused the issue
apt-cache policy packagename
# Output shows: installed version, candidate version, and version table
```

## Method 1: Downgrade Using the APT Cache (Fastest)

If you installed the package recently, the previous `.deb` file may still be in the APT cache at `/var/cache/apt/archives/`.

```bash
# List cached versions of a package
ls /var/cache/apt/archives/ | grep packagename

# Install the cached older version directly with dpkg
sudo dpkg -i /var/cache/apt/archives/packagename_1.2.3-1ubuntu1_amd64.deb

# If dpkg complains about dependencies, fix them after
sudo apt install -f
```

This works immediately if the old version is still cached and requires no network access.

## Method 2: Downgrade Using apt

If the older version is still available in your configured repositories (possible if you have multiple Ubuntu versions or PPAs configured):

```bash
# Check available versions in repositories
apt-cache madison packagename
# Shows: package | version | repository

# Install a specific version
sudo apt install packagename=1.2.3-1ubuntu1

# Example for a real package:
sudo apt install nginx=1.18.0-6ubuntu14
```

If the version you need is not shown, it is not in your current repositories and you need another method.

## Method 3: Download and Install the Specific Version

Older Ubuntu package versions are archived at packages.ubuntu.com or Launchpad.

```bash
# Navigate to the package history
# https://packages.ubuntu.com/
# Search for your package and Ubuntu release to find the specific version

# Download the specific .deb (example with wget)
wget http://archive.ubuntu.com/ubuntu/pool/main/n/nginx/nginx_1.18.0-6ubuntu14_amd64.deb

# Or from Launchpad (common for PPAs)
# https://launchpad.net/ubuntu/+source/packagename

# Install the downloaded package
sudo dpkg -i nginx_1.18.0-6ubuntu14_amd64.deb

# Fix any dependency issues
sudo apt install -f
```

## Method 4: Using Snapshot Archives

Ubuntu maintains a complete snapshot archive at `snapshot.debian.org` (for Debian packages) and there are unofficial Ubuntu snapshot services.

```bash
# Find the package on the Debian snapshot archive (for packages in Ubuntu that originate from Debian)
# https://snapshot.debian.org/binary/packagename/

# Download and install the older version
wget https://snapshot.debian.org/archive/debian/20240101T000000Z/pool/main/n/nginx/nginx_1.18.0-6.1_amd64.deb
sudo dpkg -i nginx_1.18.0-6.1_amd64.deb
```

## Preventing Automatic Re-upgrade After Downgrade

After downgrading, future `apt upgrade` commands will try to upgrade the package again. Pin the version to prevent this.

```bash
# Method 1: Hold the package at current version
sudo apt-mark hold packagename

# Verify the hold
sudo apt-mark showhold

# To release the hold later when you want to upgrade again
sudo apt-mark unhold packagename
```

```bash
# Method 2: Pin using APT preferences (more control)
sudo tee /etc/apt/preferences.d/pin-packagename << 'EOF'
Package: nginx
Pin: version 1.18.0-6ubuntu14
Pin-Priority: 1001
EOF

# Pin-Priority 1001 means this version takes priority over all others
# Check that the pin is working
apt-cache policy nginx
```

## Downgrading Multiple Interdependent Packages

Some packages depend on specific versions of others. Downgrading one may require downgrading its dependencies.

```bash
# Check what would be installed/downgraded
sudo apt install -s packagename=1.2.3  # -s = simulate

# The simulation output shows what else needs to change
# Downgrade all at once
sudo apt install packagename=1.2.3 dep1=4.5.6 dep2=7.8.9

# Or use aptitude which handles complex dependency resolution better
sudo apt install aptitude
sudo aptitude install packagename=1.2.3
```

## Rolling Back Using Timeshift or Snapshots

If you have filesystem snapshots (Btrfs, ZFS, or LVM snapshots), rolling back may be easier than package-level downgrade.

```bash
# With LVM, list available snapshots
sudo lvs

# List Timeshift snapshots if installed
sudo timeshift --list

# Restore from a Timeshift snapshot
sudo timeshift --restore --snapshot '2026-02-28_10-00-00'
```

This approach rolls back all changes, not just the package, which is both its advantage and disadvantage.

## Downgrading Library Packages

Library downgrades are more complex because other packages depend on them.

```bash
# Check what depends on the library
apt-cache rdepends libssl3

# Downgrading a widely-used library may require downgrading many packages
# Check impact before proceeding
sudo apt install libssl3=3.0.2-0ubuntu1.14 --simulate

# If many packages are affected, consider these alternatives:
# 1. Test in a container first
# 2. Use LD_LIBRARY_PATH to load the old library for specific applications
# 3. Compile the application against the old library statically

# Use a specific library version for a single application
LD_LIBRARY_PATH=/path/to/old/libs myapp
```

## Verifying the Downgrade Worked

```bash
# Check the installed version
apt-cache policy packagename
dpkg -l packagename

# For a service, check if it runs correctly
sudo systemctl restart servicename
sudo systemctl status servicename

# Check the version from the application itself
packagename --version
nginx -v
python3 --version
```

## Documenting the Downgrade

For production systems, document what you did and why.

```bash
# Check current package state
dpkg -l packagename
apt-cache policy packagename

# Write a note about the downgrade in a log
sudo tee /var/log/manual-package-changes.log << EOF
$(date) - Downgraded packagename from 2.0 to 1.18 due to regression in 2.0 causing issue X.
Package held to prevent auto-upgrade. Ticket: [link]
EOF
```

## When Downgrade Is Not Possible

Some situations prevent clean downgrading:

- The package modified a database schema that is not backward compatible
- Configuration files have been migrated to a new format
- The previous version is incompatible with other updated packages

In these cases, alternatives include:
- Rolling back to a full system snapshot (Timeshift, LVM)
- Using a container or VM with the old version for the affected workload
- Patching the new version to fix the specific regression (report upstream first)

Downgrading is a temporary measure. The right long-term fix is either waiting for the upstream bug to be fixed, finding a workaround, or reporting the issue to the Ubuntu package maintainers so it gets addressed properly.
