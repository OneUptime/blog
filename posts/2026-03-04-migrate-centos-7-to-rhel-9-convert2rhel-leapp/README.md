# How to Migrate from CentOS 7 to RHEL 9 Using Convert2RHEL and Leapp

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CentOS, Convert2RHEL, Leapp, Migration

Description: Migrate from CentOS 7 to RHEL 9 using Convert2RHEL and Leapp.

---

## Overview

Migrate from CentOS 7.9 to RHEL 9 using Convert2RHEL and Leapp. Convert2RHEL converts CentOS Linux 7.9 to the corresponding RHEL 7.9 release, and Leapp then upgrades one major RHEL release at a time: RHEL 7.9 to RHEL 8.10, then RHEL 8 to RHEL 9. Careful planning and testing are essential for successful RHEL migrations.

## Prerequisites

- A CentOS Linux 7.9 system
- A Red Hat account, activation key, and active RHEL subscription
- Root or sudo access
- A full backup of the system before any migration or upgrade
- For Leapp upgrades: the leapp-upgrade package

## Step 1 - Prepare the System

Before any migration:

1. Create a full backup (see backup guides in this series)
2. Document current system configuration
3. Update CentOS 7 repository URLs to use the CentOS vault
4. Check disk space: `df -h` (Leapp pre-upgrade assessment can require up to 4 GB in `/var/lib/leapp`)

## Step 2 - Install Migration Tools

For the CentOS 7 to RHEL 7 conversion:

```bash
sudo sed -i 's/^mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sudo sed -i 's|#baseurl=http://mirror.centos.org|baseurl=https://vault.centos.org|g' /etc/yum.repos.d/CentOS-*
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release https://security.access.redhat.com/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-7-x86_64.repo
sudo yum install -y convert2rhel
```

After conversion to RHEL 7, install Leapp for the RHEL 7 to RHEL 8 upgrade:

```bash
sudo yum install -y leapp-upgrade
sudo yum update -y
sudo reboot
```

After upgrading to RHEL 8, install Leapp for the RHEL 8 to RHEL 9 upgrade:

```bash
sudo rm -rf /usr/share/leapp-repository/repositories
sudo dnf install -y leapp-upgrade
sudo dnf update -y
sudo reboot
```

## Step 3 - Run Pre-Migration Assessment

Before converting CentOS 7 to RHEL 7:

```bash
sudo convert2rhel analyze
```

After conversion, run the RHEL 7 to RHEL 8 pre-upgrade assessment:

```bash
sudo leapp preupgrade --target 8.10
```

After upgrading to RHEL 8, run the RHEL 8 to RHEL 9 pre-upgrade assessment:

```bash
sudo leapp preupgrade --target 9.7
```

Review the report:

```bash
cat /var/log/leapp/leapp-report.txt
```

Address all inhibitors before proceeding.

## Step 4 - Perform the Migration

Once all inhibitors are resolved:

```bash
sudo convert2rhel
sudo reboot
sudo leapp upgrade --target 8.10
sudo reboot
sudo rm -rf /usr/share/leapp-repository/repositories
sudo dnf install -y leapp-upgrade
sudo leapp upgrade --target 9.7
sudo reboot
```

For each Leapp upgrade, the system will reboot into a special initramfs to complete the upgrade.

## Step 5 - Post-Migration Verification

After the upgrade completes:

```bash
[ -e "/etc/systemd/system/leapp_resume.service" ] || ps -e | grep -q leapp && echo "Leapp has not finished the execution yet!"
cat /etc/redhat-release
uname -r
subscription-manager status
dnf check
systemctl list-units --failed
```

## Step 6 - Clean Up

Remove old packages and kernels:

```bash
sudo dnf config-manager --save --setopt exclude=''
sudo dnf remove 'leapp*'
sudo dnf autoremove
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Investigate `/var/log/leapp/leapp-report.txt` and `/var/log/leapp/leapp-upgrade.log`

## Summary

You have learned how to migrate from CentOS 7.9 to RHEL 9 using Convert2RHEL and Leapp. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
