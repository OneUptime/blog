# How to Create Your Own .deb Package on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, dpkg, Package Management, Development, Debian

Description: Learn how to build your own .deb packages on Ubuntu from scratch, including the directory structure, control files, pre/post install scripts, and building with dpkg-deb.

---

Creating a `.deb` package is useful when you want to distribute software in a format that Ubuntu's package manager understands - enabling clean installs, consistent removal, dependency declaration, and deployment via APT repositories. Whether you're packaging an internal tool, a compiled binary, or a set of configuration files, the process follows a predictable structure.

## The .deb Package Structure

A Debian package is built from a staging directory that mirrors how the files will appear on the target filesystem, plus a `DEBIAN/` directory containing package metadata and scripts.

```text
my-package/
├── DEBIAN/
│   ├── control        (required - package metadata)
│   ├── postinst       (optional - runs after installation)
│   ├── preinst        (optional - runs before installation)
│   ├── prerm          (optional - runs before removal)
│   └── postrm         (optional - runs after removal)
└── usr/
    ├── bin/
    │   └── my-tool    (your binary or script)
    └── share/
        └── my-package/
            └── README (additional files)
```

## Step 1: Create the Package Directory Structure

For this example, we'll package a simple monitoring script:

```bash
# Create the top-level package directory
PKGNAME="mycompany-monitor"
VERSION="1.0.0"
ARCH="all"  # use 'amd64' for compiled binaries

mkdir -p ${PKGNAME}_${VERSION}/DEBIAN
mkdir -p ${PKGNAME}_${VERSION}/usr/local/bin
mkdir -p ${PKGNAME}_${VERSION}/usr/local/share/${PKGNAME}
mkdir -p ${PKGNAME}_${VERSION}/etc/${PKGNAME}
mkdir -p ${PKGNAME}_${VERSION}/lib/systemd/system
```

## Step 2: Add Your Files

Place your files in the directory structure as they should appear on the system:

```bash
# Create the main script
cat > ${PKGNAME}_${VERSION}/usr/local/bin/mycompany-monitor << 'SCRIPT'
#!/bin/bash
# MyCompany System Monitor
# Checks system health and reports to monitoring endpoint

CONFIG="/etc/mycompany-monitor/config.conf"

# Load configuration
if [ -f "$CONFIG" ]; then
    source "$CONFIG"
fi

ENDPOINT="${MONITOR_ENDPOINT:-http://monitoring.mycompany.internal}"
INTERVAL="${CHECK_INTERVAL:-60}"

while true; do
    # Check disk usage
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')

    # Check load average
    LOAD=$(cat /proc/loadavg | awk '{print $1}')

    # Report metrics
    curl -s -X POST "$ENDPOINT/metrics" \
        -H "Content-Type: application/json" \
        -d "{\"disk\": $DISK_USAGE, \"load\": $LOAD, \"host\": \"$(hostname)\"}" \
        >/dev/null 2>&1

    sleep "$INTERVAL"
done
SCRIPT

# Make the script executable
chmod 755 ${PKGNAME}_${VERSION}/usr/local/bin/mycompany-monitor

# Create default configuration file
cat > ${PKGNAME}_${VERSION}/etc/${PKGNAME}/config.conf << 'CONFIG'
# MyCompany Monitor Configuration
MONITOR_ENDPOINT=http://monitoring.mycompany.internal
CHECK_INTERVAL=60
CONFIG

# Create a systemd service file
cat > ${PKGNAME}_${VERSION}/lib/systemd/system/mycompany-monitor.service << 'SERVICE'
[Unit]
Description=MyCompany System Monitor
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mycompany-monitor
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE
```

## Step 3: Write the Control File

The `DEBIAN/control` file is required and contains all package metadata:

```bash
cat > ${PKGNAME}_${VERSION}/DEBIAN/control << EOF
Package: ${PKGNAME}
Version: ${VERSION}
Architecture: ${ARCH}
Maintainer: SysAdmin Team <sysadmin@mycompany.com>
Depends: curl, bash (>= 4.0)
Section: admin
Priority: optional
Homepage: https://internal.mycompany.com/tools
Description: MyCompany System Monitor
 Lightweight system monitoring daemon that reports disk usage
 and load averages to the central monitoring infrastructure.
 .
 Configuration is in /etc/mycompany-monitor/config.conf.
 The service is managed via systemd.
EOF
```

Key control file fields:
- `Package` - Package name (lowercase, only letters, numbers, hyphens, plus)
- `Version` - Package version (follows Debian version syntax)
- `Architecture` - `all` for scripts/data, `amd64`/`arm64` for compiled code
- `Depends` - Comma-separated list of required packages (with optional version constraints)
- `Description` - Short description on first line, long description with one space indent

## Step 4: Add Pre and Post Install Scripts

Scripts in DEBIAN/ must be executable and return 0 on success:

