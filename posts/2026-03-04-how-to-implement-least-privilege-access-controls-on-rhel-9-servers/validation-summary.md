# Validation Summary: How to Implement Least Privilege Access Controls on RHEL 9 Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux user and group auditing
- sudo and sudoers drop-in configuration
- OpenSSH server access controls
- Linux Access Control Lists
- SELinux user mappings
- SUID and SGID Unix permissions

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing sudo access: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Securing networks / OpenSSH access controls: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/securing_networks
- Red Hat Enterprise Linux 9 documentation: Managing file system permissions / ACLs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-file-system-permissions_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Using SELinux / SELinux user mappings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- Local `sudoers(5)` man page for sudoers syntax, `NOPASSWD`, and run-as specifications.
- Local `sshd_config(5)` man page for `AllowUsers`, `AllowGroups`, and `Include` drop-in behavior.
- Local `setfacl(1)`, `getfacl(1)`, and `find(1)` man pages for command syntax and permission matching.

## Issues Found
- The SSH restriction commands used shell redirection directly into `/etc/ssh/sshd_config.d/access.conf`. That fails for non-root shells even when the command is conceptually an administrative task, because the redirect is performed by the current shell. Changed the examples to pipe through `sudo tee`.
- The SSH section described `AllowUsers` and `AllowGroups` as alternatives, but appended both directives to the same file. OpenSSH applies all allow and deny directives, so using both makes access require satisfying both constraints. Changed the second example to overwrite the same drop-in as an alternative group-based configuration.

## Review Notes
- The sudoers examples are syntactically valid for user-based rules. In a real environment, administrators should edit sudoers drop-ins with `visudo -f` and test command arguments carefully, because some allowed commands can still offer shell escapes or broader access depending on their options.
- The ACL examples apply to the existing directory and files matched by the shell glob. New files created later, such as rotated logs, may need default ACLs or log rotation configuration if the access should persist.
