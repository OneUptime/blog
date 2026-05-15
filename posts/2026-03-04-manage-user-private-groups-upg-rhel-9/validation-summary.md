# Validation Summary: How to Manage User Private Groups (UPG) on RHEL

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux users and groups
- User Private Groups (UPG)
- shadow-utils commands (`useradd`, `userdel`, `usermod`)
- Linux file permissions, umask, SGID directories, and POSIX ACLs
- FreeIPA / Red Hat Identity Management user private groups

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing users and groups: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-and-groups_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Managing file system permissions and umask: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-file-system-permissions_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 Configuring basic system settings PDF, umask startup file examples: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_basic_system_settings/red_hat_enterprise_linux-9-configuring_basic_system_settings-en-us.pdf
- Red Hat Identity Management / FreeIPA documentation on user private groups: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/managing_idm_users_groups_hosts_and_access_control_rules/Red_Hat_Enterprise_Linux-8-Managing_IdM_users_groups_hosts_and_access_control_rules-en-US.pdf
- Local Linux man pages: `useradd(8)`, `userdel(8)`, `login.defs(5)`, `setfacl(1)`, `acl(5)`, `chmod(1)`

## Issues Found
- The post said RHEL sets the default umask to `0022` in `/etc/profile` and `/etc/bashrc`. RHEL bash startup files commonly use conditional logic that sets `002` for regular users whose primary group matches the login name, and `022` otherwise. Updated the paragraph to describe that conditional behavior accurately.

## Review Notes
- The `useradd`, `userdel`, `USERGROUPS_ENAB`, `/etc/default/useradd`, SGID directory, `usermod -aG`, `setfacl`, `getfacl`, and UID/GID range examples were checked against official documentation or local man pages and are technically valid.
- The default ACL example correctly demonstrates a practical way to make new files group-writable in a shared directory without changing the system-wide umask. On ACL-enabled files, remember that the ACL mask affects the permissions shown by `ls -l` and the effective group permissions.
