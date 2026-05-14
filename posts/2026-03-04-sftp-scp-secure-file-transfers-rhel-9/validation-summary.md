# Validation Summary: How to Use SFTP and SCP for Secure File Transfers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH
- SCP
- SFTP
- sshd configuration
- Chrooted SFTP-only users
- rsync over SSH

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using secure communications between two systems with OpenSSH: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/assembly_using-secure-communications-between-two-systems-with-openssh_securing-networks
- OpenBSD/OpenSSH scp(1) manual: https://man.openbsd.org/scp.1
- OpenBSD/OpenSSH sftp(1) manual: https://man.openbsd.org/sftp.1
- OpenBSD/OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config.5
- OpenBSD/OpenSSH sftp-server(8) manual: https://man.openbsd.org/sftp-server.8
- OpenSSH 9.0 release notes: https://www.openssh.org/releasenotes.html
- Local system man pages for scp(1), sftp(1), sshd_config(5), and sftp-server(8)

## Issues Found
- The SFTP-only user was created with the default home directory, but `ChrootDirectory /data/sftp/%u` causes sshd to change to the user's home directory after entering the chroot. Changed the `useradd` command to set `-d /uploads`, which exists inside the chroot and matches the later test note that the user lands with access to `/uploads`.
- The chroot ownership explanation said only that the chroot directory must be owned by root. Clarified that the chroot directory and parent path components must be root-owned and not writable by other users, matching sshd_config(5).
- The detailed SFTP logging section implied changing a `Subsystem` line in the same drop-in file used for a `Match` block. Clarified that `Subsystem sftp internal-sftp -l INFO` belongs in global sshd configuration outside any `Match` block, and added the corresponding `ForceCommand internal-sftp -l INFO` example for the SFTP-only group.

## Review Notes
RHEL 9 uses SFTP as the default transport for `scp`, with `scp -O` available for legacy SCP/RCP compatibility. The post's SCP examples are still valid for normal RHEL 9 usage, but future improvements could mention this compatibility detail explicitly.
