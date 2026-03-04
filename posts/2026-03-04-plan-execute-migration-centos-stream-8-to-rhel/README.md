# How to Plan and Execute a Migration from CentOS Stream 8 to RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CentOS Stream, Migration, Convert2RHEL, Linux

Description: Migrate from CentOS Stream 8 to RHEL 8 using Convert2RHEL, including preparation steps and post-conversion validation.

---

CentOS Stream 8 reaches end of life in May 2024. Convert2RHEL supports converting CentOS Stream 8 systems to RHEL 8 in place. Here is how to plan and execute the migration.

## Pre-Migration Assessment

```bash
# Verify your CentOS Stream version
cat /etc/centos-release
# CentOS Stream release 8

# Check installed packages and note any third-party additions
rpm -qa --queryformat '%{NAME} %{VENDOR}\n' | grep -v "CentOS" | sort

# Document custom configurations
find /etc -newer /etc/centos-release -type f 2>/dev/null | head -30

# Take a full backup or VM snapshot
```

## Update to Latest CentOS Stream 8 Packages

```bash
# Apply all available updates before converting
sudo dnf update -y

# Reboot if the kernel was updated
needs-restarting -r && echo "No reboot needed" || sudo reboot
```

## Install and Run Convert2RHEL

```bash
# Add the Convert2RHEL repository
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://ftp.redhat.com/redhat/convert2rhel/8/convert2rhel.repo

# Install Convert2RHEL
sudo dnf install convert2rhel -y

# Run a dry-run analysis first (available in newer versions)
sudo convert2rhel analyze --org your-org --activationkey your-key

# Review the analysis output for any issues
```

## Handle Pre-Conversion Issues

```bash
# Common issue: CentOS Stream packages may be newer than current RHEL 8 minor release
# Convert2RHEL handles this by mapping to the appropriate RHEL version

# If EPEL is installed, it may cause conflicts
# Disable it during conversion
sudo dnf config-manager --set-disabled epel epel-modular 2>/dev/null

# Remove any CentOS-specific packages that conflict
sudo dnf remove centos-stream-repos centos-stream-release 2>/dev/null
# Note: Convert2RHEL handles this automatically, but removing them
# beforehand can prevent some edge cases
```

## Execute the Conversion

```bash
# Run the conversion
sudo convert2rhel --org your-org-id --activationkey your-key -y

# Monitor the output for any errors
# The process typically takes 15-30 minutes
```

## Post-Conversion Verification

```bash
# Reboot into RHEL
sudo reboot

# Verify the system is now RHEL
cat /etc/redhat-release
# Red Hat Enterprise Linux release 8.x (Ootpa)

# Check subscription status
sudo subscription-manager status
sudo subscription-manager list --consumed

# Verify repositories
sudo dnf repolist

# Check for leftover CentOS packages
rpm -qa | grep -i centos

# Verify services are running
systemctl --failed

# Re-enable EPEL if needed (use the RHEL version)
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm
```

## Planning the Path Forward

After converting to RHEL 8, consider your next steps:

```bash
# Check RHEL 8 end of life dates
# Full Support: May 2024, Maintenance: May 2029, ELS: May 2032

# Plan an upgrade to RHEL 9 using Leapp
sudo dnf install leapp-upgrade
sudo leapp preupgrade
```

Converting to RHEL 8 gives you immediate access to Red Hat support and security updates while you plan the upgrade to RHEL 9.
