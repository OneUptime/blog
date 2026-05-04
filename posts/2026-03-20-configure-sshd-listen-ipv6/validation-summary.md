# Validation Summary: How to Configure sshd to Listen on IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenSSH server (sshd)
- sshd_config configuration
- IPv6 networking
- systemd (systemctl, journalctl)
- ss / netstat for socket inspection
- ssh client
- netcat (OpenBSD nc)
- ip6tables firewall
- UFW firewall
- firewalld

## Sources Consulted
- OpenSSH sshd_config(5) man page: https://man.openbsd.org/sshd_config
- OpenSSH sshd(8) man page: https://man.openbsd.org/sshd
- OpenSSH ssh(1) man page: https://man.openbsd.org/ssh
- OpenBSD nc(1) man page: https://man.openbsd.org/nc
- iptables / ip6tables documentation: https://netfilter.org/documentation/
- UFW documentation: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- firewalld documentation: https://firewalld.org/documentation/
- ss(8) and netstat(8) man pages
- RFC 4291 (IP Version 6 Addressing Architecture)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation - 2001:db8::/32)

## Issues Found
1. **Duplicate `ListenAddress 2001:db8::10` in first config example.** The first config block declared `ListenAddress 2001:db8::10` twice (once at the top, then again under "Multiple listen addresses"). If copied verbatim, sshd would fail to start because it cannot bind the same address/port twice. Fixed by commenting out the duplicate `ListenAddress 2001:db8::10` and `ListenAddress 0.0.0.0` lines under the "Multiple listen addresses" heading so they read as alternative options being demonstrated, matching the surrounding pattern of commented-out alternatives.

2. **Conflicting ListenAddress directives in IPv6-only example.** The second config block had both `ListenAddress 2001:db8::10` and `ListenAddress ::` uncommented. Since `::` (the unspecified address) instructs sshd to listen on all IPv6 interfaces, having both produces a bind conflict on 2001:db8::10. Fixed by commenting out `ListenAddress ::` so it remains shown as an alternative ("Or all IPv6 interfaces").

## Review Notes
- All other technical content is accurate: `AddressFamily any` is indeed the OpenSSH default; `ListenAddress` accepts a literal IPv6 address without brackets when no port is specified; `ssh user@2001:db8::10` is valid syntax for the OpenSSH client; `nc -6 -zv` works with the OpenBSD netcat shipped on most Linux distros.
- The systemd unit is named `sshd.service` on RHEL/Fedora/CentOS and `ssh.service` on Debian/Ubuntu (with `sshd.service` typically aliased). The post uses `sshd` consistently, which works on most distributions but readers on Debian/Ubuntu may need to substitute `ssh` if the alias is absent.
- `ss -tlnp` and `netstat -tlnp` require root/sudo to display the process name; otherwise the `users:(...)` column is omitted. The post does not call this out but the commands themselves are correct.
- The example uses `2001:db8::/32`, which is the IPv6 documentation prefix per RFC 3849 — appropriate for a tutorial.
- Modern OpenSSH (9.x+) deprecates some legacy options, but everything used in this post (`ListenAddress`, `AddressFamily`, `Port`, `PermitRootLogin`, `PasswordAuthentication`, `PubkeyAuthentication`, `AuthorizedKeysFile`) remains current and supported.
