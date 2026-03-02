# How to Simulate an APT Install Without Making Changes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, System Administration, DevOps

Description: Learn how to simulate APT package installations, upgrades, and removals on Ubuntu without making actual changes, using dry-run flags to preview what will happen before committing.

---

One of the better safety features of Ubuntu's package management system is the ability to preview what would happen before committing to any package operation. Running a simulation shows you exactly which packages would be installed, removed, or upgraded, along with disk space impact - without touching a single file on the system.

## The --dry-run and --simulate Flags

APT provides two equivalent flags for simulation:

```bash
# These two are identical in behavior
sudo apt install --dry-run nginx
sudo apt install --simulate nginx

# Short form
sudo apt install -s nginx
```

The `-s` or `--simulate` flag works with all APT operations: install, remove, purge, upgrade, and more.

## Simulating a Package Install

```bash
# See what installing nginx would do
sudo apt install --dry-run nginx

# Output:
# NOTE: This is only a simulation!
#       apt-get needs root privileges for real execution.
#       Keep also in mind that locking is deactivated,
#       so don't depend on the output to be relevant to
#       a real apt-get run!
# Reading package lists... Done
# Building dependency tree... Done
# The following additional packages will be installed:
#   libgd3 libnginx-mod-http-image-filter nginx-common
# Suggested packages:
#   fcgiwrap nginx-doc
# The following NEW packages will be installed:
#   libgd3 libnginx-mod-http-image-filter nginx nginx-common
# 0 upgraded, 4 newly installed, 0 to remove and 0 not upgraded.
# Inst libgd3 (2.3.0-2ubuntu2 Ubuntu:22.04/jammy)
# Inst nginx-common (1.18.0-6ubuntu14.4 Ubuntu:22.04/jammy-updates)
# ...
# Conf libgd3 (2.3.0-2ubuntu2 Ubuntu:22.04/jammy)
# Conf nginx-common (1.18.0-6ubuntu14.4 Ubuntu:22.04/jammy-updates)
```

The output includes:
- Additional packages that would be pulled in as dependencies
- Whether packages are new or upgrades
- `Inst` lines showing what would be installed and from which repository
- `Conf` lines showing what would be configured

## Simulating an Upgrade

```bash
# Preview what apt upgrade would do
sudo apt upgrade --dry-run

# Preview full-upgrade (which can install/remove packages)
sudo apt full-upgrade --dry-run

# Show what would be upgraded with more detail
sudo apt-get --simulate upgrade
```

For systems that haven't been updated in a while, this gives you a clear picture of the scope of changes before running the actual upgrade.

## Simulating Package Removal

```bash
# See what removing a package would affect
sudo apt remove --dry-run nginx

# Simulate a purge (shows config file removal too)
sudo apt purge --dry-run nginx

# Check if removing something would remove other packages
sudo apt autoremove --dry-run
```

The remove simulation is particularly valuable - sometimes removing one package triggers the removal of many others that depend on it.

## Using apt-get for More Detailed Simulation Output

`apt-get` with `-s` provides slightly different (sometimes more detailed) output than `apt`:

```bash
# apt-get simulation with detailed Inst/Conf lines
sudo apt-get -s install nginx

# The output includes machine-readable 'Inst' and 'Conf' lines:
# Inst nginx-common (1.18.0 ...)
# Conf nginx-common (1.18.0 ...)
# Inst nginx (1.18.0 ...)
# Conf nginx (1.18.0 ...)
```

These `Inst` (Install) and `Conf` (Configure) lines are useful for scripting - you can parse them to get exactly what would change.

## Parsing Simulation Output in Scripts

```bash
#!/bin/bash
# check-upgrade-scope.sh - Check what an upgrade would change

echo "=== Packages that would be upgraded ==="
sudo apt upgrade --dry-run 2>/dev/null | \
    grep "^Inst" | \
    awk '{print $2, "->", $3}' | \
    sort

echo ""
echo "=== Package count ==="
sudo apt upgrade --dry-run 2>/dev/null | \
    grep "upgraded," | \
    tail -1
```

## Checking Disk Space Before Installing

The simulation output includes disk space information:

```bash
# The summary line shows space requirements
sudo apt install --dry-run nodejs 2>&1 | tail -5

# Output:
# After this operation, 58.4 MB of additional disk space will be used.
```

