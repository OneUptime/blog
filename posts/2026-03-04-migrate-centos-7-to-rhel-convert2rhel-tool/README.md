# How to Migrate from CentOS 7 to RHEL Using the Convert2RHEL Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CentOS, Migration, Convert2RHEL, Linux

Description: Step-by-step guide to convert CentOS 7 systems to RHEL using Red Hat's official Convert2RHEL tool.

---

CentOS 7 reached end of life in June 2024. Convert2RHEL is Red Hat's official tool for converting CentOS systems to RHEL in place, without reinstalling. Here is how to perform the migration.

## Prerequisites

Before starting, ensure your system is ready:

```bash
# Verify your current CentOS version
cat /etc/centos-release
# CentOS Linux release 7.9.2009 (Core)

# Update all packages to the latest CentOS 7 versions
sudo yum update -y

# Reboot if kernel was updated
sudo reboot

# Take a full backup or VM snapshot before proceeding
# This is critical - the conversion modifies system packages
```

## Installing Convert2RHEL

```bash
# Enable the Convert2RHEL repository
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://ftp.redhat.com/redhat/convert2rhel/7/convert2rhel.repo

# Install the tool
sudo yum install convert2rhel -y
```

## Preparing RHEL Credentials

You need a Red Hat subscription. Use either username/password or an activation key:

```bash
# Option 1: Register with username/password (interactive)
sudo convert2rhel --username your-username --password your-password

# Option 2: Register with organization ID and activation key (preferred for automation)
sudo convert2rhel --org your-org-id --activationkey your-activation-key
```

## Running the Conversion

```bash
# Run Convert2RHEL with your chosen authentication
sudo convert2rhel --org 12345678 --activationkey my-convert-key -y

# The tool will:
# 1. Check system compatibility
# 2. Resolve package conflicts
# 3. Replace CentOS packages with RHEL equivalents
# 4. Register the system with Red Hat Subscription Manager
# 5. Install the RHEL kernel
```

The conversion takes 20-60 minutes depending on the number of installed packages.

## Post-Conversion Verification

After the mandatory reboot:

```bash
# Verify you are now running RHEL
cat /etc/redhat-release
# Red Hat Enterprise Linux Server release 7.9 (Maipo)

# Check subscription status
sudo subscription-manager status

# Verify the kernel is a RHEL kernel
uname -r

# Check for any remaining CentOS packages
rpm -qa | grep -i centos

# Verify all repositories point to RHEL
yum repolist
```

## Handling Common Issues

```bash
# If third-party packages block conversion, you may need to exclude them
sudo convert2rhel --org 12345678 --activationkey my-key \
  --disablerepo="epel" -y

# After conversion, re-enable EPEL for RHEL
sudo yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
```

## Next Steps

After converting to RHEL 7, plan your upgrade path to RHEL 8 or 9 using the Leapp tool, since RHEL 7 enters Maintenance Support. Convert2RHEL gets you onto a supported platform immediately, giving you time to plan the major version upgrade.
