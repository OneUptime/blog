# How to Perform an In-Place Upgrade from RHEL 7 to RHEL 8 Using Leapp

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance, Migration

Description: Step-by-step guide on perform an in-place upgrade from rhel 7 to rhel 8 using leapp with practical examples and commands.

---

Leapp enables in-place upgrades from RHEL 7 to RHEL 8, the first step toward reaching RHEL 9.

## Prerequisites

- RHEL 7.9 with latest updates
- Active Red Hat subscription
- At least 100 MB free in /boot
- Full system backup

## Install Leapp

```bash
sudo yum install -y leapp-upgrade
```

## Run Pre-Upgrade Assessment

```bash
sudo leapp preupgrade
```

Review the report:

```bash
cat /var/log/leapp/leapp-report.txt
```

## Address Inhibitors

Common inhibitors and fixes:

```bash
# Remove incompatible packages
sudo yum remove -y pam_pkcs11 python2-setuptools

# Fix kernel driver issues
sudo leapp answer --section remove_pam_pkcs11_module_check.confirm=True
```

## Perform the Upgrade

```bash
sudo leapp upgrade
sudo reboot
```

## Post-Upgrade Verification

```bash
cat /etc/redhat-release
# Should show Red Hat Enterprise Linux release 8.x

sudo subscription-manager status
sudo dnf update -y
```

## Continue to RHEL 9

After stabilizing on RHEL 8:

```bash
sudo dnf install -y leapp-upgrade
sudo leapp preupgrade --target 9.4
# Address any issues
sudo leapp upgrade --target 9.4
sudo reboot
```

## Conclusion

Leapp provides a supported in-place upgrade path from RHEL 7 to 8 and then to 9. Always run the pre-upgrade assessment, address all inhibitors, and maintain backups before upgrading.

