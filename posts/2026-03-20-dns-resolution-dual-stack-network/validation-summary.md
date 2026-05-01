# Validation Summary: How to Handle DNS Resolution in a Dual-Stack Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- BIND 9
- IPv4
- IPv6
- Dual-stack networking
- DNS64/NAT64
- glibc name resolution (`getaddrinfo()`, `getent`, `/etc/gai.conf`)

## Sources Consulted
- ISC BIND 9 manual pages (`dig`): https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- ISC BIND 9 configuration reference (`listen-on`, `listen-on-v6`): https://bind9.readthedocs.io/en/v9.18.21/reference.html
- ISC BIND 9 configuration reference (`dns64`): https://bind9.readthedocs.io/en/v9.20.8/reference.html
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc6724.html
- RFC 8305, Happy Eyeballs Version 2: Better Connectivity Using Concurrency: https://www.rfc-editor.org/rfc/rfc8305.html
- Linux `gai.conf(5)` man page: https://man7.org/linux/man-pages/man5/gai.conf.5.html
- Linux `getent(1)` man page: https://man7.org/linux/man-pages/man1/getent.1.html
- Linux `getaddrinfo(3)` man page: https://man7.org/linux/man-pages/man3/getaddrinfo.3.html
- Local command and system reference checks: `dig -h`, `getent --help`, `man 5 gai.conf`, `man 1 getent`, `/etc/gai.conf`

## Issues Found
- The introduction implied RFC 6724 alone determines the final address used. I updated it to reflect that clients typically get an ordered list from OS policy and that many applications also use Happy Eyeballs when connecting.
- Step 1 described the `dig` examples as confirming "your DNS server" even though no `@server` was specified. I updated the wording to describe what the commands actually validate: that DNS resolution returns AAAA records.
- Step 2 implied explicit `listen-on` and `listen-on-v6` settings were required and referenced `named.conf.options` as if it were universal. I updated the text to note that BIND listens on both address families by default unless restricted and made the snippet generic to an `options` block.
- Step 3 incorrectly described the default `gai.conf` preference as "IPv6 GUA (::1, 2000::/3)" and suggested adding a single `precedence` line. I updated the explanation to match the documented glibc precedence table (`::/0` versus `::ffff:0:0/96`) and clarified that preferring IPv4 requires changing the default precedence table entry.
- Step 4 stated that the first `getent ahosts` result is what applications will attempt first. I updated this to say it is the first `getaddrinfo()` result and noted that applications may still use Happy Eyeballs and try another family.
- The troubleshooting table said Happy Eyeballs "always" picks IPv4. I updated it to "often falls back to IPv4" and tied the cause to slow or failing IPv6 paths.

## Review Notes
- The `dig` examples are valid with current BIND `dig`, including issuing multiple lookups in one command.
- `getent ahosts` reflects glibc `getaddrinfo()` behavior and may filter out unsupported address families on the local host unless `--no-addrconfig` is used.
