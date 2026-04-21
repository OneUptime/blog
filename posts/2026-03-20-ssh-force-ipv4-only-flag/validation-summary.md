# Validation Summary: How to Force SSH to Use IPv4 Only with the -4 Flag

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenSSH client
- OpenSSH server
- SSH client configuration
- sshd server configuration
- SCP
- SFTP
- curl
- rsync
- Linux socket inspection with ss

## Sources Consulted
- OpenBSD/OpenSSH ssh(1) manual: https://man.openbsd.org/ssh.1
- OpenBSD/OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config.5
- OpenBSD/OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config.5
- OpenBSD/OpenSSH scp(1) manual: https://man.openbsd.org/scp.1
- OpenBSD/OpenSSH sftp(1) manual: https://man.openbsd.org/sftp.1
- curl official man page: https://curl.se/docs/manpage.html
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- Local OpenSSH 9.6p1 command output for ssh, scp, and sftp option availability
- Local iproute2 ss --help output for socket listing options

## Issues Found
- The debugging section said to use plain curl commands to check what IP a hostname resolves to. curl's `-4` and `-6` options force IPv4 or IPv6 resolution/connection behavior, but the shown commands do not display the resolved address by default. Updated the comment to say the commands check HTTP connectivity over each address family.

## Review Notes
The SSH, SCP, SFTP, and curl IPv4/IPv6 flags are current and documented. `AddressFamily inet` is valid in both `ssh_config` and `sshd_config`, and `ListenAddress 0.0.0.0` is valid for binding sshd to IPv4 wildcard addresses. The `systemctl restart sshd` service name is common but distribution-specific; some Linux distributions use `ssh.service` instead.
