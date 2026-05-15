# How to Plan and Execute a RHEL Major Version Migration Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Migration Strategy, Planning, Linux

Description: Plan and execute a RHEL major version migration strategy for your fleet.

---

## Overview

Plan and execute a RHEL major version migration strategy for your fleet. Careful planning and testing are essential for successful RHEL migrations.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- A full backup of the system before any migration or upgrade
- For Leapp upgrades: the Leapp upgrade packages for your source and target RHEL versions

## Step 1 - Prepare the System

Before any migration:

1. Create a full backup (see backup guides in this series)
2. Document current system configuration
3. Verify subscription status: `subscription-manager status`
4. Check disk space: `df -h` (ensure enough free space for `/var/lib/leapp`; the pre-upgrade assessment commonly needs up to 4 GB)

## Step 2 - Install Migration Tools

For Leapp-based upgrades:

```bash
sudo yum install -y leapp-upgrade   # RHEL 7 to RHEL 8
sudo dnf install -y leapp-upgrade   # RHEL 8 to later releases
```

For CentOS conversions, install the latest Convert2RHEL repository file for your target RHEL major version, then install the utility:

```bash
sudo yum -y install convert2rhel
```

## Step 3 - Run Pre-Migration Assessment

```bash
sudo leapp preupgrade
```

Review the report:

```bash
cat /var/log/leapp/leapp-report.txt
```

Address all inhibitors before proceeding.

## Step 4 - Perform the Migration

Once all inhibitors are resolved:

```bash
sudo leapp upgrade
sudo reboot
```

Alternatively, run `sudo leapp upgrade --reboot` to reboot automatically. The system will boot into a special initramfs to complete the upgrade.

## Step 5 - Post-Migration Verification

After the upgrade completes:

```bash
[ -e "/etc/systemd/system/leapp_resume.service" ] || ps -e | grep -q leapp && echo "Leapp has not finished the execution yet!"
cat /etc/redhat-release
uname -r
dnf check
systemctl list-units --failed
```

## Step 6 - Clean Up

Remove old packages and kernels:

```bash
sudo dnf config-manager --save --setopt exclude=''
sudo dnf remove leapp-deps-el* leapp-repository-deps-el*
sudo dnf autoremove
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Boot from the old kernel if available

## Summary

You have learned how to plan and execute a rhel major version migration strategy. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
