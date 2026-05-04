# Validation Summary: How to Convert Between IPv4 and IPv6-Mapped Addresses

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv4 / IPv6 networking
- IPv4-mapped IPv6 addresses (`::ffff:0:0/96`, RFC 4291)
- Python `ipaddress` standard library module
- Go `net` and `net/netip` packages
- JavaScript string/regex manipulation
- Dual-stack socket handling

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (IPv4-mapped prefix `::ffff:0:0/96`)
- Python `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html (`IPv6Address.ipv4_mapped`, `IPv6Address.__str__`)
- Go `net.IP.String()` documentation: https://pkg.go.dev/net#IP.String
- Go `net/netip` package documentation: https://pkg.go.dev/net/netip (`ParseAddr`, `AddrFrom16`, `Is4`, `Is4In6`, `Unmap`, `As16`)
- Verified Python behavior locally with `python3` (Python 3.x `ipaddress` module)

## Issues Found

1. **Python output comment incorrect (line 39 of original).** The post claimed `print(ipv4_to_mapped("192.168.1.100"))` would print `::ffff:192.168.1.100`. In reality, `str(ipaddress.IPv6Address("::ffff:192.168.1.100"))` returns the compressed hexadecimal form `::ffff:c0a8:164`. The second example (`10.0.0.1` → `::ffff:a00:1`) was already in hex form, so the post was internally inconsistent. **Fix:** changed `ipv4_to_mapped` to construct the dotted-quad string directly with `f"::ffff:{v4}"`, and updated the second example's expected output to `::ffff:10.0.0.1`. Added a short note explaining why `str(IPv6Address(...))` does not preserve the dotted form. Also tightened the `ipv4_mapped` truthiness check to an explicit `is not None` for clarity (works the same way today, but more idiomatic and matches the docs which describe it as `None` when not mapped).

2. **Go example produced wrong output (lines 61–63, 79 of original).** The post built a 16-byte `net.IP` containing the IPv4-mapped form and called `mapped.String()`, claiming it would print `::ffff:192.168.1.100`. Per the official Go docs for `net.IP.String()`: "dotted decimal ('192.0.2.1'), if ip is an IPv4 or IP4-in-IPv6 address" — meaning the `String()` method actively unmaps IPv4-in-IPv6 addresses and returns plain `192.168.1.100`. This is a well-known limitation of `net.IP`. **Fix:** rewrote the Go example to use `net/netip` (Go 1.18+), which preserves the 4-in-6 form via `netip.AddrFrom16(addr.As16()).String()` and provides explicit `Is4In6()` / `Unmap()` for the reverse direction. Added a sentence above the snippet explaining why `net.IP.String()` is unsuitable for this task, and updated the conclusion accordingly.

3. **JavaScript first `ipv4ToMapped` function was broken (lines 88–96 of original).** The function mixed hex/decimal parsing and string concatenation in a way that produced nonsense output (e.g. `::ffff:49320.1.192.168.1.100` for `192.168.1.100`). It looked like leftover scratch code — there was even a stray `// simpler form:` comment inside the return expression and a `.replace(/^/, '')` no-op. The post itself then defined a "cleaner version" `toMapped` immediately below. **Fix:** removed the broken function entirely and kept only the working `toMapped` / `fromMapped` pair, which produces correct output. Added a one-line lead-in describing the JS approach and an extra example showing `fromMapped` returning `null` for a non-mapped address.

4. **Unused `socket` import in dual-stack section (line 113 of original).** The `import socket, ipaddress` statement imported `socket` but never used it. **Fix:** removed `socket` from the import line.

## Review Notes

- The IPv4-mapped IPv6 prefix `::ffff:0:0/96` and the example expansion `0000:0000:0000:0000:0000:ffff:c0a8:0164` are correct per RFC 4291.
- The Python `mapped_to_ipv4` function, after the fix, still returns `None` for `0.0.0.0` if anyone tried to use truthy-checks instead of `is not None`. With `IPv4Address('0.0.0.0')` the object itself is truthy, so the original `if v6.ipv4_mapped:` would have worked, but the explicit `is not None` is safer and more readable.
- The Go fix uses `net/netip`, which requires Go 1.18+. This is now the recommended IP-address API in modern Go and is more correct (and more efficient) than `net.IP` for this kind of address-classification work.
- The JavaScript regex approach is intentionally simple and does not validate octet ranges (it would accept `::ffff:999.999.999.999`). For production code that needs strict validation, a library such as `ipaddr.js` would be more appropriate, but that's outside the scope of the corrections requested here.
- The dual-stack normalization snippet correctly handles the common case where a server binds an IPv6 socket with `IPV6_V6ONLY=0` and receives IPv4 connections rendered as `::ffff:x.x.x.x`.
