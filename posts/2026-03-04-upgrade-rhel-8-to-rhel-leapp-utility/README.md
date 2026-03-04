# How to Upgrade from RHEL 8 to RHEL Using the Leapp Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Leapp, Upgrade, Migration, System Administration, Linux

Description: Perform an in-place upgrade from RHEL 8 to RHEL using the Leapp utility, including pre-upgrade assessment, remediation, and the upgrade process.

---

The Leapp utility performs in-place upgrades between major RHEL versions. It analyzes your system for compatibility issues, provides remediation steps, and handles the upgrade process.

## Prerequisites

Ensure your RHEL 8 system is fully updated and subscribed:

```bash
# Update the system to the latest RHEL 8 packages
sudo dnf update -y

# Verify the current version
cat /etc/redhat-release

# Ensure the system is registered with subscription-manager
sudo subscription-manager status
```

## Installing Leapp

```bash
# Install the Leapp packages
sudo dnf install -y leapp-upgrade

# Verify Leapp is installed
leapp --version
```

## Running the Pre-Upgrade Assessment

Run the assessment to identify issues before upgrading:

```bash
# Run the pre-upgrade report
sudo leapp preupgrade --target 9.4

# Review the report
cat /var/log/leapp/leapp-report.txt
```

The report categorizes issues by severity:
- **Inhibitor:** Must be fixed before the upgrade can proceed
- **High:** Strongly recommended to fix
- **Medium/Low:** Informational

## Common Remediation Steps

```bash
# Remove packages that block the upgrade
sudo dnf remove -y make-devel

# If the report mentions the "Permit root login" inhibitor
sudo leapp answer --section remove_pam_pkcs11_module_check.confirm=True

# Handle custom kernel modules
# Remove any third-party kernel modules that are not compatible with RHEL
sudo rmmod <module_name>

# Ensure enough disk space (at least 5 GB free in /var/lib/leapp)
df -h /var/lib/leapp
```

## Performing the Upgrade

After resolving all inhibitors:

```bash
# Start the upgrade process
sudo leapp upgrade --target 9.4

# The system will download packages, prepare the upgrade,
# and then reboot into a special upgrade initramfs
```

The system reboots multiple times during the upgrade. Do not interrupt this process.

## Post-Upgrade Verification

After the upgrade completes:

```bash
# Verify the new RHEL version
cat /etc/redhat-release

# Check for remaining Leapp packages to clean up
sudo dnf list installed | grep leapp

# Remove leftover RHEL 8 packages
sudo dnf remove -y leapp-upgrade-el8toel9 leapp-deps-el8

# Verify all services are running
systemctl list-units --state=failed
```
