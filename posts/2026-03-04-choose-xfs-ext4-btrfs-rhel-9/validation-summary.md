# Validation Summary: How to Choose Between XFS, ext4, and Btrfs on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS
- ext4
- Btrfs
- LVM
- Stratis
- Linux filesystem administration commands

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux Technology Capabilities and Limits: https://access.redhat.com/articles/rhel-limits
- Red Hat Customer Portal, "Will Btrfs be supported on Red Hat Enterprise Linux?": https://access.redhat.com/solutions/197643
- Red Hat Enterprise Linux 8 Considerations in adopting RHEL 8, "Btrfs has been removed": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/file-systems-and-storage_considerations-in-adopting-rhel-8#btrfs-has-been-removed_file-systems-and-storage

## Issues Found
- The post incorrectly stated that RHEL gives users three filesystem options and that Btrfs is available as a technology preview. Red Hat removed Btrfs in RHEL 8, including the kernel module and userspace tools, so stock RHEL 9 cannot create, mount, or install on Btrfs filesystems. I updated the introduction, Btrfs section, decision framework, recommendations, and summary to reflect that Btrfs is removed and unsupported on RHEL 9.
- The quick comparison table used incorrect RHEL 9 supported size limits. I changed XFS maximum filesystem size from 1 EB to 1 PB and ext4 maximum filesystem size from 1 EB to 50 TB, matching Red Hat's current RHEL limits.
- The comparison table said ext4 has no checksums. In RHEL 9, ext4 metadata checksums are enabled by default, but ext4 still does not provide data checksums. I changed the entry to "Metadata only (no data checksums)."
- The Btrfs command examples were presented as if they worked on RHEL 9. I kept the examples for comparison context but added a note that they are common on distributions that support Btrfs and are not available on stock RHEL 9.

## Review Notes
- The XFS and ext4 creation and resize commands match the utilities documented by Red Hat for RHEL 9.
- Some performance statements are workload-dependent and benchmark-sensitive, but they are presented as general guidance rather than hard guarantees.
