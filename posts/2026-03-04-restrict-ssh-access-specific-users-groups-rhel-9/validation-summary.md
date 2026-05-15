# Validation Summary: How to Restrict SSH Access to Specific Users or Groups on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server configuration (`sshd_config`)
- PAM access control (`pam_access.so`, `/etc/security/access.conf`)
- `authselect`
- `firewalld`
- SFTP-only OpenSSH configuration
- Linux login auditing commands and `/var/log/secure`

## Sources Consulted
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/securing_networks
- Red Hat Enterprise Linux 9 Configuring authentication and authorization documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Local `sshd_config(5)` manual page for `AllowUsers`, `AllowGroups`, `DenyUsers`, `DenyGroups`, `Match`, `ChrootDirectory`, and `internal-sftp`
- Local `access.conf(5)` manual page for PAM access rule syntax and first-match behavior
- Local `pam_access(8)` manual page for `pam_access.so` behavior and configuration files

## Issues Found
- The description mentioned TCP wrappers, but the article does not configure TCP wrappers, and RHEL 9/OpenSSH access control should be handled with OpenSSH, PAM, and firewalld instead. Removed the TCP wrappers reference from the description.
- The PAM `access.conf` examples used `@admins` and `@developers` for Unix groups. The Linux-PAM `access.conf(5)` syntax documents Unix groups as `(group)`; `@name` is netgroup syntax. Updated the examples to `(admins)` and `(developers)`, including the test command.
- The SSH `Match Address` example said it allowed `deploy` as an exception to a global `AllowGroups sshusers` rule. OpenSSH applies `AllowGroups` and `AllowUsers` as separate allow checks, so `deploy` must still satisfy the group allowlist unless the matching configuration is changed accordingly. Updated the comment to state that `deploy` must also be in `sshusers`.

## Review Notes
The remaining commands and configuration snippets align with the referenced documentation. Future improvements could mention keeping an existing SSH session open while testing access changes and checking the active firewalld zone when applying rich rules.
