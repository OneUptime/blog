# How to Migrate from Rocky Linux to RHEL Using Convert2RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rocky Linux, Migration, Convert2RHEL, Linux

Description: Convert Rocky Linux servers to RHEL in place using Convert2RHEL for full Red Hat support and certification.

---

Rocky Linux is binary-compatible with RHEL, which makes the conversion straightforward. Convert2RHEL replaces Rocky Linux packages with RHEL equivalents and registers your system with Red Hat Subscription Manager.

## Prerequisites

```bash
# Verify your Rocky Linux version
cat /etc/rocky-release
# Rocky Linux release 9.3 (Blue Onyx)

# Ensure the system is fully updated
sudo dnf update -y
sudo reboot

# Take a snapshot or full backup before proceeding
```

## Install Convert2RHEL

```bash
# Add the Convert2RHEL repository for your major version
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://ftp.redhat.com/redhat/convert2rhel/9/convert2rhel.repo

# Install the tool
sudo dnf install convert2rhel -y
```

## Run the Analysis (Recommended)

```bash
# Run an analysis without making changes
sudo convert2rhel analyze --org your-org-id --activationkey your-key

# Review the output for any warnings or blockers
# Common findings:
# - Third-party packages that need manual review
# - Non-standard kernel modules
```

## Execute the Conversion

```bash
# Run the full conversion
sudo convert2rhel --org your-org-id --activationkey your-key -y

# The tool performs these steps:
# 1. Validates system compatibility
# 2. Removes Rocky Linux branding packages (rocky-release, rocky-logos, etc.)
# 3. Installs RHEL packages (redhat-release, redhat-logos, etc.)
# 4. Replaces Rocky Linux repositories with RHEL repositories
# 5. Registers with subscription-manager
# 6. Installs the RHEL kernel

# The process typically takes 10-20 minutes
```

## Post-Conversion Verification

```bash
# Reboot to load the RHEL kernel
sudo reboot

# Verify you are running RHEL
cat /etc/redhat-release
# Red Hat Enterprise Linux release 9.3 (Plow)

uname -r
# Should show an el9 kernel without "rocky"

# Verify subscription
sudo subscription-manager status

# Check all repositories are RHEL
sudo dnf repolist

# Look for any remaining Rocky Linux packages
rpm -qa | grep -i rocky
# If any remain, remove them
sudo dnf remove rocky-release rocky-logos 2>/dev/null
```

## Verify Application Functionality

Since Rocky Linux and RHEL are binary-compatible, applications should work without changes:

```bash
# Check that services are running
systemctl --failed

# Verify web server, database, or other critical services
systemctl status httpd nginx postgresql 2>/dev/null

# Run your application test suite if you have one
```

## Re-enable Third-Party Repositories

```bash
# EPEL: Install the RHEL version
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Other third-party repos should work unchanged since Rocky and RHEL
# use the same package format and version scheme
```

The conversion from Rocky Linux to RHEL is one of the smoothest Convert2RHEL paths because of the high degree of binary compatibility between the two distributions.
