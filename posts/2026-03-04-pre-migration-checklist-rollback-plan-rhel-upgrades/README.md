# How to Create a Pre-Migration Checklist and Rollback Plan for RHEL Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Migration, Checklist, Rollback

Description: Create a pre-migration checklist and rollback plan for RHEL upgrades.

---

## Overview

Create a pre-migration checklist and rollback plan for RHEL upgrades. Careful planning and testing are essential for successful RHEL migrations.

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
4. Check disk space: `df -h` (ensure there is enough free space for the upgrade, including up to 4 GB for the pre-upgrade assessment in `/var/lib/leapp`)

## Step 2 - Install Migration Tools

For Leapp-based upgrades:

```bash
sudo dnf install -y leapp leapp-upgrade
```

For supported CentOS 8 conversions, install the current Convert2RHEL repository file first, then install the utility:

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

Clean up remaining Leapp packages after reviewing the transaction:

```bash
sudo dnf config-manager --save --setopt exclude=''
sudo dnf remove 'leapp-deps-*' 'leapp-repository-deps-*'
sudo dnf autoremove
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state, but do not treat them as a full backup
- Boot from a rescue or previous kernel for troubleshooting if available; this is not a complete rollback

## Summary

You have learned how to create a pre-migration checklist and rollback plan for rhel upgrades. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
