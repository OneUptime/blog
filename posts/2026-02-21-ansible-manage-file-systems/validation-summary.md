# Validation Summary: How to Use Ansible to Manage File Systems (ext4, xfs, btrfs)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.general.filesystem
- ansible.posix.mount
- ext4 and e2fsprogs
- XFS and xfsprogs
- btrfs and btrfs-progs
- Linux filesystem health commands

## Sources Consulted
- Ansible community.general.filesystem module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible ansible.posix.mount module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- ext4(5) manual page: https://man7.org/linux/man-pages/man5/ext4.5.html
- tune2fs local help output from e2fsprogs 1.47.0
- mkfs.btrfs(8) manual page: https://man7.org/linux/man-pages/man8/mkfs.btrfs.8.html
- Btrfs documentation: https://btrfs.readthedocs.io/en/latest/
- xfs_io(8) manual page: https://man7.org/linux/man-pages/man8/xfs_io.8.html
- xfs_quota(8) manual page: https://man7.org/linux/man-pages/man8/xfs_quota.8.html
- Red Hat Enterprise Linux filesystem documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_file_systems/index

## Issues Found
- The ext4 task name claimed to enable journal checksumming, but `tune2fs -O metadata_csum` enables ext4 metadata checksumming. Updated the task name to say metadata checksumming.
- The XFS mount example discussed project quotas but did not enable them persistently in the mount options. Added `prjquota` to the `ansible.posix.mount` options.
- The XFS quota task attempted to remount with quota support after the mount task. Replaced it with a verification command because quota support is now configured in the persistent mount options.
- The XFS task name described `xfs_io -c 'extsize 1m'` as configuring real-time settings. Updated the wording because `extsize` sets the preferred inherited extent size hint.
- The btrfs creation example used `-M`, which creates mixed data and metadata block groups, not metadata duplication. Changed the option to `-m dup` to match the task description.

## Review Notes
The examples assume the relevant Ansible collections and filesystem tools are installed on managed hosts: community.general, ansible.posix, e2fsprogs, xfsprogs, and btrfs-progs. The health-check examples are operational checks rather than full offline filesystem repair workflows, which is appropriate for the post's scope.
