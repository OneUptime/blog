# Validation Summary: How to Configure Nginx Access Control for IPv6 Subnets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (ngx_http_access_module, ngx_http_geo_module)
- IPv6 addressing and CIDR notation
- IPv6 Unique Local Addresses (ULA, fc00::/7)
- IPv6 documentation prefix (2001:db8::/32, RFC 3849)
- curl (IPv6 testing)

## Sources Consulted
- Nginx ngx_http_access_module docs: https://nginx.org/en/docs/http/ngx_http_access_module.html
- Nginx ngx_http_geo_module docs: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Nginx listen directive docs (ipv6only): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation)
- RFC 4193 (Unique Local IPv6 Unicast Addresses, fc00::/7 / fd00::/8)
- RFC 4291 (IP Version 6 Addressing Architecture) — IPv6 hex grouping rules
- curl manual page (--interface, -4, -6 flags): https://curl.se/docs/manpage.html

## Issues Found
The original post used several "semantic" IPv6 address strings that contained non-hexadecimal characters. IPv6 address fields may only contain `0-9` and `a-f` (RFC 4291), and Nginx parses addresses strictly via `inet_pton`, so each of these would have caused `nginx -t` to fail with an "invalid parameter" error if a reader pasted the config verbatim. Each was replaced with a syntactically valid address from the `2001:db8::/32` documentation prefix (RFC 3849) or the `fd00::/8` ULA range (RFC 4193) while preserving the intent of the example:

- `2001:db8:trusted::/48` → `2001:db8:abcd::/48` (contained `t`, `r`, `s` — invalid hex). Fixed in the Basic Allow/Deny example and the Summary paragraph.
- `2001:db8:corporate::/48` → `2001:db8:cafe::/48` (contained `r`, `p`, `t`).
- `2001:db8:branch::/48` → `2001:db8:beef::/48` (contained `r`, `n`, `h`).
- `fd00:corp::/32` → `fd12:3456::/32` (contained `o`, `r`, `p`; `fd12:3456::/32` is a valid hypothetical ULA prefix and avoids overlapping with the `fd00::/8` example used later in the geo block).
- `2001:db8:malicious::/48` → `2001:db8:dead::/48` (contained `m`, `l`, `i`, `o`, `u`, `s`).
- `2001:db8:mgmt::/64` → `2001:db8:1234::/64` (contained `m`, `g`, `t`).
- `2001:db8:internal::/48` → `2001:db8:f00d::/48` (contained `i`, `n`, `t`, `r`).
- `[2001:db8::backend]:3000` → `[2001:db8::1]:3000` (contained `k`, `n`). Fixed in two locations (Per-Location Access Control and Using geo Module).

## Review Notes
- `2001:db8::bad:ac70` is intentionally left unchanged — every character is valid hex (`b`, `a`, `d`, `c`, `7`, `0`), so this address is syntactically valid and serves as a realistic "blocked" example.
- The dual-stack listener pattern (`listen [::]:80 ipv6only=on;` paired with `listen 80;`) is correct. With `ipv6only=on` set, the IPv4-mapped fallback is disabled and the explicit IPv4 listener is required.
- The `geo` directive accepts both IPv4 and IPv6 prefixes directly (no bracket notation needed), as shown — this is per the ngx_http_geo_module documentation.
- The use of `if` inside `location` is generally discouraged (the "if is evil" guidance from Nginx), but it is functional and the `=` comparison operator shown is correct syntax. A purer approach would chain another `geo` map with `return 403`, but the current example is technically valid.
- `curl --interface <ipv6-addr>` accepts either an interface name or an IP address as the bind source, so the testing snippets are correct (assuming the target host is actually configured with those source addresses).
- `fd00::/8` is the locally-assigned half of the formal ULA range `fc00::/7` — using `fd00::/8` in the geo example is acceptable shorthand for "all locally-assigned ULAs."
- `grep -v '200'` in the access-log tail is a coarse filter (it would also drop any line containing the literal substring `200`, e.g. response sizes or timestamps), but it is technically valid as a quick "show non-200" sketch and was left as-is.
