# Validation Summary: How to Implement Least Privilege Access Controls on RHEL Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- sudo and sudoers drop-in files
- SELinux user mappings
- Linux user and group management
- OpenSSH SFTP account restrictions
- GNU findutils file permission checks
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Managing sudo access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Managing confined and unconfined users": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/managing-confined-and-unconfined-users_using-selinux
- Red Hat Enterprise Linux 7 documentation, "Confining Existing Linux Users: semanage login": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-confining_users-confining_existing_linux_users_semanage_login
- sudoers manual, current upstream documentation: https://www.sudo.ws/docs/man/sudoers.man/
- Local `sudoers(5)` and `visudo(8)` manual/help output from sudo 1.9.15p5
- Local `sshd_config(5)` manual output for `Match`, `ForceCommand`, `internal-sftp`, and `ChrootDirectory`
- Local `useradd --help`, `usermod --help`, `find --version`, and `systemctl --version` output

## Issues Found
- The sudoers drop-in examples created files with `tee` but did not set the recommended sudoers mode. Added `chmod 0440` commands after creating the sudoers snippets, matching sudoers' documented default file mode expectations.
- The SFTP-only example implied that setting `/usr/sbin/nologin` alone creates an SFTP-only account. Updated the comment to state that SFTP-only access also requires an OpenSSH `Match`/`ForceCommand` configuration.
- The file audit example described `find /etc -perm -o+w` as finding files writable by non-owners. That command specifically finds files writable by "other" users. Updated the comment to "world-writable files in /etc."
- The sudo logging drop-in also lacked an explicit sudoers mode after creation with `tee -a`. Added `chmod 0440 /etc/sudoers.d/logging`.

## Review Notes
The sudoers snippets parse successfully with `visudo -cf` on sudo 1.9.15p5. The SELinux `semanage login -a -s user_u <user>` form matches Red Hat examples, and Red Hat documentation confirms `staff_u` has sudo capability while `user_u` does not. The article remains a concise guide; future improvements could add a concrete `sshd_config` SFTP `Match` block, but that would be an expansion rather than a correction.
