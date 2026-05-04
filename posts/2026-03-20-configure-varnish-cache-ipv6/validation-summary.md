# Validation Summary: How to Configure Varnish Cache with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Varnish Cache (VCL 4.1)
- IPv6 networking
- systemd unit overrides
- ip6tables / iptables-persistent
- varnishd CLI flags (`-a`, `-T`, `-S`, `-s`, `-j`, `-f`, `-F`)
- varnishstat, varnishlog
- VCL std and directors VMODs

## Sources Consulted
- Varnish std VMOD reference: https://varnish-cache.org/docs/trunk/reference/vmod_std.html
- Varnish backend / VCL reference: https://varnish-cache.org/docs/trunk/reference/vcl-backend.html
- Varnish Users Guide — Purging and banning: https://varnish-cache.org/docs/trunk/users-guide/purging.html
- varnishd(1) man page (`-a` listen address syntax)
- Debian iptables-persistent package documentation (`/etc/iptables/rules.v{4,6}`)

## Issues Found

1. **Invalid `std.ip()` usage in PURGE access control (VCL would fail to compile).**
   The original used `std.ip(client.ip, "::1")`, but `std.ip()`'s signature is `std.ip(STRING s, IP fallback, ...)` — the first argument must be a STRING, not an IP. Additionally `client.ip != "127.0.0.1"` is invalid because `client.ip` (type IP) cannot be directly compared to a STRING literal. Replaced the entire check with the canonical Varnish ACL pattern: defined an `acl purge { ... }` block at the top of the VCL and used `client.ip ~ purge` for the membership test. This matches the documented idiom in the Varnish Users Guide.

2. **`varnish.params` IPv6 listen address would produce a malformed `-a` argument.**
   `VARNISH_LISTEN_ADDRESS=::` interpolates into `-a :::80`, which varnishd cannot reliably parse. Per varnishd(1), the `-a` syntax expects `[address]:port` for IPv6. Changed to `VARNISH_LISTEN_ADDRESS=[::]` (and updated the commented-out specific-address example to `[2001:db8::1]`) so the resulting flag is `-a [::]:80`.

3. **Wrong path for iptables-persistent IPv6 rules.**
   `sudo ip6tables-save > /etc/ip6tables/rules.v6` referenced a non-existent directory. The Debian/Ubuntu iptables-persistent package stores both v4 and v6 rules under `/etc/iptables/`. Changed the redirect target to `/etc/iptables/rules.v6`.

## Review Notes

- The bare IPv6 address in `.host = "2001:db8::10";` (no brackets) is correct VCL — brackets would be a compile error since `.port` is a separate field.
- `varnish.params` is a legacy distro-specific mechanism (RHEL/CentOS); on modern Varnish 6+ packages it has been removed in favor of editing the systemd unit's `ExecStart`. The post acknowledges both approaches, so this is fine for older deployments.
- The IPv6-detection regex `^[0-9a-fA-F:]+$` against `X-Forwarded-For` is clearly illustrative — it will not match IPv4-mapped IPv6 (`::ffff:1.2.3.4`) or XFF chains containing multiple addresses. Acceptable as an example but real deployments should inspect `client.ip` directly via an ACL of IPv6 ranges.
- `set resp.http.X-Cache-Hits = obj.hits;` relies on Varnish's implicit INT→STRING coercion for header assignment, which is supported.
- The `2001:db8::/32` ACL entry is intentionally broad for the example; production deployments should narrow this to the actual management subnet.
