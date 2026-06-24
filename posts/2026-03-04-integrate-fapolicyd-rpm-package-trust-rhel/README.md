# How to Integrate fapolicyd with RPM Package Trust on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Fapolicyd, RPM, Security, Package Management

Description: Learn how fapolicyd integrates with the RPM database to automatically trust packages installed through official channels on RHEL.

---

fapolicyd on RHEL integrates natively with the RPM database, meaning software installed through the system package manager and registered in RPM can be trusted by policy. This guide explains how this integration works and how to manage it effectively.

## How RPM Trust Works

fapolicyd uses the RPM database as a default trust source. When you install a package through DNF, RPM-installed binaries, scripts, and other files included by fapolicyd's trust filters are added to the trust database.

```bash
# Verify that RPM is configured as a trust backend

grep "trust" /etc/fapolicyd/fapolicyd.conf

# The default trust setting includes rpm
# trust = rpmdb,file
```

## Viewing RPM-Based Trust Entries

```bash
# Dump the entire trust database
sudo fapolicyd-cli --dump-db | head -30

# Check if a specific RPM-installed file is trusted
sudo fapolicyd-cli --dump-db | grep "/usr/bin/curl"

# Count trusted entries from the RPM backend
sudo fapolicyd-cli --dump-db | awk '$1 == "rpmdb" { count++ } END { print count + 0 }'
```

## Updating Trust After Package Changes

When packages are installed, updated, or removed outside the automatic plugin path, the trust database needs to be refreshed.

```bash
# Install a new package
sudo dnf install httpd -y

# Update the fapolicyd trust database to include the new package
sudo fapolicyd-cli --update

# Verify httpd binary is now trusted
sudo fapolicyd-cli --dump-db | grep "/usr/sbin/httpd"
```

## Using the RPM Plugin for Automatic Updates

RHEL includes an RPM plugin that notifies fapolicyd when DNF or RPM package transactions change the RPM database.

```bash
# Install the fapolicyd RPM plugin
sudo dnf install rpm-plugin-fapolicyd -y

# Verify the plugin package is installed
rpm -q rpm-plugin-fapolicyd

# Now package operations automatically update fapolicyd trust
sudo dnf install vim -y
# The trust database is updated automatically
```

## Handling Third-Party RPM Repositories

Packages from third-party repositories are also trusted if installed through DNF.

```bash
# Enable a third-party repo (example: EPEL)
sudo dnf install epel-release -y

# Install a package from the repo
sudo dnf install htop -y

# The binary is automatically trusted since it was installed via RPM
sudo fapolicyd-cli --dump-db | grep "/usr/bin/htop"
```

## Integrity Checking

fapolicyd can verify file integrity against the RPM database to detect tampering.

```bash
# Check file integrity mode in config
grep "integrity" /etc/fapolicyd/fapolicyd.conf

# Setting integrity = sha256 enables hash verification
# This ensures binaries match what RPM originally installed
```

The RPM integration makes fapolicyd practical for enterprise RHEL deployments, since most software goes through the package manager. Only custom or non-RPM third-party binaries require manual trust configuration.
