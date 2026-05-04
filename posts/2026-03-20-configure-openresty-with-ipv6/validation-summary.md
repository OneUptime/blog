# Validation Summary: How to Configure OpenResty with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenResty (Nginx + LuaJIT bundle)
- Nginx core (`listen`, `upstream`, `proxy_pass`, `log_format`)
- Lua / LuaJIT (string patterns, `gmatch`, `match`, `find`)
- `lua-resty-redis` (`set_timeouts`, `connect`, `incr`, `expire`)
- `lua-cjson`
- IPv6 addressing (RFC 4291), /48 prefix concept, IPv4-mapped-IPv6 (`::ffff:0:0/96`)
- APT package management on Ubuntu/Debian
- `curl -6`, `wrk` for testing

## Sources Consulted
- OpenResty Linux packages installation guide — https://openresty.org/en/linux-packages.html
- `lua-resty-redis` README — https://github.com/openresty/lua-resty-redis
- Nginx `ngx_http_core_module` (listen, ipv6only, upstream) — https://nginx.org/en/docs/http/ngx_http_core_module.html
- Lua 5.1 Reference Manual (`string.find`, patterns) — https://www.lua.org/manual/5.1/manual.html
- RFC 4291 — IP Version 6 Addressing Architecture (hextet/prefix definitions)
- RFC 5952 — A Recommendation for IPv6 Address Text Representation (canonical "::" rules)
- `apt-key(8)` deprecation notes (Debian 11+/Ubuntu 21.04+)

## Issues Found
1. **Comment said "/48 prefix (first 6 groups)" — factually wrong.** A /48 IPv6 prefix is 48 bits = 3 hextets (each hextet is 16 bits). The actual `table.concat(parts, ":", 1, 3)` already takes only the first 3 groups, so the comment contradicted the code. Updated the comment to "first 3 hextets".
2. **Rate-limiting `/48` extraction was buggy for compressed IPv6 addresses.** The code split with `gmatch("[^:]+")`, which silently skips empty groups produced by `::` compression. For an address like `2001:db8::1`, it would yield `{"2001","db8","1"}` and produce a "/48 key" of `2001:db8:1` instead of the correct `2001:db8:0`, mis-bucketing requests. Replaced the splitting logic with an explicit `::` expansion (handles `2001:db8::1`, `::1`, `1::`, and `::` correctly) before indexing the first 3 hextets.
3. **`apt-key add` is officially deprecated** (removed/scheduled for removal in Ubuntu 22.04+ / Debian 12+) and is no longer the OpenResty-recommended install path. Replaced the install snippet with the modern `gpg --dearmor` + `signed-by=` keyring approach matching the current OpenResty official docs.

## Review Notes
- The `listen [::]:80;` directive correctly listens on IPv6 only because Nginx defaults `ipv6only=on` since 1.3.4; the post correctly pairs it with a separate `listen 80;` for IPv4. No change needed.
- `red:set_timeouts(1000, 1000, 1000)` is the correct API in `lua-resty-redis` for connect/send/read timeouts (added in v0.28). Confirmed against the upstream README.
- The IPv4-mapped-IPv6 pattern `^::ffff:(%d+%.%d+%.%d+%.%d+)$` is fine for the canonical text form; it won't catch the alternative mixed-form `::ffff:c000:0280` (hex form of `192.0.2.128`), but that form is rarely emitted by `$remote_addr`. Acceptable simplification for an example.
- `proxy_set_header X-Forwarded-For $remote_addr;` overwrites any incoming XFF rather than appending. This is intentional behind a trust boundary, but `$proxy_add_x_forwarded_for` is the more common idiom when chaining proxies. Not technically wrong — left as-is.
- The 2001:db8::/32 documentation prefix (RFC 3849) is used throughout for examples — appropriate.
- `wrk` and `curl -6` flags are correct.
