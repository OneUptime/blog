# How to Use dpkg to Install, Remove, and Query .deb Packages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Dpkg, Package Management, System Administration, Debian

Description: Learn how to use dpkg to install, remove, query, and manage .deb packages on Ubuntu, including working with downloaded packages, verifying integrity, and querying the package database.

---

`dpkg` is the low-level package manager that APT builds upon. While most day-to-day package management goes through `apt`, understanding `dpkg` directly is essential for installing local `.deb` files, querying the package database, and diagnosing package issues. Every package installed on Ubuntu goes through `dpkg` - APT is a frontend that handles dependency resolution and then calls `dpkg` to do the actual work.

## Installing a .deb Package

The most common reason to use `dpkg` directly is installing a `.deb` file you've downloaded:

```bash
# Install a local .deb file
sudo dpkg -i package.deb

# Install multiple .deb files at once
sudo dpkg -i package1.deb package2.deb package3.deb

# Install all .deb files in a directory
sudo dpkg -i /path/to/downloads/*.deb
```

A common issue with `dpkg -i` is missing dependencies. Unlike APT, `dpkg` doesn't automatically fetch dependencies from the internet:

```bash
# If you get dependency errors after dpkg -i, run:
sudo apt install -f
# This tells APT to fix the broken dependency state by installing missing deps
```

The pattern for installing a downloaded package with automatic dependency resolution:

```bash
# Best practice when installing a downloaded .deb
sudo dpkg -i package.deb
sudo apt install -f  # Fix any missing dependencies
```

Or use `apt` directly if you have the file path:

```bash
# apt can install local .deb files and resolve dependencies
sudo apt install ./package.deb
```

## Removing Packages

```bash
# Remove a package (keeps configuration files)
sudo dpkg -r package-name

# Purge a package (removes config files too)
sudo dpkg -P package-name

# The difference:
# -r (remove): Removes files but leaves /etc/ config files
# -P (purge): Removes everything including config files
```

## Querying the Package Database

dpkg maintains a database of all installed packages with their states and metadata.

### List Installed Packages

```bash
# List all installed packages
dpkg -l

# The output format is:
# ii  package-name  version  architecture  description
# ^^ Status codes: i=installed, r=removed, c=config-only

# Filter to specific packages
dpkg -l nginx
dpkg -l "linux-image-*"  # Wildcard matching

# Count installed packages
dpkg -l | grep -c "^ii"
```

Understanding the status codes in `dpkg -l`:
- `ii` - Package is installed and OK
- `rc` - Package was removed but config files remain
- `un` - Unknown/not installed
- `hi` - Package is on hold (installed)

### Show Package Details

```bash
# Show full information about an installed package
dpkg -s nginx

# Output includes: version, dependencies, description, installed files
```

### List Files Installed by a Package

```bash
# List all files that a package installed
dpkg -L nginx

# Output:
# /.
# /etc
# /etc/nginx
# /etc/nginx/conf.d
# /etc/nginx/nginx.conf
# /usr/sbin/nginx
# ...

# Find where a specific package's binary is
dpkg -L nginx | grep bin
```

### Find Which Package Owns a File

```bash
# Search for which package owns a specific file
dpkg -S /usr/bin/curl
# curl: /usr/bin/curl

dpkg -S /etc/nginx/nginx.conf
# nginx: /etc/nginx/nginx.conf

# Search by partial path
dpkg -S 'nginx*'
```

## Checking Package Status

```bash
# Check if a specific package is installed
dpkg -s nginx

# Quick check with exit code
dpkg -s nginx > /dev/null 2>&1 && echo "Installed" || echo "Not installed"

# Check the install state
dpkg-query -W -f='${Status}\n' nginx
# install ok installed

# Get just the version
dpkg-query -W -f='${Version}\n' nginx
```

## Using dpkg-query for Formatted Output

`dpkg-query` is a more flexible query tool for scripts:

