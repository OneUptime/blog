# Validation Summary: How to Configure Squid as an IPv6 Forward Proxy

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Squid (HTTP forward proxy)
- IPv6 networking
- Squid ACLs (`acl src`, `acl dst`, `http_access`)
- Squid SSL Bumping (`ssl_bump`, `https_port`)
- curl (with IPv6 proxy)
- Python `requests` library (proxy configuration)
- `squidclient` cache manager
- Public IPv6 DNS resolvers (Google `2001:4860:4860::8888`, Cloudflare `2606:4700:4700::1111`)

## Sources Consulted
- Squid configuration manual (`http_port`, `https_port`, `dns_v4_first`, `dns_nameservers`, `acl`, `http_access`, `ssl_bump`, `cache_dir`): http://www.squid-cache.org/Doc/config/
- RFC 4291 — IP Version 6 Addressing Architecture (valid hex characters in IPv6 addresses)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- RFC 4193 — Unique Local IPv6 Unicast Addresses (`fc00::/7`, `fd00::/8`)
- RFC 4291 — Link-local prefix (`fe80::/10`) and loopback (`::1/128`)
- curl manual — `--proxy` flag, IPv6 proxy URL bracket syntax
- Python `requests` documentation — `proxies` parameter
- Google Public DNS over IPv6: `2001:4860:4860::8888`
- Cloudflare Public DNS over IPv6: `2606:4700:4700::1111`
- Squid `squidclient` man page

## Issues Found
1. **Invalid hex in IPv6 address `2001:db8:internal::/48`** (line 33). The token `internal` is not a valid IPv6 hex group (only `0-9` and `a-f` are permitted per RFC 4291). Squid would refuse this ACL at parse time. Replaced with `2001:db8:1::/48`, which uses the documentation prefix from RFC 3849.
2. **Invalid hex in IPv6 address `2001:db8:blocked::/48`** (line 55). Same issue — `blocked` is not valid hex. Replaced with `2001:db8:dead::/48` (valid hex within the documentation prefix).
3. **Invalid hex in IPv6 proxy address `[2001:db8::proxy]`** (lines 71, 74, 75, 79, 85, 86). The token `proxy` is not valid hex. curl, Python `requests`, and most clients would error out parsing this URL. Replaced all occurrences with `[2001:db8::1]`.

## Review Notes
- `dns_v4_first off` is in fact the default in modern Squid; setting it explicitly does not change behavior, but the comment that it "prefers IPv6" is consistent with Squid's documented default behavior of contacting IPv6 first when both A and AAAA records exist.
- `fd00::/8` is the locally-assigned half of the ULA range `fc00::/7`; both are commonly used to refer to ULA in practice.
- The SSL bumping example uses both `ssl_bump stare all` and `ssl_bump bump all`. Squid evaluates `ssl_bump` rules first-match-wins, so in this configuration `stare` will always match before `bump` — the `bump` line is effectively unreachable. This is a common pattern used to peek before deciding, but the post does not elaborate. Left as-is since it is technically valid syntax.
- The `acl CONNECT method CONNECT` line is already pre-defined in Squid's stock `squid.conf`; redefining it is harmless but redundant.
- `squidclient -h ::1 mgr:info` works in current Squid releases; the `-h` flag accepts a bare IPv6 literal without brackets.
