# Validation Summary: How to Troubleshoot 'Connection Refused' Errors for SSH on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- OpenSSH server and client
- systemd
- firewalld
- SELinux port contexts
- TCP Wrappers
- Network testing with netcat and telnet

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, OpenSSH: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-openssh
- Red Hat Enterprise Linux 8 Securing networks, non-default OpenSSH port configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/securing_networks/using-and-configuring-firewalld_securing-networks
- Red Hat Customer Portal, Replacing TCP Wrappers in RHEL 8 and 9: https://access.redhat.com/solutions/3906701
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config
- OpenSSH sshd(8) manual: https://man.openbsd.org/sshd
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- OpenSSH ssh-keygen(1) manual: https://man.openbsd.org/ssh-keygen
- OpenBSD nc(1) manual: https://man.openbsd.org/nc.1

## Issues Found
- The opening explanation said "Connection refused" means nothing is listening on the SSH port. That is common, but incomplete because an active reject from a firewall or host policy can also produce a refused connection. Updated the explanation to include active rejection and clarified the timeout distinction.
- The port and ListenAddress checks only matched directives starting in column 1 and did not show the effective OpenSSH configuration. Added `sshd -T` checks and adjusted the `grep` patterns to allow leading whitespace and drop-in files.
- The TCP Wrappers section applied to RHEL generally, but TCP Wrappers are removed in RHEL 8 and later. Scoped the section to RHEL 7 only and added a note for RHEL 8+.
- The ListenAddress guidance said to set `0.0.0.0` to listen on all interfaces. That only covers IPv4. Updated the note to say removing `ListenAddress` uses the default behavior, or `0.0.0.0` covers all IPv4 interfaces.

## Review Notes
- The firewalld examples are technically valid, but real systems may need an explicit `--zone` depending on which zone owns the network interface.
- The SELinux `semanage port -a` command is correct for adding a new non-standard SSH port. If the port already exists under another SELinux type, an administrator may need `semanage port -m` instead.
- `telnet` is useful as a connectivity test but may not be installed by default on minimal RHEL systems.