For large installations on systems with limited disk space, this check is valuable before committing:

```bash
#!/bin/bash
# check-disk-before-install.sh

PACKAGE="$1"
AVAILABLE_MB=$(df -m / | awk 'NR==2 {print $4}')

# Get space required from dry run
REQUIRED_MB=$(sudo apt install --dry-run "$PACKAGE" 2>/dev/null | \
    grep "additional disk space" | \
    awk '{print $1}' | \
    sed 's/[^0-9.]//g' | \
    awk '{printf "%.0f", $1}')

if [ -z "$REQUIRED_MB" ]; then
    echo "Could not determine space requirements for $PACKAGE"
    exit 1
fi

echo "Available: ${AVAILABLE_MB} MB"
echo "Required: ~${REQUIRED_MB} MB"

if [ "$AVAILABLE_MB" -lt "$((REQUIRED_MB + 200))" ]; then
    echo "WARNING: Low disk space for this installation"
else
    echo "Sufficient space available"
fi
```

## Simulating Without Root

One advantage of simulation mode is that it can run without sudo for informational purposes:

```bash
# No sudo needed for simulation (APT handles this case)
apt install --dry-run nginx

# Note the disclaimer in the output about locking not being active
# The results are still accurate for what would happen
```

## Using apt-cache for Pre-Installation Research

Before simulating, you can research packages:

```bash
# Show package info and size before deciding to install
apt-cache show nginx | grep -E "^Size:|^Installed-Size:|^Depends:|^Description-en:"

# Check if a package is already installed
dpkg -l nginx

# Find what version would be installed
apt-cache policy nginx
```

## Simulating Complex Operations

```bash
# Simulate installing multiple packages
sudo apt install --dry-run nginx php8.1-fpm mysql-server

# Simulate a dist-upgrade (full system upgrade)
sudo apt dist-upgrade --dry-run

# Simulate removing a package and see what's affected
sudo apt remove --dry-run python3
# May show dozens of dependent packages that would also be removed
```

## Testing APT Configurations

Dry runs are valuable when testing custom APT configurations:

```bash
# Test that a pinning configuration works as expected
cat > /tmp/test-pin.pref << 'EOF'
Package: nginx
Pin: version 1.18.*
Pin-Priority: 1001
EOF

# Copy to preferences.d
sudo cp /tmp/test-pin.pref /etc/apt/preferences.d/nginx-test.pref

# Simulate to verify the pin works
sudo apt install --dry-run nginx
# Should show it would install the 1.18.* version

# Remove the test pin
sudo rm /etc/apt/preferences.d/nginx-test.pref
```

## Automating Pre-Upgrade Checks

```bash
#!/bin/bash
# pre-upgrade-report.sh - Generate a report before upgrading

echo "=== System Upgrade Report - $(date) ==="
echo ""

echo "--- Packages to be upgraded ---"
sudo apt upgrade --dry-run 2>/dev/null | grep "^Inst" | awk '{print $2}' | sort

echo ""
echo "--- New packages to be installed ---"
sudo apt full-upgrade --dry-run 2>/dev/null | grep "^Inst" | \
    grep -v "(already)" | awk '{print $2}' | sort

echo ""
echo "--- Packages to be removed ---"
sudo apt full-upgrade --dry-run 2>/dev/null | grep "^Remv" | awk '{print $2}' | sort

echo ""
echo "--- Disk space summary ---"
sudo apt upgrade --dry-run 2>/dev/null | grep "disk space"
```

Run this before a maintenance window to brief your team on what the upgrade will change.

## Integration with Change Management

For environments with formal change management, simulation output serves as documentation:

```bash
# Generate upgrade simulation output for change request
sudo apt full-upgrade --dry-run 2>&1 > /tmp/upgrade-simulation-$(date +%Y%m%d).txt
cat /tmp/upgrade-simulation-$(date +%Y%m%d).txt
```

## Summary

APT simulation with `--dry-run` or `-s` is a straightforward but powerful safety feature. Use it:

- Before any significant package operation on production systems
- To document expected changes for change management processes
- To check disk space requirements before large installations
- To verify that APT pinning and repository configuration behaves as intended
- In scripts to detect the scope of changes programmatically

The simulation is fast (no downloads or disk writes) and accurate - there's no good reason not to run it before any non-trivial package operation.
