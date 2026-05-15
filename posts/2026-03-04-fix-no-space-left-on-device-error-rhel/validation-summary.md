# Validation Summary: How to Fix 'No Space Left on Device' Error on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF package management
- GNU coreutils df, du, sort, and head
- GNU findutils find
- systemd journalctl
- lsof
- Linux procfs file descriptors
- LVM logical volumes
- XFS and ext4 filesystems

## Sources Consulted
- Red Hat Enterprise Linux documentation: DNF commands list - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/dnf-commands-list
- DNF documentation: configuration reference for installonly_limit - https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF5 documentation: remove --oldinstallonly behavior - https://dnf5.readthedocs.io/en/latest/commands/remove.8.html
- GNU coreutils manual: df invocation - https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html
- GNU coreutils manual: du invocation - https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html
- GNU findutils manual - https://www.gnu.org/software/findutils/manual/html_mono/find.html
- systemd journalctl manual - https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- lsof documentation - https://lsof.readthedocs.io/en/stable/
- Red Hat Enterprise Linux documentation: managing file systems, XFS/ext4 resizing and inode behavior - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_file_systems/index
- Red Hat Enterprise Linux documentation: configuring and managing logical volumes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_logical_volumes/overview-of-logical-volume-features

## Issues Found
- The `du -sh /*` and `du -sh /var/*` examples were described as finding usage on the full filesystem, but without `-x`/`--one-file-system` GNU `du` can cross into separately mounted filesystems. Changed both commands to `du -xsh` so they stay on one filesystem.
- The old-kernel cleanup command used a valid but less canonical separated `--setopt installonly_limit=2` form. Changed it to `--setopt=installonly_limit=2`, matching documented command-line option style and avoiding ambiguity.
- The `find / -xdev` examples only search the root filesystem. Added comments telling readers to replace `/` with the affected filesystem's mount point when the full filesystem is not `/`.

## Review Notes
The commands are broadly correct for RHEL-style systems. For RHEL 10 or systems using DNF5, `dnf remove --oldinstallonly --limit=2 kernel` is also documented; the retained `--setopt=installonly_limit=2` approach aligns with DNF configuration behavior and remains appropriate for RHEL 8/9-era DNF usage. Destructive cleanup commands such as `find ... -delete` and truncating `/proc/<pid>/fd/<fd_number>` are technically valid but should be used only after confirming the target files and processes.
