# Validation Summary: How to Troubleshoot HAProxy DNS Resolution Defaulting to IPv6 Instead of IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- DNS
- IPv4
- IPv6
- Linux name resolution (`getent`, `getaddrinfo`, `gai.conf`)
- `curl`
- `systemd`

## Sources Consulted
- HAProxy DNS resolution tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/dns-resolution/
- HAProxy Configuration Manual (latest), including `dns-accept-family`: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy Configuration Manual 1.6r1, confirming historical support for `resolve-prefer`: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/1-6r1/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/
- Linux `getent(1)` manual: https://man7.org/linux/man-pages/man1/getent.1.html
- Linux `getaddrinfo(3)` manual: https://man7.org/linux/man-pages/man3/getaddrinfo.3.html
- Linux `gai.conf(5)` manual: https://man7.org/linux/man-pages/man5/gai.conf.5.html

## Issues Found
- The post said HAProxy's `resolvers` section supports a `prefer-family` directive. I corrected this to the documented behavior: use a `resolvers` section for DNS lookups and set `resolve-prefer ipv4` on each `server` line.
- The HAProxy config snippet used `resolve-retries 3`. I corrected it to `resolve_retries 3`, which matches HAProxy's documented directive name.
- The post claimed `resolve-prefer ipv4` was available in HAProxy 2.4+. I removed that version claim because HAProxy documentation shows `resolve-prefer` existed as far back as HAProxy 1.6.
- The diagnostic command used `getent hosts`, which does not use `getaddrinfo()` for keyed lookups. I changed it to `getent ahosts` so the command more accurately reflects address-family resolution behavior relevant to IPv4 versus IPv6 troubleshooting.
- The `socat` examples used a bare socket path. I changed them to `unix-connect:/var/run/haproxy/admin.sock` to match HAProxy Runtime API examples more explicitly.
- The `/etc/gai.conf` section overstated the fix as if it applied directly to HAProxy's internal `resolvers` DNS engine. I narrowed the text to libc-based resolution and added the important caveat that adding a `precedence` rule overrides the default precedence table.
- The symptoms section referred to IPv4-mapped IPv6 output as if it were a typical HAProxy runtime symptom. I replaced that with the more defensible symptom that HAProxy runtime output shows an IPv6 address for an IPv4-only backend.

## Review Notes
- HAProxy 3.2 and newer add the global `dns-accept-family` directive, which can strictly limit runtime DNS lookups to IPv4 or IPv6. The post remains technically correct after the fixes because `resolve-prefer ipv4` is still valid for the dual-stack case it describes.
