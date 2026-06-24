# How to Perform a Rolling Upgrade of RHEL Across a Fleet Using Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rolling Upgrade, Ansible, Automation

Description: Perform a rolling upgrade of RHEL across your fleet using Ansible.

---

## Overview

Perform a rolling upgrade of RHEL across your fleet using Leapp. Careful planning and testing are essential for successful RHEL migrations.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- A full backup of the system before any migration or upgrade
- For Leapp upgrades: the leapp-upgrade package

## Step 1 - Prepare the System

Before any migration:

1. Create a full backup (see backup guides in this series)
2. Document current system configuration
3. Verify subscription status: `subscription-manager status`
4. Check disk space: `df -h` (at least 5 GB free in `/`)

## Step 2 - Install Migration Tools

For Leapp-based upgrades:

```bash
sudo dnf install -y leapp-upgrade
```

For CentOS conversions, install the current Convert2RHEL repository file for your target RHEL major version, then install the utility:

```bash
sudo yum -y install convert2rhel
```

## Step 3 - Run Pre-Migration Assessment

```bash
sudo leapp preupgrade
```

For Convert2RHEL conversions:

```bash
sudo convert2rhel analyze
```

For Leapp upgrades, review the report:

```bash
cat /var/log/leapp/leapp-report.txt
```

Address all inhibitors before proceeding.

## Step 4 - Perform the Migration

Once all inhibitors are resolved:

```bash
sudo leapp upgrade --target <target_os_version>
sudo reboot
```

For Leapp upgrades, the system will reboot into a special initramfs to complete the upgrade. You can also use `leapp upgrade --reboot` to let Leapp reboot automatically.

For Convert2RHEL conversions:

```bash
sudo convert2rhel
```

## Step 5 - Post-Migration Verification

After the upgrade completes:

```bash
cat /etc/redhat-release
uname -r
dnf check
systemctl list-units --failed
```

## Step 6 - Clean Up

Follow Red Hat's post-upgrade tasks to remove old kernel packages, then remove remaining Leapp dependency packages. For RHEL 8 to 9:

```bash
sudo dnf remove leapp-deps-el9 leapp-repository-deps-el9
sudo dnf autoremove
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Boot from the old kernel if available

## Summary

You have learned how to perform a rolling upgrade of RHEL across a fleet using Leapp. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