```bash
# Post-installation script
cat > ${PKGNAME}_${VERSION}/DEBIAN/postinst << 'POSTINST'
#!/bin/bash
set -e

# Enable and start the service after installation
if [ "$1" = "configure" ]; then
    systemctl daemon-reload
    systemctl enable mycompany-monitor.service

    echo "MyCompany Monitor installed."
    echo "Edit /etc/mycompany-monitor/config.conf to configure."
    echo "Start with: systemctl start mycompany-monitor"
fi
POSTINST

chmod 755 ${PKGNAME}_${VERSION}/DEBIAN/postinst

# Pre-removal script
cat > ${PKGNAME}_${VERSION}/DEBIAN/prerm << 'PRERM'
#!/bin/bash
set -e

# Stop the service before removing the package
if [ "$1" = "remove" ]; then
    systemctl stop mycompany-monitor.service 2>/dev/null || true
    systemctl disable mycompany-monitor.service 2>/dev/null || true
fi
PRERM

chmod 755 ${PKGNAME}_${VERSION}/DEBIAN/prerm

# Post-removal script
cat > ${PKGNAME}_${VERSION}/DEBIAN/postrm << 'POSTRM'
#!/bin/bash
set -e

# After all files are removed, reload systemd
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    systemctl daemon-reload 2>/dev/null || true
fi
POSTRM

chmod 755 ${PKGNAME}_${VERSION}/DEBIAN/postrm
```

The first argument to these scripts indicates the action: `install`, `configure`, `remove`, `purge`, etc.

## Step 5: Declare Configuration Files

Configuration files need special handling so `dpkg` doesn't overwrite user edits on upgrade:

```bash
# List all configuration files (one per line, full paths)
cat > ${PKGNAME}_${VERSION}/DEBIAN/conffiles << 'CONFFILES'
/etc/mycompany-monitor/config.conf
CONFFILES
```

Files listed in `conffiles` will prompt users if they've been modified when the package is upgraded.

## Step 6: Calculate MD5 Sums

```bash
# Generate md5sums for all files in the package
# This is optional but good practice
cd ${PKGNAME}_${VERSION}/
find . -type f ! -path './DEBIAN/*' | sort | \
    xargs md5sum | sed 's|\./||' > DEBIAN/md5sums
cd ..
```

## Step 7: Build the Package

```bash
# Build the .deb file
dpkg-deb --build ${PKGNAME}_${VERSION}/

# The output file is: mycompany-monitor_1.0.0.deb

# Better naming convention with architecture:
dpkg-deb --build ${PKGNAME}_${VERSION}/ \
    ${PKGNAME}_${VERSION}_${ARCH}.deb
```

## Step 8: Verify the Package

```bash
# Check the package contents
dpkg-deb --contents mycompany-monitor_1.0.0_all.deb

# Verify the control information
dpkg-deb --info mycompany-monitor_1.0.0_all.deb

# Run lintian to check for packaging errors
sudo apt install lintian
lintian mycompany-monitor_1.0.0_all.deb

# lintian shows warnings and errors about packaging standards
# Many warnings are acceptable for internal packages
```

## Step 9: Install and Test

```bash
# Install the package
sudo dpkg -i mycompany-monitor_1.0.0_all.deb

# If there are dependency issues
sudo apt install -f

# Verify installation
dpkg -l mycompany-monitor
dpkg -L mycompany-monitor  # List installed files

# Test the service
systemctl status mycompany-monitor
```

## Using dpkg-buildpackage for More Robust Builds

For packages you'll distribute or maintain long-term, use the full `dpkg-buildpackage` workflow:

```bash
# Install build tools
sudo apt install build-essential devscripts debhelper

# Your package needs a debian/ directory (lowercase, in source tree)
# and debian/rules, debian/control, debian/changelog

# Create minimal debian/rules
cat > debian/rules << 'RULES'
#!/usr/bin/make -f
%:
	dh $@
RULES
chmod +x debian/rules

# Create debian/changelog
dch --create --package mycompany-monitor \
    --newversion 1.0.0-1 \
    "Initial release"

# Build
dpkg-buildpackage -b -us -uc
```

## Versioning Conventions

For internal packages, follow a sensible versioning scheme:

```text
upstream_version-debian_revision
1.0.0-1          # First package of version 1.0.0
1.0.0-2          # Same upstream, packaging fix
1.1.0-1          # New upstream version
1.1.0-1~jammy    # Built specifically for Jammy
```

## Summary

Creating a `.deb` package requires:

1. A directory structure mirroring the target filesystem
2. A `DEBIAN/control` file with required package metadata
3. Optional `DEBIAN/postinst`, `prerm`, etc. scripts for service management
4. A `DEBIAN/conffiles` list for user-editable configuration files
5. Building with `dpkg-deb --build`

For internal tools distributed within a company, this level of packaging is perfectly appropriate. For packages intended for public distribution in Ubuntu's repositories or PPAs, use the full `dpkg-buildpackage` workflow with proper versioning, lintian compliance, and GPG signing.
