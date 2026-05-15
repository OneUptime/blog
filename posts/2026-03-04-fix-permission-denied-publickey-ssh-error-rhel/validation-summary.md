# Validation Summary: How to Fix 'Permission Denied (publickey)' SSH Error on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- OpenSSH client and server
- SSH public key authentication
- sshd_config
- SELinux file contexts
- Linux file permissions

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, OpenSSH: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-openssh
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config.5
- OpenSSH sshd(8) manual: https://man.openbsd.org/OpenBSD-7.4/sshd.8
- Local system man pages for ssh(1), sshd(8), and sshd_config(5)

## Issues Found
- The server-side command `chmod 755 ~` was broader than necessary. OpenSSH StrictModes requires the user's home directory not be writable by other users; it does not require making the directory world-readable or world-executable. Changed it to `chmod go-w ~` to remove group/other write permissions while preserving the user's existing read and execute policy.

## Review Notes
- The OpenSSH manuals recommend `700` for `~/.ssh` and `600` for `~/.ssh/authorized_keys`; the post's primary recommendation matches that.
- On modern RHEL installations, effective sshd settings can also come from included files under `/etc/ssh/sshd_config.d/`. The post's `grep` command is still useful as a first check, but `sshd -T` is a better future improvement for viewing effective configuration.
