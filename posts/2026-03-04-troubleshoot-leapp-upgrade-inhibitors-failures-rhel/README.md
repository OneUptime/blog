# How to Troubleshoot Leapp Upgrade Inhibitors and Failures on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Leapp, Troubleshooting, Upgrade

Description: Troubleshoot Leapp upgrade inhibitors and failures on RHEL.

---

## Overview

Troubleshoot Leapp upgrade inhibitors and failures on RHEL. Careful planning and testing are essential for successful RHEL migrations.

## Prerequisites

- A RHEL system with an active subscription
- Root access, or sudo with the unconfined SELinux role for each Leapp command
- A full backup of the system before any migration or upgrade
- For Leapp upgrades: the leapp-upgrade package

## Step 1 - Prepare the System

Before any migration:

1. Create a full backup (see backup guides in this series)
2. Document current system configuration
3. Verify subscription status: `subscription-manager status`
4. Check disk space: `df -h` (ensure enough space for the upgrade, including up to 4 GB in `/var/lib/leapp` during the pre-upgrade assessment)

## Step 2 - Install Migration Tools

For Leapp-based upgrades:

```bash
sudo dnf install -y leapp-upgrade
```

For CentOS conversions:

```bash
sudo yum -y install convert2rhel
```

Install the appropriate Convert2RHEL repository file before installing `convert2rhel`.

## Step 3 - Run Pre-Migration Assessment

```bash
sudo -r unconfined_r -t unconfined_t leapp preupgrade
```

Review the report:

```bash
cat /var/log/leapp/leapp-report.txt
```

Address all inhibitors before proceeding.

## Step 4 - Perform the Migration

Once all inhibitors are resolved:

```bash
sudo -r unconfined_r -t unconfined_t leapp upgrade
sudo reboot
```

The system boots into a RHEL-based initramfs to complete the upgrade. Alternatively, run `sudo -r unconfined_r -t unconfined_t leapp upgrade --reboot` to reboot automatically.

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
sudo dnf remove leapp-deps-el9 leapp-repository-deps-el9
sudo dnf autoremove
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Boot from the old kernel if available

## Summary

You have learned how to troubleshoot leapp upgrade inhibitors and failures. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
