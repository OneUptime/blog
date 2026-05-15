# How to Migrate RHEL Virtual Machines Between On-Premises and Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Migration, Virtual Machine, Cloud

Description: Migrate RHEL VMs between on-premises and cloud platforms.

---

## Overview

Prepare RHEL VMs for OS-level upgrades or conversions before moving them between on-premises and cloud platforms. Use provider-specific image export, import, or image builder tooling for the actual VM move. Careful planning and testing are essential for successful RHEL migrations.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- A full backup of the system before any migration or upgrade
- For Leapp upgrades: a supported RHEL upgrade path and the leapp-upgrade package
- For Convert2RHEL conversions: a supported source distribution and the Convert2RHEL repository

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

For Convert2RHEL conversions, install the Red Hat GPG key and the Convert2RHEL repository for your target RHEL major version before installing the utility. For example, for conversions to RHEL 9:

```bash
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release https://security.access.redhat.com/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo
sudo yum -y install convert2rhel
```

## Step 3 - Run Pre-Migration Assessment

```bash
sudo leapp preupgrade --target <target_os_version>
```

Review the report:

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

The system will boot into a special initramfs to complete the upgrade. You can also run `leapp upgrade --target <target_os_version> --reboot` to have Leapp reboot automatically.

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
sudo dnf remove leapp-deps-el9 leapp-repository-deps-el9
sudo dnf autoremove
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Boot from the old kernel if available

## Summary

You have learned how to prepare RHEL virtual machines for OS-level upgrades or conversions before moving them between on-premises and cloud. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
