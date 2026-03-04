# How to Migrate from Oracle Linux to RHEL Using Convert2RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Oracle Linux, Migration, Convert2RHEL, Linux

Description: Convert Oracle Linux servers to RHEL in place using the Convert2RHEL tool, including handling the UEK kernel switch.

---

Convert2RHEL supports converting Oracle Linux 7, 8, and 9 to the corresponding RHEL version. The process replaces Oracle-specific packages with RHEL equivalents and registers the system with Red Hat Subscription Manager.

## Prerequisites

```bash
# Verify your Oracle Linux version
cat /etc/oracle-release
# Oracle Linux Server release 8.9

# Check which kernel is running
uname -r
# If you see "uek" in the name, you are running Oracle's UEK kernel
# Convert2RHEL will switch this to the RHEL kernel

# Update all packages to the latest Oracle Linux versions
sudo dnf update -y
sudo reboot
```

## Switching to the RHCK Kernel (Recommended)

If you are running the UEK kernel, switch to the Red Hat Compatible Kernel before converting:

```bash
# Install the RHCK kernel if not already installed
sudo dnf install kernel

# Set RHCK as the default boot kernel
sudo grubby --set-default /boot/vmlinuz-$(rpm -q kernel --qf '%{VERSION}-%{RELEASE}.%{ARCH}\n' | tail -1)

# Reboot into RHCK
sudo reboot

# Verify you are running RHCK
uname -r
# Should NOT contain "uek"
```

## Installing Convert2RHEL

```bash
# Add the Convert2RHEL repository for Oracle Linux 8
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://ftp.redhat.com/redhat/convert2rhel/8/convert2rhel.repo

# Install the tool
sudo dnf install convert2rhel -y
```

## Running the Conversion

```bash
# Convert using an activation key (recommended)
sudo convert2rhel --org your-org-id --activationkey your-key -y

# The tool will:
# 1. Verify system eligibility
# 2. Remove Oracle Linux-specific packages (oraclelinux-release, etc.)
# 3. Install RHEL packages (redhat-release, etc.)
# 4. Replace the UEK kernel with the RHEL kernel (if still present)
# 5. Register with subscription-manager
```

## Post-Conversion Steps

```bash
# Reboot into the RHEL kernel
sudo reboot

# Verify the conversion
cat /etc/redhat-release
# Red Hat Enterprise Linux release 8.9 (Ootpa)

# Check for remaining Oracle Linux packages
rpm -qa | grep -i oracle

# Remove leftover Oracle packages if any
sudo dnf remove oraclelinux-release-el8 2>/dev/null

# Remove the UEK kernel if it was not cleaned up
sudo dnf remove kernel-uek 2>/dev/null

# Verify RHEL repositories are active
sudo dnf repolist

# Check subscription
sudo subscription-manager status
```

## Handling Third-Party Packages

If you have Oracle-specific tools like Oracle Instant Client, they will continue to work on RHEL:

```bash
# Verify Oracle Instant Client still works
rpm -qa | grep oracle-instantclient
sqlplus -V
```

## Troubleshooting

```bash
# If conversion fails, check the log
cat /var/log/convert2rhel/convert2rhel.log

# Common issue: Third-party repos with unsigned packages
# Fix: Disable third-party repos during conversion
sudo convert2rhel --org your-org --activationkey your-key \
  --disablerepo="ol8_developer_EPEL" -y
```

After conversion, your Oracle Linux server is a fully supported RHEL system with access to Red Hat updates and support.
