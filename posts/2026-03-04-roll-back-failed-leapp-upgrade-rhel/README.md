# How to Roll Back a Failed Leapp Upgrade on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Leapp, Rollback, Recovery

Description: Roll back a failed Leapp upgrade on RHEL to restore your previous system.

---

## Overview

Roll back a failed Leapp upgrade on RHEL to restore your previous system. Careful planning and testing are essential for successful RHEL migrations.

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
4. Check disk space: `df -h` (ensure enough free space in `/var/lib/leapp`; the pre-upgrade assessment can require up to 4 GB)

## Step 2 - Install Migration Tools

For Leapp-based upgrades:

```bash
# RHEL 7 to RHEL 8
sudo yum install -y leapp-upgrade

# RHEL 8 to RHEL 9
sudo dnf install -y leapp-upgrade
```

For CentOS conversions:

```bash
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-8-x86_64.repo
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
```

Then reboot the system:

```bash
sudo reboot
```

The system will boot into a special initramfs to complete the upgrade. Alternatively, run `sudo leapp upgrade --reboot` to let Leapp reboot automatically.

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
sudo dnf config-manager --save --setopt exclude=''

# After RHEL 7 to RHEL 8
sudo yum remove leapp-deps-el8 leapp-repository-deps-el8

# After RHEL 8 to RHEL 9
sudo dnf remove leapp-deps-el9 leapp-repository-deps-el9
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Boot from the old kernel only for troubleshooting when it is still available; this is not a complete rollback

## Summary

You have learned how to roll back a failed leapp upgrade. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
