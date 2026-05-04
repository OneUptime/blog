# Validation Summary: How to Configure tinyproxy for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- tinyproxy (lightweight HTTP/HTTPS proxy)
- IPv6 networking
- systemd (service management)
- curl (testing)
- Linux access control via Allow directives

## Sources Consulted
- tinyproxy.conf(5) man page (Debian): https://manpages.debian.org/testing/tinyproxy/tinyproxy.conf.5.en.html
- tinyproxy upstream project: https://tinyproxy.github.io/
- tinyproxy GitHub repository (configuration template): https://github.com/tinyproxy/tinyproxy/blob/master/etc/tinyproxy.conf.in
- tinyproxy issue tracker (for IPv6-related behaviors): https://github.com/tinyproxy/tinyproxy/issues/256

## Issues Found
1. **Invalid directive `BindIPv6`** — The post used `BindIPv6 ::` and `# BindIPv6 2001:db8::proxy`, but tinyproxy has no `BindIPv6` directive. The correct directive for choosing which interface/address tinyproxy accepts incoming connections on is `Listen`, which already supports IPv6 addresses (including `::` for all IPv6 interfaces). Replaced both occurrences with `Listen`. Also updated the conclusion which referenced `BindIPv6`.
2. **Missing bracket notation for IPv6 in `Upstream`** — Per the tinyproxy.conf(5) man page, IPv6 addresses in the `Upstream` directive must be enclosed in square brackets to disambiguate the address from the port. Changed `Upstream http 2001:db8::squid:3128` and similar to `Upstream http [2001:db8::1]:3128` form.
3. **Invalid IPv6 placeholder addresses** — The post used non-hex tokens such as `2001:db8::proxy`, `2001:db8::squid:3128`, `2001:db8::corporate-proxy:8080`, and `[2001:db8::proxy]:8888`. IPv6 addresses only allow hex digits 0–9 and a–f, so these are not parseable. Replaced with valid documentation-range placeholders (`2001:db8::1`, `2001:db8::2`).
4. **`Upstream none` example used IPv4 CIDR** — The original `# Upstream none 192.168.0.0/16` is not aligned with how tinyproxy's `upstream none` is typically used (matching a domain pattern), and the example was IPv4 in an IPv6-focused post. Replaced with `# Upstream none ".example.com"` which matches the documented `upstream none "domain"` form.

## Review Notes
- `Listen ::` listens on all IPv6 interfaces; on most Linux kernels this also accepts IPv4 connections via IPv4-mapped IPv6 addresses unless `net.ipv6.bindv6only` is set. If the user wants strict IPv6-only behavior, they should ensure that sysctl is set (or rely on the kernel default, which is off on most distros).
- The `Allow` directive correctly accepts IPv6 addresses and CIDR ranges (`::1`, `2001:db8::/32`, `fe80::/10`).
- The `Anonymous` directive is a header allow-list (not a block-list): when present, only the listed headers are passed through. The example with `Authorization`, `Host`, `Accept` is syntactically valid; users should be aware that this is restrictive by design.
- `Allow fe80::/10` for link-local is included for completeness; in practice link-local traffic only works between hosts on the same L2 segment.
- The `nginx` code-fence highlighter is used for tinyproxy config; it isn't a perfect match but renders reasonably and is a common stylistic choice — left as is.
