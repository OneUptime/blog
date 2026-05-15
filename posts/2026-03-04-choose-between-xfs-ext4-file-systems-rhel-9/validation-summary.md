# Validation Summary: How to Choose Between XFS and ext4 File Systems on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS
- ext4
- Linux filesystem resizing, quotas, journaling, repair, defragmentation, backup, and reflink copies
- GNU coreutils `cp`
- e2fsprogs utilities such as `resize2fs`, `e2fsck`, and `tune2fs`
- XFS utilities such as `mkfs.xfs`, `xfs_repair`, `xfs_growfs`, `xfsdump`, and `xfsrestore`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux Technology Capabilities and Limits: https://access.redhat.com/articles/rhel-limits
- Red Hat Enterprise Linux 9 documentation, "Getting started with XFS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/getting-started-with-xfs_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Limiting storage space usage on ext4 with quotas": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/limiting-storage-space-usage-on-ext4-with-quotas_managing-file-systems
- Linux kernel ext4 documentation: https://docs.kernel.org/admin-guide/ext4.html
- Local GNU coreutils `cp --help` output for `--reflink=always`
- Local e2fsprogs `resize2fs` usage output

## Issues Found
- The comparison table listed both XFS and ext4 maximum filesystem sizes as 1 EB. For RHEL 9, Red Hat documents XFS as supported up to 1024 TiB and ext4 up to 50 TiB, so the table was updated to use the RHEL-supported limits.
- The comparison table listed ext4 quota support as user and group only. Red Hat documents ext4 user, group, and project quotas, so the ext4 quota entry was updated.
- The XFS recommendation said XFS had the "best support." Since Red Hat supports both XFS and ext4 but recommends XFS as the default local filesystem unless there are specific reasons otherwise, the wording was changed to "Red Hat's recommended default."

## Review Notes
- The ext4 shrink example is syntactically valid, but shrinking an ext4 filesystem must be done while unmounted and after an `e2fsck -f` check. The surrounding text already frames ext4 shrink support as offline in the comparison table.
- Performance recommendations are workload-dependent. Red Hat recommends benchmarking the application on the target server and storage system before making a final filesystem choice.
