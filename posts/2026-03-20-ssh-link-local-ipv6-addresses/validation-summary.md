# Validation Summary: How to SSH to Link-Local IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 link-local addresses and scoped address zone IDs
- OpenSSH `ssh`, `ssh_config`, and `scp`
- Linux `ip`, neighbor discovery, and `ping`
- `curl` URL handling for scoped IPv6 literals
- Nmap IPv6 multicast discovery
- `rsync` over SSH
- Docker and VM local networking examples

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4007, IPv6 Scoped Address Architecture: https://datatracker.ietf.org/doc/html/rfc4007
- RFC 9844, Entering IPv6 Zone Identifiers in User Interfaces: https://www.rfc-editor.org/rfc/rfc9844.html
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- OpenSSH `scp(1)` manual: https://man.openbsd.org/scp.1
- curl IPv6 tutorial: https://curl.se/docs/tutorial.html
- Nmap target specification: https://nmap.org/book/man-target-specification.html
- Nmap `targets-ipv6-multicast-echo` NSE script documentation: https://nmap.org/nsedoc/scripts/targets-ipv6-multicast-echo.html
- Linux `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ip-neighbour(8)` manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- Linux `ping(8)` manual: https://www.man7.org/linux/man-pages/man8/ping.8.html
- rsync manual: https://download.samba.org/pub/rsync/rsync.1

## Issues Found
- The `~/.ssh/config` examples used `HostName fe80::...%eth0`. OpenSSH expands `%` tokens in `Hostname`, and a literal percent must be written as `%%`. Updated the config examples and summary to use `%%eth0`.
- The URL-encoding section described the example as "Browser / curl style". RFC 9844 obsoletes RFC 6874's URI syntax update and does not define browser behavior, while curl still documents URL-escaped percent signs for zone IDs. Updated the wording to describe this as curl URI style.
- The nmap example attempted to scan `fe80::%eth0/64`, which is not a practical discovery method for an IPv6 /64. Replaced it with Nmap's documented IPv6 multicast discovery script.
- The ping examples used `ping6`. Current iputils documents IPv6 via `ping -6`, with `ping6` only as a compatibility symlink on some systems. Updated examples to `ping -6`.
- The container example used `fe80::containeraddr`, which is not a syntactically valid IPv6 address. Replaced it with a valid example address and clarified that the address and host-side interface should be replaced.
- The SCP comment said the `%` needs shell quoting. In POSIX shells the bracketed remote spec is the part that needs careful quoting; updated the comment to say to quote the remote spec so brackets and `%` are passed literally.

## Review Notes
- The guide is Linux/Unix-focused. On Windows, scoped IPv6 examples often use a numeric interface index rather than an interface name.
- Browser handling of IPv6 zone identifiers remains implementation-specific; the post now keeps the URL-encoding claim scoped to curl-style URI handling.
