# Validation Summary: How to Configure Squid as an IPv6 Reverse Proxy

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Squid HTTP Cache / Reverse Proxy (accelerator mode)
- IPv6 networking
- HTTP/HTTPS proxying with TLS termination
- Cache replacement policies (LFUDA, GDSF)
- `cache_peer` parent / origin-server configuration
- `refresh_pattern` cache freshness rules
- `follow_x_forwarded_for` / `acl_uses_indirect_client`
- `request_header_add` with logformat codes
- squidclient / cache manager (`mgr:info`)
- Squid native access.log format and awk parsing

## Sources Consulted
- Squid 5/6 configuration manual: http://www.squid-cache.org/Doc/config/
  - `http_port`, `https_port`, `cache_peer`, `cache_peer_access`
  - `dns_v4_first` (default off — Squid uses AAAA first)
  - `cache_replacement_policy`, `memory_replacement_policy`
  - `refresh_pattern`, `cache_dir`, `cache_mem`, `maximum_object_size`
  - `request_header_add`, `forwarded_for`, `follow_x_forwarded_for`, `acl_uses_indirect_client`
- Squid logformat codes reference: http://www.squid-cache.org/Doc/config/logformat/ (`%>a` is the canonical client source-IP code; `%[src]` is not a defined token)
- RFC 3513 / RFC 4291 — IPv6 Addressing Architecture (hex digits 0-9 / a-f only)
- RFC 3849 — `2001:db8::/32` documentation prefix
- Squid native access.log field reference (field 4 is `code/status`, e.g. `TCP_HIT/200`)

## Issues Found

1. **Invalid IPv6 addresses in `cache_peer` directives.** The post used literal addresses like `2001:db8::backend`, `2001:db8::backend1`, `2001:db8::backend2`, `2001:db8::backend3`, and `2001:db8::backup`. IPv6 address fields only accept hex digits (`0-9`, `a-f`); the words "backend", "backup" contain `k`, `n`, `p`, `u` which are not valid hex characters. Squid would reject these at startup. Replaced with valid documentation-prefix addresses (`2001:db8::1`, `2001:db8::2`, `2001:db8::3`, `2001:db8::ff`).

2. **Invalid Squid logformat code `%[src]`.** `request_header_add X-Forwarded-For %[src] all` used a non-existent format token. Squid logformat uses tokens like `%>a` for the client's source IP (works for both IPv4 and IPv6). Replaced with `"%>a"` (quoted, since `>` can confuse some shells/parsers when copy-pasting and Squid accepts quoted values for `request_header_add`).

3. **Buggy hit-ratio awk pipeline.** The original `awk '$4 ~ /TCP_HIT|TCP_MISS/ {hits[$4]++}'` keyed the associative array on the full field (e.g. `TCP_HIT/200`, `TCP_MISS/304`), so the `END` block's `hits["TCP_HIT"]` and `hits["TCP_MISS"]` lookups always evaluated to empty and the printed ratio would always be `nan` or never print. Rewrote to split `$4` on `/` and key off the prefix (`TCP_HIT`, `TCP_MISS`), which produces a correct ratio.

## Review Notes
- `forwarded_for on` is set in two separate snippets (cache config and headers section). With `forwarded_for on`, Squid already appends/sets `X-Forwarded-For` automatically; the explicit `request_header_add X-Forwarded-For "%>a" all` will result in two `X-Forwarded-For` headers being sent to the backend. This isn't strictly an error (HTTP allows duplicate headers and most backends concatenate them), and the post explicitly intends to demonstrate `request_header_add`, so this was left alone.
- `dns_v4_first off` is the Squid default — explicit setting matches the comment ("Prefer IPv6") in effect because off means AAAA records are used before A records. Correct as written.
- `cache_dir ufs /var/spool/squid 20000 16 256` is valid; note that `ufs` works but newer deployments often prefer `aufs` or `rock` storage for performance — left as-is since `ufs` is universally supported and the post is illustrative.
- `squidclient -h ::1 mgr:info` works on most builds, but on some packagings the cachemgr requires explicit `cache_mgr` ACLs and a manager password; that operational detail is out of scope for the post.
- The `refresh_pattern` for `^gopher:` is legacy but still valid syntax — not removed since it's part of the conventional Squid example set and harmless.
