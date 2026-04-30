# Validation Summary: How to Control IPv6 Destination Address Selection

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- RFC 6724 destination address selection
- Happy Eyeballs
- DNS AAAA/A resolution
- Linux/glibc `getaddrinfo()` behavior
- `/etc/gai.conf`
- `iproute2`
- Python `socket`
- C/POSIX sockets

## Sources Consulted
- RFC 6724, *Default Address Selection for Internet Protocol Version 6 (IPv6)*: https://www.rfc-editor.org/rfc/rfc6724
- RFC 8305, *Happy Eyeballs Version 2: Better Connectivity Using Concurrency*: https://www.rfc-editor.org/rfc/rfc8305
- `gai.conf(5)` Linux manual page: https://man7.org/linux/man-pages/man5/gai.conf.5.html
- `ip-addrlabel(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ip-addrlabel.8.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Local verification on the review host: `glibc 2.39`, `/etc/gai.conf`, `ip addrlabel list`, `ip addrlabel help`, and compile/runtime checks for the Python and C examples

## Issues Found
- The post treated `ip addrlabel` as if it exposed or controlled `getaddrinfo()` precedence. I corrected this to use `/etc/gai.conf` for Linux/glibc userspace precedence and noted that `ip addrlabel` manages kernel labels, not precedence.
- The default precedence values shown were RFC 6724-style values, but the Linux/glibc examples in the post rely on glibc defaults documented in `gai.conf(5)`. I replaced the table and commands with Linux/glibc-accurate values and inspection steps.
- The overview and observation sections overstated that the first sorted result is always what applications try. I narrowed this to “many applications” and aligned it with RFC 6724/RFC 8305 behavior.
- The Rule 5 section used `ip addrlabel list` and hard-coded label values that do not match the Linux/glibc userspace policy table used by `getaddrinfo()`. I changed the example to inspect `gai.conf` labels and removed the incorrect hard-coded Linux values.
- The Rule 7 example implied that adding a `2002::` address directly to an interface demonstrates 6to4 preference. I replaced that with an accurate explanation that a real SIT/6to4 tunnel is required and that the rule is about preferring native transport over tunneled paths.
- The Rule 9 example’s reported prefix-match lengths were incorrect. I fixed the comments to match the actual output of the provided Python code.
- The C debugging example compiled under default GNU settings, but it was missing the POSIX feature-test macro and socket headers needed for stricter standards-mode compilation. I added the necessary definitions/includes.

## Review Notes
- The post now accurately reflects Linux/glibc behavior, but readers should still expect platform differences. `gai.conf` is glibc-specific, and some applications implement Happy Eyeballs or other connection logic that does not simply follow the first returned address.
