# Validation Summary: How to Understand IPv6 Address Selection (RFC 6724)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- RFC 6724 address selection
- Linux `iproute2` (`ip addrlabel`, `ip route get`)
- glibc `getaddrinfo()` and `/etc/gai.conf`
- Python `socket.getaddrinfo()`

## Sources Consulted
- RFC 6724, *Default Address Selection for Internet Protocol Version 6 (IPv6)*: https://www.rfc-editor.org/rfc/rfc6724.html
- RFC 4007, *IPv6 Scoped Address Architecture*: https://www.rfc-editor.org/rfc/rfc4007.html
- RFC 4193, *Unique Local IPv6 Unicast Addresses*: https://www.rfc-editor.org/rfc/rfc4193.html
- RFC 8981, *Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6*: https://www.rfc-editor.org/info/rfc8981
- Linux kernel `ip-sysctl` documentation (`use_tempaddr`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-addrlabel(8)` man page: https://www.man7.org/linux/man-pages/man8/ip-addrlabel.8.html
- `ip-route(8)` man page: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- Python `socket` module documentation (`getaddrinfo()`): https://docs.python.org/3/library/socket.html#socket.getaddrinfo
- `gai.conf(5)` man page: https://man.archlinux.org/man/gai.conf.5.en

## Issues Found
- The scope table used `::1` as an interface-local example. Updated it to `ff01::1` because loopback is treated as link-local, not interface-local, per RFC 4007.
- The scope explanation implied that "higher scope" is generally preferred. Reworded it to match RFC 6724's "appropriate scope" behavior.
- The Linux policy-table section incorrectly said precedence lives in `use_tempaddr` and implied `ip addrlabel` exposes the full RFC 6724 table. Corrected it to distinguish kernel address labels from userspace precedence policy (`/etc/gai.conf` on glibc systems), and noted that `use_tempaddr` controls privacy-address preference.
- The source-address-selection section omitted RFC 6724 Rule 5.5 and oversimplified rule evaluation. Added Rule 5.5 and clarified that the rules are ordered pair-wise comparisons.
- The dual-stack example hard-coded DNS results and incorrectly explained IPv4/IPv6 preference via label mismatch. Replaced it with system-dependent wording and the correct default-precedence explanation from RFC 6724.
- The ULA section said destination scope drives ULA-vs-global selection. Corrected it to note that both ULA and global unicast have global scope and that label matching is the relevant distinction; replaced the verification commands with `ip -6 route get`, which directly shows the selected `src`.
- The privacy-extension section referenced RFC 4941 as the current temporary-address spec and overspecified `use_tempaddr=2`. Updated it to RFC 8981 (which obsoletes RFC 4941) and corrected Linux `use_tempaddr` semantics to `<=0`, `1`, and `>1`.
- The conclusion said IPv6 is preferred over IPv4 because labels differ and said ULAs stay local because of scope matching. Corrected those points to default precedence and label matching/routability, respectively.

## Review Notes
- Actual `getaddrinfo()` ordering is system-specific, and real applications may also apply Happy Eyeballs connection logic after resolution.
- Linux default address-label rows vary by kernel and distribution, so showing exact `ip addrlabel list` output is brittle.
