# Validation Summary: How to Connect to IPv6 Link-Local Addresses in Code

## Status
validated

## Post Type
Tutorial / Technical Guide (multi-language code walkthrough)

## Technologies Covered
- IPv6 link-local addressing (fe80::/10)
- POSIX socket programming (`sockaddr_in6`, `sin6_scope_id`, `if_nametoindex`, `inet_pton`)
- C standard networking headers (`<sys/socket.h>`, `<netinet/in.h>`, `<arpa/inet.h>`, `<net/if.h>`)
- Python `socket` module (IPv6 4-tuple addressing) and `psutil.net_if_addrs`
- Go `net` package (`net.DialTimeout` with zone-id literals)
- iproute2 (`ip -6 addr show`)
- netcat (`nc -6`) and curl (`curl -6 --interface`)
- Linux sysfs (`/sys/class/net/<iface>/ifindex`)

## Sources Consulted
- RFC 4291 (IP Version 6 Addressing Architecture) — defines `fe80::/10` link-local prefix
- RFC 4007 (IPv6 Scoped Address Architecture) — defines scope IDs and zone-id notation `addr%zone`
- RFC 3493 (Basic Socket Interface Extensions for IPv6) — defines `sockaddr_in6` and `sin6_scope_id`
- RFC 6874 (Representing IPv6 Zone Identifiers in Address Literals and URIs) — specifies `%25` URL encoding
- Linux man page `ipv6(7)` — `sin6_scope_id` semantics for link-local
- Linux man page `if_nametoindex(3)` — returns 0 on error
- Linux man page `inet_pton(3)` — does NOT parse zone IDs; returns 1 on success
- Python docs: `socket` module — IPv6 addresses use 4-tuple `(host, port, flowinfo, scope_id)`; `socket.if_nametoindex` available since Python 3.3
- psutil docs: `psutil.net_if_addrs()` returns interface → addresses dict
- Go stdlib docs: `net` package — supports zone IDs in IPv6 literals (e.g. `[fe80::1%eth0]:80`)
- iproute2 `ip-address(8)` — `scope link` filter syntax
- curl docs — `--interface` and IPv6 zone-id URL encoding

## Issues Found
No technical issues found. All code, commands, and explanations are technically correct:

- The C code correctly strips the embedded zone ID before `inet_pton` (which does not accept zone IDs), uses `if_nametoindex()` to populate `sin6_scope_id`, and properly checks return values.
- The C `printf` format `[%s%%%s]:%d` correctly produces `[fe80::1%eth0]:8080` (`%%` → literal `%`).
- The Python code correctly uses the IPv6 4-tuple `(host, port, flowinfo, scope_id)` for `connect()`.
- The Go format string `[%s%%%s]:%s` correctly yields `[fe80::1%eth0]:8080`, which `net.DialTimeout("tcp6", ...)` accepts via its zone-id support.
- The `curl` example correctly URL-encodes `%` as `%25` per RFC 6874.
- The bash one-liners (`ip -6 addr show scope link`, `cat /sys/class/net/eth0/ifindex`) are valid on standard Linux systems.
- The error table maps each error message to a plausible cause and remediation.

## Review Notes
- The C `strncpy(clean_addr, addr_str, sizeof(clean_addr)-1)` in the no-`%` branch relies on `addr_str` being shorter than the buffer to remain null-terminated. For any valid IPv6 textual address (max ~39 chars + null) plus a `INET6_ADDRSTRLEN` (46) buffer this is safe, but defensive code would explicitly set `clean_addr[sizeof(clean_addr)-1] = '\0'`. Not a correctness bug for valid input.
- `nc -6 -l -p 8080` is the netcat-traditional syntax; netcat-openbsd accepts `nc -6 -l 8080` (without `-p`). Both are common on Linux distributions; the example will work depending on which `nc` is installed.
- `psutil.net_if_addrs()` may return link-local addresses with an embedded `%iface` zone suffix on some platforms — the `startswith('fe80')` check still matches in either case.
- The introduction states `fe80::/10` (the formally allocated prefix per RFC 4291). In practice deployments use `fe80::/64`; the article's wording is technically precise.
- None of the above warrants a content change.
