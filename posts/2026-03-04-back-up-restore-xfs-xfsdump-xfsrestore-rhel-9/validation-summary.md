# Validation Summary: How to Back Up and Restore XFS File Systems Using xfsdump and xfsrestore on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS file systems
- xfsdump
- xfsrestore
- SSH and cron-based backup automation

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: Backing up an XFS file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Managing file systems: Restoring an XFS file system from backup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- xfsdump(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfsdump.8.html
- xfsrestore(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfsrestore.8.html

## Issues Found
- The remote `xfsdump` example used `-f -` for standard output. The xfsdump syntax requires omitting `-f` and using a lone `-` before the source filesystem, so the command was changed to `xfsdump ... - /data`.
- The incremental restore examples omitted cumulative restore mode. xfsrestore requires `-r` for cumulative restores, including the base level 0 restore and each delta restore in the sequence, so `-r` was added to those commands.
- The remote `xfsrestore` example used `-f -` for standard input. The xfsrestore syntax requires omitting `-f` and using a lone `-` before the destination, so the command was changed to `xfsrestore - /data`.
- The incremental restore section did not mention the `xfsrestorehousekeeping` directory left by cumulative restores. A short cleanup note was added because the xfsrestore manual states the operator must remove it after the last delta is applied.

## Review Notes
The remaining command examples and explanations align with RHEL 9 documentation and the current xfsdump/xfsrestore manual pages. The multiple `-f` backup example creates multiple dump streams across destinations rather than a single sequentially numbered archive, which is valid xfsdump behavior but may be worth explaining more fully in a future editorial pass.
