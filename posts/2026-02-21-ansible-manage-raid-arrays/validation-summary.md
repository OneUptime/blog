# Validation Summary: How to Use Ansible to Manage RAID Arrays

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- community.general.filesystem
- ansible.posix.mount
- Linux mdadm software RAID
- mdadm.conf monitoring configuration
- XFS and ext-family filesystem resizing
- Linux systemd services and cron

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible community.general.filesystem module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible ansible.posix.mount module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- mdadm.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- xfs_growfs(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- resize2fs(8) Linux manual page: https://man7.org/linux/man-pages/man8/resize2fs.8.html
- Red Hat Enterprise Linux storage documentation for extending RAID and XFS growth: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_storage_devices/managing-raid_managing-storage-devices
- Debian mdadm mdmonitor.service source package reference: https://sources.debian.org/src/mdadm/4.1-11/systemd/mdmonitor.service/
- Red Hat note on XFS nobarrier failures in current RHEL releases: https://access.redhat.com/solutions/5315771
- Debian xfs(5) man page deprecation table for XFS mount options: https://manpages.debian.org/unstable/xfsprogs/xfs.5.en.html

## Issues Found
- The XFS example used `nobarrier` in `mount_opts`. That option is deprecated/removed on modern XFS and can make mounts fail on current distributions. Changed the example to `defaults,noatime`.
- The disk replacement playbook used `ansible.builtin.command` for an `sfdisk` pipeline. The command module does not process shell metacharacters such as `|`, so the task would not work as written. Changed it to `ansible.builtin.shell`.
- The disk replacement playbook derived a source disk from the RAID device name with a regex, which was brittle and could copy from the wrong device. Added an explicit `existing_member_disk` variable and used it in the `sfdisk` command.
- The RAID growth playbook passed the RAID block device to `xfs_growfs` and used invalid/fragile `when` expressions for filesystem detection. Added a `raid_mount` variable, changed XFS growth to use the mount point, and corrected the Ansible conditions for XFS and ext2/ext3/ext4.

## Review Notes
The examples are now technically consistent with the referenced module and command documentation. Future improvements could make `mdadm.conf` handling more idempotent and distribution-aware, especially where examples append or overwrite the file.
