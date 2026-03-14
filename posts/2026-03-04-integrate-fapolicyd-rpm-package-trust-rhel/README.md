# How to Integrate fapolicyd with RPM Package Trust on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Fapolicyd, RPM, Security, Package Management

Description: Learn how fapolicyd integrates with the RPM database to automatically trust packages installed through official channels on RHEL.

---

fapolicyd on RHEL integrates natively with the RPM database, meaning any software installed through DNF or RPM is automatically trusted. This guide explains how this integration works and how to manage it effectively.

## How RPM Trust Works

fapolicyd uses the RPM database as its primary trust source. When you install a package through DNF, all binaries and libraries in that package are automatically added to the trust database.

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

# Count trusted entries from RPM
sudo fapolicyd-cli --dump-db | wc -l
```

## Updating Trust After Package Changes

When packages are installed, updated, or removed, the trust database needs to be refreshed.

```bash
# Install a new package
sudo dnf install httpd -y

# Update the fapolicyd trust database to include the new package
sudo fapolicyd-cli --update

# Verify httpd binary is now trusted
sudo fapolicyd-cli --dump-db | grep "/usr/sbin/httpd"
```

## Using the DNF Plugin for Automatic Updates

RHEL includes a DNF plugin that automatically updates fapolicyd trust when packages change.

```bash
# Install the fapolicyd DNF plugin
sudo dnf install fapolicyd-dnf-plugin -y

# Verify the plugin is enabled
cat /etc/dnf/plugins/fapolicyd.conf
# [main]
# enabled = 1

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

The RPM integration makes fapolicyd practical for enterprise RHEL deployments, since most software goes through the package manager. Only custom or third-party binaries require manual trust configuration.
