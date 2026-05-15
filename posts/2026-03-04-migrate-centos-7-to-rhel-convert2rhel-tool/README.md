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

# Point CentOS 7 repositories at the vault, since CentOS 7 is EOL
sudo sed -i 's/^mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sudo sed -i 's|#baseurl=http://mirror.centos.org|baseurl=https://vault.centos.org|g' /etc/yum.repos.d/CentOS-*

# Update all packages to the latest CentOS 7 versions
sudo yum update -y

# Reboot if kernel was updated
sudo reboot

# Take a full backup or VM snapshot before proceeding
# This is critical - the conversion modifies system packages
```

## Installing Convert2RHEL

```bash
# Download the Red Hat GPG key
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release \
  https://security.access.redhat.com/data/fd431d51.txt

# Enable the Convert2RHEL repository
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-7-x86_64.repo

# Install the tool
sudo yum install convert2rhel -y
```

## Preparing RHEL Credentials

You need a Red Hat subscription and an activation key. Store the organization ID and activation key in the Convert2RHEL configuration file:

```bash
sudo tee /etc/convert2rhel.ini >/dev/null <<'EOF'
[subscription_manager]
org = your-org-id
activation_key = your-activation-key
EOF
```

## Running the Conversion

```bash
# Run the pre-conversion analysis first
sudo convert2rhel analyze

# Run Convert2RHEL after resolving any reported issues
sudo convert2rhel -y

# If you have a RHEL 7 Extended Life Cycle Support add-on, use:
sudo convert2rhel --els -y

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
sudo convert2rhel --disablerepo="epel" -y

# After conversion, re-enable archived EPEL 7 content only if you still need it
sudo yum install https://archive.fedoraproject.org/pub/archive/epel/7/x86_64/Packages/e/epel-release-7-14.noarch.rpm
```

## Next Steps

After converting to RHEL 7, plan your upgrade path to RHEL 8 or 9 using the Leapp tool. RHEL 7 is in Extended Life Cycle Support, so use the ELS add-on if you need to stay on RHEL 7 while planning the major version upgrade.
