# Validation Summary: How to Log IPv6 Addresses in GraphQL Access Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- GraphQL
- IPv6
- Node.js
- Python
- Uvicorn
- DNS
- `curl`
- UFW
- `ip6tables`

## Sources Consulted
- Node.js `net` API docs: https://nodejs.org/api/net.html
- Node.js `http` API docs: https://nodejs.org/api/http.html
- Uvicorn settings docs: https://www.uvicorn.org/settings/
- curl man page: https://curl.se/docs/manpage.html
- `ip(8)` man page from iproute2: https://man7.org/linux/man-pages/man8/ip.8.html
- `ping6(8)` history in iputils / Debian manpage: https://manpages.debian.org/trixie/iputils-ping/ping6.8.en.html
- UFW man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3596, DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596.html

## Issues Found
- The prerequisite check used `ping6 -c 3 ::1`. Current `iputils` documentation states that the standalone `ping6` binary was merged into `ping`, so I changed the example to `ping -6 -c 3 ::1`.
- The UFW example implied that `sudo ufw allow 4000/tcp` is sufficient for IPv6 by itself. Ubuntu's `ufw` documentation notes that IPv6 firewalling works only when IPv6 is enabled in `/etc/default/ufw`, so I added that prerequisite to the text.
- No further technical issues were found after these corrections.

## Review Notes
- The guide is Linux-oriented: `ip`, UFW, and `ip6tables` are Linux-specific tools.
- Node.js documents that binding to the unspecified IPv6 address `::` can also result in dual-stack listening on many operating systems, so IPv4-mapped addresses such as `::ffff:192.168.1.1` can still appear in logs.
- In reverse-proxy deployments, logging the original client IP may also require framework-specific trusted proxy-header configuration.
