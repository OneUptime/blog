# How to Upgrade from RHEL 8 to RHEL Using the Leapp Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Leapp, Upgrade, Migration, System Administration, Linux

Description: Perform an in-place upgrade from RHEL 8 to RHEL using the Leapp utility, including pre-upgrade assessment, remediation, and the upgrade process.

---

The Leapp utility performs in-place upgrades between major RHEL versions. It analyzes your system for compatibility issues, provides remediation steps, and handles the upgrade process.

## Prerequisites

Ensure your RHEL 8.10 system is fully updated and subscribed:

```bash
# Ensure you have a full system backup or virtual machine snapshot

# Update the system to the latest RHEL 8 packages

sudo dnf update -y

# Reboot if the update installed a new kernel or system libraries
sudo reboot

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
sudo -r unconfined_r -t unconfined_t leapp preupgrade --target 9.6

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
sudo dnf remove -y PACKAGE_NAME

# If the report requires an answer file confirmation
sudo -r unconfined_r -t unconfined_t leapp answer --section check_vdo.confirm=True

# Handle custom kernel modules
# Remove any third-party kernel modules that are not compatible with RHEL
sudo rmmod MODULE_NAME

# Ensure enough disk space in /var/lib/leapp
df -h /var/lib/leapp
```

## Performing the Upgrade

After resolving all inhibitors:

```bash
# Start the upgrade process
sudo -r unconfined_r -t unconfined_t leapp upgrade --target 9.6

# The system will download packages, prepare the upgrade,
# and then require a reboot into a special upgrade initramfs
sudo reboot
```

The system reboots multiple times during the upgrade. Do not interrupt this process.

## Post-Upgrade Verification

After the upgrade completes:

```bash
# Verify the new RHEL version
cat /etc/redhat-release

# Verify that Leapp has finished all upgrade actions
[ -e "/etc/systemd/system/leapp_resume.service" ] || ps -e | grep -q leapp && echo "Leapp has not finished the execution yet!"

# List leftover RHEL 8 packages
rpm -qa | grep -e '\.el[78]' | grep -vE '^(gpg-pubkey|libmodulemd|katello-ca-consumer)' | sort

# Remove leftover RHEL 8 packages after reviewing the transaction
sudo dnf remove $(rpm -qa | grep \.el[78] | grep -vE 'gpg-pubkey|libmodulemd|katello-ca-consumer')

# Remove remaining Leapp dependency packages
sudo dnf remove -y leapp-deps-el9 leapp-repository-deps-el9

# Verify all services are running
systemctl list-units --state=failed
```
