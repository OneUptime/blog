# How to Perform an In-Place Upgrade from RHEL 7 to RHEL 8 Using Leapp

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Leapp, Upgrade, Migration, Linux

Description: Use the Leapp framework to perform an in-place upgrade from RHEL 7 to RHEL 8, including pre-upgrade assessment and remediation.

---

Leapp is Red Hat's official tool for in-place major version upgrades. It upgrades RHEL 7 to RHEL 8 without reinstalling, preserving your configurations and data. Here is how to do it safely.

## Prerequisites

```bash
# Ensure RHEL 7 is fully updated
sudo yum update -y

# Verify your subscription provides access to RHEL 8 content
sudo subscription-manager repos --list | grep rhel-8

# Enable the required repositories
sudo subscription-manager repos --enable rhel-7-server-extras-rpms

# Install Leapp and its RHEL 7 to 8 upgrade data
sudo yum install leapp-upgrade
```

## Running the Pre-Upgrade Assessment

Always run the assessment first. It identifies blockers without making any changes:

```bash
# Run the pre-upgrade check
sudo leapp preupgrade

# Review the report
cat /var/log/leapp/leapp-report.txt
```

The report classifies findings as:

- **Inhibitor**: Must be fixed before upgrading. The upgrade will refuse to proceed.
- **High risk**: Should be addressed but will not block the upgrade.
- **Info**: Informational only.

## Common Inhibitors and Fixes

```bash
# Inhibitor: PAM configuration uses removed modules
# Fix: Remove deprecated pam_tally2 entries
sudo sed -i '/pam_tally2/d' /etc/pam.d/system-auth
sudo sed -i '/pam_tally2/d' /etc/pam.d/password-auth

# Inhibitor: Detected loaded kernel modules that are removed in RHEL 8
# Fix: Unload the module and blacklist it
sudo rmmod pata_acpi
echo "blacklist pata_acpi" | sudo tee /etc/modprobe.d/leapp-blacklist.conf

# Inhibitor: GRUB2 configuration issue
# Fix: Reinstall GRUB
sudo grub2-install /dev/sda
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Answering Leapp Questions

Some findings require explicit answers:

```bash
# If Leapp asks about VDO devices
sudo leapp answer --section remove_pam_pkcs11_module_check.confirm=True

# Check for unanswered questions
sudo leapp answer --list
```

## Running the Upgrade

After all inhibitors are resolved:

```bash
# Create a backup or snapshot before proceeding
# Then start the upgrade
sudo leapp upgrade

# The system will:
# 1. Download RHEL 8 packages
# 2. Create an upgrade initramfs
# 3. Reboot into the upgrade environment
# 4. Perform the upgrade (this takes 30-90 minutes)
# 5. Reboot into RHEL 8
```

## Post-Upgrade Verification

```bash
# Verify the upgrade succeeded
cat /etc/redhat-release
# Red Hat Enterprise Linux release 8.x (Ootpa)

# Check for remaining RHEL 7 packages
rpm -qa | grep el7

# Remove leftover RHEL 7 packages
sudo dnf remove $(rpm -qa | grep el7 | grep -v gpg-pubkey)

# Verify subscription
sudo subscription-manager status

# Check for any post-upgrade issues
journalctl -b | grep -i error | head -20
systemctl --failed
```

Always test the upgrade on a non-production clone first to identify issues specific to your environment.
