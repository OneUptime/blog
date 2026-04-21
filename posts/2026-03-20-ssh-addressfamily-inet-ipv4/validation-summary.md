# Validation Summary: How to Set AddressFamily inet in SSH Config to Force IPv4 Connections

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenSSH client configuration
- OpenSSH server configuration
- IPv4 and IPv6 address family selection
- Linux socket inspection with ss
- systemd service reload workflow

## Sources Consulted
- OpenSSH ssh_config(5), AddressFamily and client configuration precedence: https://man.openbsd.org/ssh_config
- OpenSSH sshd_config(5), AddressFamily and ListenAddress directives: https://man.openbsd.org/sshd_config
- OpenSSH ssh(1), -4, -G, and -v options: https://man.openbsd.org/ssh
- OpenSSH scp(1), -4 option: https://man.openbsd.org/scp
- OpenSSH sshd(8), -t configuration test mode: https://man.openbsd.org/sshd
- OpenSSH ssh-keygen(1), -R known_hosts removal behavior: https://man.openbsd.org/ssh-keygen
- OpenSSH sshd(8), SSH known_hosts file format: https://man.openbsd.org/sshd
- Linux ss(8) manual page, -t, -l, -n, and -p options: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The troubleshooting section incorrectly implied that SSH can continue using IPv6 because an IPv6 address is cached in known_hosts. The OpenSSH known_hosts file stores host keys for hostnames and addresses; it is not an address-resolution cache. I replaced the known_hosts removal commands with `ssh -G hostname | grep -i "^addressfamily"` so readers can verify the effective client configuration directly.

## Review Notes
- The OpenSSH `AddressFamily inet` examples are technically correct for both client and server configuration.
- The `ssh -4`, `scp -4`, `sshd -t`, and `ss -tlnp` commands are valid as shown.
- `systemctl reload sshd` is valid on systems where the OpenSSH server unit is named `sshd`; some Linux distributions use `ssh` as the service name instead.
