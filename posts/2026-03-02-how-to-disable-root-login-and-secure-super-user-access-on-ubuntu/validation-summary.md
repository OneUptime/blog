# Validation Summary: How to Disable Root Login and Secure Super User Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Ubuntu user management
- OpenSSH server configuration
- sudo and sudoers
- PAM `pam_wheel`
- Linux shadow passwords
- systemd service management

## Sources Consulted
- Ubuntu Server documentation: User management - https://ubuntu.com/server/docs/how-to/security/user-management/
- Ubuntu Server documentation: OpenSSH server - https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Ubuntu Community Help Wiki: RootSudo - https://help.ubuntu.com/community/RootSudo
- Ubuntu Community Help Wiki: Sudoers - https://help.ubuntu.com/community/Sudoers
- Ubuntu manpage: `passwd(1)` - https://manpages.ubuntu.com/manpages/jammy/man1/passwd.1.html
- Ubuntu manpage: `pam_wheel(8)` - https://manpages.ubuntu.com/manpages/jammy/man8/pam_wheel.8.html
- Ubuntu manpage: `sudoers(5)` - https://manpages.ubuntu.com/manpages/jammy/man5/sudoers.5.html
- OpenSSH manual: `sshd_config(5)` - https://www.openssh.org/manual.html
- Local manpages for `passwd(1)`, `sudoers(5)`, `pam_wheel(8)`, `sshd_config(5)`, `usermod(8)`, and `visudo(8)`

## Issues Found
- The SSH root-login check only searched `/etc/ssh/sshd_config`, which can miss Ubuntu's included `/etc/ssh/sshd_config.d/*.conf` snippets. Updated the command to search both locations and changed the example edit target to a dedicated snippet file.
- The SSH restart command used `sudo systemctl restart sshd`. Ubuntu's official OpenSSH server documentation uses `sudo systemctl restart ssh.service`, so the command was updated.
- The sudoers example used `Defaults rootpw=false`, which is invalid sudoers syntax because `rootpw` is a boolean flag and does not take a value. Updated it to `Defaults !rootpw` and verified the snippet with `visudo -c`.
- The `su` restriction section suggested `dpkg-reconfigure login` and showed `auth required pam_wheel.so` while saying to use Ubuntu's `sudo` group. `pam_wheel` defaults to the `wheel` group or GID 0 unless a group is specified. Removed the incorrect `dpkg-reconfigure` command and updated the PAM example to `auth required pam_wheel.so group=sudo`.

## Review Notes
The remaining commands and configuration examples are consistent with the consulted Ubuntu documentation and local manpages. The article correctly notes that locking the root password does not disable all possible authentication tokens, such as SSH keys, which is why `PermitRootLogin no` is still necessary.
