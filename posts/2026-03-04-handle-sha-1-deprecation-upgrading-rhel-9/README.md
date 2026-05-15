# How to Handle SHA-1 Deprecation When Upgrading to RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SHA-1, Deprecation, Security, Upgrade

Description: Handle SHA-1 deprecation when upgrading to RHEL 9.

---

## Overview

Handle SHA-1 deprecation when upgrading to RHEL 9. In RHEL 9, SHA-1 signatures are restricted by the default system-wide cryptographic policy, and packages signed with RSA/SHA-1 can block an in-place upgrade. Careful planning and testing are essential for successful RHEL migrations.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- A full backup of the system before any migration or upgrade
- For Leapp upgrades from RHEL 8: the leapp-upgrade package

## Step 1 - Prepare the System

Before any migration:

1. Create a full backup (see backup guides in this series)
2. Document current system configuration
3. Verify subscription status: `subscription-manager status`
4. Check disk space: `df -h`, including the filesystem that contains `/var/lib/leapp`
5. Review third-party packages and replace any packages signed with RSA/SHA-1 signatures before upgrading

## Step 2 - Install Migration Tools

For Leapp-based upgrades:

```bash
sudo dnf install -y leapp-upgrade
```

For CentOS conversions:

```bash
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo
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

Address all inhibitors before proceeding, including any SHA-1 package signature inhibitors.

## Step 4 - Perform the Migration

Once all inhibitors are resolved:

```bash
sudo leapp upgrade
sudo reboot
```

The system will reboot into a RHEL 9-based initramfs to complete the upgrade. Alternatively, run `sudo leapp upgrade --reboot` to reboot automatically after the upgrade preparation finishes.

## Step 5 - Post-Migration Verification

After the upgrade completes:

```bash
cat /etc/redhat-release
uname -r
dnf check
systemctl list-units --failed
update-crypto-policies --show
```

If you must temporarily verify existing or third-party SHA-1 signatures, apply the SHA1 subpolicy and reboot:

```bash
sudo update-crypto-policies --set DEFAULT:SHA1
sudo reboot
```

Use this only for compatibility cases because it weakens the system cryptographic policy.

## Step 6 - Clean Up

Remove old packages and kernels:

```bash
sudo dnf config-manager --save --setopt exclude=''
sudo dnf remove leapp-deps-el9 leapp-repository-deps-el9
```

## Rollback Plan

If the migration fails, you can:
- Restore from your pre-migration backup
- Use LVM snapshots to revert to the previous state
- Investigate `/var/log/leapp/leapp-report.txt` and `/var/log/leapp/leapp-upgrade.log` before retrying

## Summary

You have learned how to handle SHA-1 deprecation when upgrading to RHEL 9. Always test upgrades in a staging environment first and maintain a reliable rollback plan.
