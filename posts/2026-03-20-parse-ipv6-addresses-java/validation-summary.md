# Validation Summary: How to Parse IPv6 Addresses in Java

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java (java.net.InetAddress, Inet6Address, Inet4Address)
- java.net.URI and java.net.URL
- java.net.InetSocketAddress
- java.util.regex (Pattern, Matcher)
- IPv6 addressing (RFC 4291) and bracketed URI form (RFC 2732 / RFC 3986)

## Sources Consulted
- [Java InetAddress (JDK 21) Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/InetAddress.html)
- [Java Inet6Address (JDK 17) Javadoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/Inet6Address.html)
- [Java URI (JDK 21) Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/URI.html)
- [Java URL (JDK 21) Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/URL.html)
- [Java InetSocketAddress (JDK 21) Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/InetSocketAddress.html)
- [RFC 2732 — Format for Literal IPv6 Addresses in URLs](https://www.rfc-editor.org/rfc/rfc2732)
- [RFC 4291 — IP Version 6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291)
- [RFC 8200 — IPv6 header layout](https://www.rfc-editor.org/rfc/rfc8200)
- Apache Harmony issue HARMONY-60 confirming `URL.getHost()` returns IPv6 with brackets

## Issues Found

1. **Regex in "Extracting IPv6 Addresses from Log Lines" did not match the most common compressed form `prefix::suffix`.** The four alternatives only covered (a) the full eight-segment form, (b) `prefix::` (trailing `::`), (c) leading-colon `::suffix` variants, and (d) `::suffix`. None matched a string like `2001:db8::42` end-to-end — the engine would match `2001:db8::` via `(?:[0-9a-fA-F]{1,4}:){1,7}:` and stop, leaving `42` behind. The example output in the post (`2001:db8::42` and `2001:db8::1` from the log line) would not be produced. **Fix:** added a new alternative `(?:[0-9a-fA-F]{1,4}:)+:(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}` placed before the `prefix::` alternative so that the longer `prefix::suffix` form wins; collapsed the redundant `::1|::` tail to `::` since `::1` is already covered by the `::suffix` alternative.

2. **Inline comments claimed `URI.getHost()` / `URL.getHost()` strip brackets for IPv6.** Both methods preserve the `[...]` form per RFC 2732 (verified against the JDK Javadoc and longstanding bug history). The code still works because `InetAddress.getByName(...)` and `InetSocketAddress(String, int)` both accept the bracketed literal form, but the comments were misleading. **Fix:** changed the two `// Returns address without brackets` comments to `// For IPv6, includes the surrounding brackets`.

3. **Conclusion claimed `InetAddress.getByName()` "accepts ... IPv4-mapped addresses" without qualification.** In Java, IPv4-mapped IPv6 input (e.g. `::ffff:192.168.1.1`) is parsed but returned as an `Inet4Address`, so it does not pass an `instanceof Inet6Address` check — exactly the failure mode demonstrated by the test case in the first code block. **Fix:** added a sentence to the conclusion noting that IPv4-mapped addresses are converted to `Inet4Address` and therefore fail the `Inet6Address` check.

## Review Notes
- The `IPv6Parser` test case `"::ffff:192.168.1.1"` intentionally exercises Java's IPv4-mapped conversion — it falls into the `IllegalArgumentException` branch and prints `ERROR: Not an IPv6 address`. With the conclusion now clarified, this is informative rather than confusing, so the test case is left in place.
- The packet-bytes example correctly uses `InetAddress.getByAddress(byte[16])`, which returns an `Inet6Address` (16-byte form), and the source/destination offsets (8–23 / 24–39) match the IPv6 header layout in RFC 8200.
- The simplified log regex is still a superset filter — it can match strings that are not legal IPv6 (e.g. too many segments) and relies on the post-`InetAddress.getByName` validation step to discard them. This is intentional and called out in the post's conclusion. For stricter extraction, a fully RFC-4291-aware grammar (or Guava's `InetAddresses.forString`) would be preferable.
- `URI.getHost()` returning the bracketed form means callers that pass the result to APIs other than `InetAddress`/`InetSocketAddress` (e.g. third-party HTTP clients that don't follow RFC 2732) may need to strip the brackets manually. Not a defect in this post, just a future-improvement note.
