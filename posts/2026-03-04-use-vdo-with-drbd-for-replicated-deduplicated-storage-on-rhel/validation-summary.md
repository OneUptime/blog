# Validation Summary: How to Use VDO with DRBD for Replicated Deduplicated Storage on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO
- VDO deduplication and compression
- DRBD 9
- XFS
- ELRepo

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- LINBIT DRBD 9 User Guide: https://linbit.com/drbd-user-guide/drbd-guide-9_0-en/
- DRBD configuration man page: https://manpages.debian.org/testing/drbd-utils/drbd.conf.5.en.html
- ELRepo Wiki: https://www.elrepo.org/wiki/
- Linux man-pages lvcreate(8): https://man7.org/linux/man-pages/man8/lvcreate.8.html
- Linux man-pages lvmvdo(7): https://man7.org/linux/man-pages/man7/lvmvdo.7.html

## Issues Found
- The failover procedure said to promote node2 after node1 fails, but did not mention fencing or confirming that node1 is offline. In a manual active/passive DRBD setup, promoting a secondary while the previous primary could still be active risks split-brain. Updated the failover sentence to require fencing node1 or confirming it is offline before promoting node2.

## Review Notes
The package installation, LVM-VDO creation command, XFS formatting option, VDO statistics command, DRBD metadata creation, DRBD startup, and initial forced primary promotion match the referenced documentation. The DRBD example uses `/dev/sdb`; LINBIT recommends persistent device names such as `/dev/disk/by-id/...` for production systems to avoid device renaming issues, but `/dev/sdb` is syntactically valid for a simplified tutorial.
