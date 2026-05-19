# Validation Summary: How to Configure TCP Wrappers (/etc/hosts.allow, /etc/hosts.deny) on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- TCP Wrappers / libwrap
- `/etc/hosts.allow` and `/etc/hosts.deny`
- OpenSSH server
- `tcpdchk` and `tcpdmatch`
- UFW, nftables, firewalld, and fail2ban integration examples

## Sources Consulted
- Ubuntu `hosts_access(5)` man page: https://manpages.ubuntu.com/manpages/noble/man5/hosts_access.5.html
- Ubuntu `hosts_options(5)` man page: https://manpages.ubuntu.com/manpages/noble/man5/hosts_options.5.html
- Ubuntu `tcpdchk(8)` man page: https://manpages.ubuntu.com/manpages/noble/man8/tcpdchk.8.html
- Ubuntu `tcpdmatch(8)` man page: https://manpages.ubuntu.com/manpages/noble/man8/tcpdmatch.8.html
- OpenSSH 6.7 release notes: https://www.openssh.org/txt/release-6.7
- OpenSSH 9.8 release notes: https://www.openssh.org/txt/release-9.8
- Ubuntu Noble `openssh-server` package metadata: https://packages.ubuntu.com/noble/net/openssh-server
- Local Ubuntu package/man-page checks for `libwrap0`, `openssh-server`, `hosts_access(5)`, and `hosts_options(5)`.

## Issues Found
- Corrected the OpenSSH version note. Upstream OpenSSH removed TCP Wrappers/libwrap support in 6.7, but Ubuntu/Debian builds can still carry distribution-specific libwrap support. Ubuntu 24.04's `openssh-server` package depends on `libwrap0`, so the original statement that Ubuntu 24.04's default `sshd` may not respect hosts.allow/deny was too broad.
- Replaced the suggested `sshd -d ... | grep "tcp wrappers"` check with `ldd $(which sshd) | grep libwrap`, which directly verifies whether the installed `sshd` binary is linked against libwrap.
- Clarified `twist` behavior. `twist` replaces the service process with another command; it is not an allow rule with a custom banner and does not use the command's exit code to decide access.
- Clarified `spawn` behavior. `spawn` runs a child command, and TCP Wrappers waits for it unless the command is explicitly backgrounded with `&`.
- Corrected the subnet notation comments to distinguish `net/mask` from `net/mask-length` notation instead of implying CIDR support is only a modern or version-specific feature on Ubuntu.

## Review Notes
The post is accurate after the corrections. The main caveat is that TCP Wrappers support is distribution- and package-specific for modern daemons, so readers should verify each daemon binary rather than assuming support from the daemon name alone.
