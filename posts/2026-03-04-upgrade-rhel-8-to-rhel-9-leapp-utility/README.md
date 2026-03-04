# How to Upgrade from RHEL 8 to RHEL 9 Using the Leapp Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Leapp, Upgrade, Migration

Description: Perform an in-place upgrade from RHEL 8 to RHEL 9 using Leapp.

---

## Overview

Perform an in-place upgrade from RHEL 8 to RHEL 9 using Leapp. Careful planning and testing are essential for successful RHEL migrations.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- A full backup of the system before any migration or upgrade
- For Leapp upgrades: the leapp and leapp-upgrade packages

## Step 1 - Prepare the System

Before any migration:

1. Create a full backup (see backup guides in this series)
2. Document current system configuration
3. Verify subscription status: `subscription-manager status`
4. Check disk space: `df -h` (at least 5 GB free in `/`)

## Step 2 - Install Migration Tools

For Leapp-based upgrades:

```bash
sudo dnf install -y leapp leapp-upgrade
```

For CentOS conversions:

```bash
sudo dnf install -y convert2rhel
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
```

The system will reboot into a special initramfs to complete the upgrade.

## Step 5 - Post-Migration Verification

After the upgrade completes:

```bash
cat /etc/redhat-release
uname -r
dnf check
systemctl list-units --failed
```

## Step 6 - Clean Up

Remove old packages and kernels:

```bash
sudo dnf remove leapp leapp-upgrade
sudo dnf autoremove
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Boot from the old kernel if available

## Summary

You have learned how to upgrade from rhel 8 to rhel 9 using the leapp utility. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