```bash
# Custom format output
dpkg-query -W -f='${Package} ${Version}\n' | head -20

# Get specific information about a package
dpkg-query -W -f='Package: ${Package}\nVersion: ${Version}\nStatus: ${Status}\n\n' nginx

# List all packages with their sizes
dpkg-query -W -f='${Installed-Size}\t${Package}\n' | sort -rn | head -20

# Export all package info to a file
dpkg-query -W -f='${Package}=${Version}\n' > installed-packages.txt
```

## Verifying Package Integrity

```bash
# Verify files installed by a package match expected checksums
sudo dpkg -V package-name

# Verify all installed packages (may take a while)
sudo dpkg -V

# Output format (only shows problems):
# ??5?????? /usr/bin/changed-file
# Flags: 5=checksum changed, M=permissions changed, T=timestamp changed
```

The `dpkg -V` command is useful for detecting if package files have been modified after installation.

## Managing Package Selection States

```bash
# Mark a package to be installed
echo "package-name install" | sudo dpkg --set-selections

# Mark a package to be removed
echo "package-name deinstall" | sudo dpkg --set-selections

# Mark a package as on hold
echo "package-name hold" | sudo dpkg --set-selections

# View current selection states
dpkg --get-selections

# Apply selections
sudo dpkg --configure -a
```

## Forcing Operations

dpkg supports force options for when normal operations fail. Use these with care:

```bash
# Force install even if dependencies aren't met
sudo dpkg --force-depends -i package.deb

# Force overwrite if another package owns a file
sudo dpkg --force-overwrite -i package.deb

# Force removal of a package that's broken
sudo dpkg --force-remove-reinstreq -r broken-package

# Force purge of a package with broken config state
sudo dpkg --force-all -P package-name
```

After any forced operation, always run:

```bash
sudo apt install -f
# or
sudo dpkg --configure -a
```

## Handling Half-Installed Packages

Sometimes an installation fails midway, leaving a package in a broken state:

```bash
# Check for packages in broken states
dpkg -l | grep -E "^[^ii]"

# Specific broken states:
dpkg -l | grep "^iU"  # Unpacked but not configured
dpkg -l | grep "^iF"  # Half-installed (failed)
dpkg -l | grep "^iH"  # Half-configured

# Fix all half-configured packages
sudo dpkg --configure -a

# Fix a specific package
sudo dpkg --configure package-name
```

## Extracting Package Contents

```bash
# Extract .deb contents to a directory without installing
dpkg-deb --extract package.deb /tmp/package-contents/

# Extract just the control information
dpkg-deb --info package.deb

# List files in a .deb without extracting
dpkg-deb --contents package.deb
```

## Reading Package Metadata

```bash
# Get package metadata from a .deb file (without installing)
dpkg-deb --field package.deb Package
dpkg-deb --field package.deb Version
dpkg-deb --field package.deb Depends

# All fields
dpkg-deb --info package.deb
```

## Practical Script Examples

```bash
#!/bin/bash
# check-critical-packages.sh
# Verify that essential packages are installed and healthy

REQUIRED_PACKAGES=(
    "openssh-server"
    "ufw"
    "fail2ban"
    "unattended-upgrades"
)

for pkg in "${REQUIRED_PACKAGES[@]}"; do
    status=$(dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null)
    if [ "$status" = "install ok installed" ]; then
        version=$(dpkg-query -W -f='${Version}' "$pkg")
        echo "OK: $pkg ($version)"
    else
        echo "MISSING or BROKEN: $pkg (status: $status)"
    fi
done
```

## Summary

Key dpkg operations to know:

- `dpkg -i package.deb` - Install a local package
- `dpkg -r package` / `dpkg -P package` - Remove or purge a package
- `dpkg -l` - List installed packages
- `dpkg -L package` - List files installed by a package
- `dpkg -S /path/to/file` - Find which package owns a file
- `dpkg -s package` - Show package status and details
- `dpkg -V package` - Verify package file integrity
- `dpkg --configure -a` - Configure any partially installed packages

Understanding `dpkg` gives you insight into what APT does under the hood and provides tools for situations where APT's dependency-first approach gets in the way.
