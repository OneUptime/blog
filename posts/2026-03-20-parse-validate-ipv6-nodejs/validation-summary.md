# Validation Summary: How to Parse and Validate IPv6 Addresses in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js (tested against v22.22.0)
- Node.js `net` module (`net.isIPv6`)
- WHATWG URL API (`new URL`)
- BigInt arithmetic for 128-bit address math
- Express.js middleware

## Sources Consulted
- Node.js `net` module docs: https://nodejs.org/api/net.html (`net.isIPv6`, `net.isIP`)
- WHATWG URL Standard, host serializer: https://url.spec.whatwg.org/#host-serializing
- Node.js URL docs: https://nodejs.org/api/url.html (WHATWG URL)
- RFC 4291 (IPv6 addressing architecture) - link-local `fe80::/10`, ULA `fc00::/7`, global unicast `2000::/3`
- RFC 4007 (zone identifiers, `%zone_id` suffix)
- RFC 4193 (Unique Local IPv6 Unicast Addresses)
- Live verification with `node -e` against Node.js v22.22.0

## Issues Found
1. **Zone ID claim was wrong.** The post claimed `net.isIPv6('fe80::1%eth0')` returns `false`. In current Node.js (verified on v22.22.0) `net.isIPv6` accepts the `%zone_id` suffix and returns `true`. Updated the inline comment in the Basic Validation section and rewrote the corresponding sentence in the Conclusion to say zone IDs are accepted (and that stripping is now a normalization choice, not a validation requirement).
2. **`url.hostname` brackets claim was wrong.** The URL parsing example commented `host: url.hostname,  // Without brackets`, but per the WHATWG URL host serializer, `url.hostname` for an IPv6 host returns the address *with* the surrounding brackets (verified: `new URL('tcp://[2001:db8::1]:8080').hostname` → `'[2001:db8::1]'`). Fixed the example to strip the brackets via `url.hostname.replace(/^\[|\]$/g, '')` and updated the comment. Also added a note in the Conclusion that `url.hostname` keeps the brackets.

## Review Notes
- The CIDR membership logic using `(ipBig & ~mask) === (netBig & ~mask)` is mathematically correct: JavaScript BigInt bitwise ops use infinite-precision two's-complement, so `~mask` zeroes the low `128 - prefixLen` bits of a positive 128-bit value as intended. Verified for `2001:db8::1` ∈ `2001:db8::/32` (true) and `2001:db9::1` ∉ `2001:db8::/32` (false).
- The type-specific validators (`isGlobalUnicast` for `2000::/3`, `isLinkLocal` for `fe80::/10`, `isULA` for `fc00::/7`) compute the masks correctly and were verified against representative addresses including `fd00::1` (ULA) and `2001:4860::1` (global).
- The Express middleware still does the right thing — stripping zone IDs is reasonable for storage normalization even though it is no longer required for `net.isIPv6` to accept the address.
- `expandIPv6` does not handle IPv4-mapped addresses like `::ffff:192.168.1.1` (the embedded IPv4 dotted-quad would not be split into two hex groups). This is not exercised in the post's examples and was not introduced by the review, so left as-is, but a future revision could call this out as a known limitation of the simple expander.
