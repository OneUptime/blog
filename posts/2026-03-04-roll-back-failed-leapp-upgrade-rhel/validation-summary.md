# Validation Summary: How to Roll Back a Failed Leapp Upgrade on RHEL

## Status
validated

## Post Type
Tutorial / recovery guide

## Technologies Covered
- Red Hat Enterprise Linux
- Leapp
- Convert2RHEL
- DNF and YUM package management
- LVM snapshots and backup-based rollback

## Sources Consulted
- Red Hat Documentation: Upgrading from RHEL 7 to RHEL 8 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/upgrading_from_rhel_7_to_rhel_8/
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/upgrading_from_rhel_8_to_rhel_9/
- Red Hat Documentation: Converting from a Linux distribution to RHEL using Convert2RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/

## Issues Found
- The Leapp installation command used `dnf install leapp leapp-upgrade` for all RHEL versions. Updated it to show `yum install leapp-upgrade` for RHEL 7 to RHEL 8 and `dnf install leapp-upgrade` for RHEL 8 to RHEL 9, matching Red Hat's documented package-manager usage.
- The Convert2RHEL command installed `convert2rhel` directly without first installing the Red Hat Convert2RHEL repository file. Added the documented repository-file installation step before installing the package.
- The upgrade step said the system would reboot automatically after `leapp upgrade`. Red Hat documents a manual `reboot` step unless `leapp upgrade --reboot` is used, so the post now shows the reboot explicitly.
- The cleanup command removed `leapp` and `leapp-upgrade` directly. Red Hat documents removing Leapp packages from the DNF exclude list and then removing target-version dependency packages, so the cleanup commands were corrected.
- The rollback plan listed booting the old kernel as a rollback option. This can help troubleshooting only when the old kernel is still available, but it is not a full rollback. The wording now makes that limitation explicit.
- The disk-space guidance said to keep at least 5 GB free in `/`. Red Hat specifically calls out `/var/lib/leapp` and notes the pre-upgrade assessment can require up to 4 GB, so that guidance was corrected.

## Review Notes
The post is intentionally high level. Future improvements could add explicit target-version examples such as `--target 8.10` or `--target 9.6`, and could explain that a reliable rollback depends on a tested full-system backup or snapshot taken before the in-place upgrade.
