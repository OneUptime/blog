# Validation Summary: How to Configure PowerDNS Recursor with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- PowerDNS Recursor (pdns-recursor)
- IPv6
- DNSSEC validation
- Lua scripting (preresolve hook)
- `dig` and `rec_control` CLI tools
- systemd service management

## Sources Consulted
- PowerDNS Recursor Settings reference: https://docs.powerdns.com/recursor/settings.html
- PowerDNS Recursor `pdns_recursor(1)` man page: https://doc.powerdns.com/recursor/manpages/pdns_recursor.1.html
- PowerDNS Recursor Lua scripting reference (DNSQuestion / DNSName / ComboAddress methods)
- RFC 1918 (private address space) and RFC 4291 (IPv6 addressing) for general IPv6/private-network correctness checks

## Issues Found
1. **Step 2 — mismatched comment for `serve-rfc1918`.** The original post labelled `serve-rfc1918=yes` with the comment "Prefetch expiring records", which is incorrect — `serve-rfc1918` controls whether the recursor serves RFC 1918 reverse zones locally and is unrelated to prefetching. Fixed by correcting the comment and adding the actual prefetching setting `refresh-on-ttl-perc=10` separately.
2. **Step 3 — IPv6 forward-zone targets needed bracket syntax for clarity/parser safety.** Bare IPv6 addresses inside `forward-zones`/`forward-zones-recurse` are technically accepted only when no port is given, and the `;` separator combined with `:` in IPv6 makes it ambiguous. Wrapped IPv6 destinations in `[...]` per the syntax shown in the official docs (`forward-zones=...=[2001:db8::1]`).
3. **Step 6 — wrong CLI flag for config validation.** `pdns_recursor --config-check` does not exist. The recursor uses `pdns_recursor --config=check` (added in 4.8.0). Fixed and noted the version requirement.
4. **Rate Limiting section — invented settings.** `max-qps-ip`, `max-qps`, and `throttle-ip-enable` are not PowerDNS Recursor settings (they don't appear in the recursor settings reference; the recursor has no built-in per-IP QPS knob). Replaced the section with real recursor settings — `max-tcp-clients`, `max-tcp-per-client`, `max-udp-queries-per-round`, `max-mthreads` — and added a note that per-IP QPS limiting is done via Lua or an upstream firewall/eBPF layer. Renamed the section to "Connection and Query Limits" and updated the conclusion to match.

## Review Notes
- Lua snippet in Step 5 is valid for current pdns-recursor: `dq.remoteaddr:isIPv6()`, `dq.remoteaddr:toString()`, `dq.qname:toString()`, `dq.qname:equal(...)`, `dq.rcode = pdns.REFUSED`, and `pdnslog(...)` are all real APIs. `lua-dns-script` is the correct setting name to load it.
- `dnssec=validate` is a valid value (others: `off`, `process-no-validate`, `process`, `log-fail`, `validate`).
- `local-address` accepts comma-separated IPv4/IPv6 mixes as shown.
- `allow-from` example mixes IPv4 RFC1918 ranges with IPv6 `2001:db8::/32` (documentation prefix per RFC 3849) and `fe80::/10` (link-local). Allowing link-local from a recursor over the wire is unusual but not wrong syntactically; left unchanged because the post is illustrative.
- The post does not pin a specific recursor version; `refresh-on-ttl-perc` was added in 4.5 and `--config=check` in 4.8 — both are present in any currently supported release, but readers on very old distro packages may need to upgrade.
