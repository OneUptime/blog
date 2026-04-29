# Validation Summary: How to Use Java InetAddress and Inet6Address for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Java standard library networking APIs (`java.net.InetAddress`, `java.net.Inet6Address`, `java.net.NetworkInterface`)
- IPv6 addressing
- DNS forward and reverse lookup concepts

## Sources Consulted
- Oracle Java SE 25 `InetAddress` API docs: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/InetAddress.html
- Oracle Java SE 23 `Inet6Address` API docs: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/net/Inet6Address.html
- RFC 4193 — Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 4291 — IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3879 — Deprecating Site Local Addresses: https://www.rfc-editor.org/rfc/rfc3879.html
- RFC 3596 — DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The first example claimed `Inet6Address.getHostAddress()` would print the compressed form `2001:db8::1`. I corrected the comment to the full textual form `2001:db8:0:0:0:0:0:1`, which matches the JDK documentation for IPv6 output.
- The classifier incorrectly treated `isSiteLocalAddress()` as a detector for ULA space and labeled it `site-local (ULA)`. I changed the code so `isSiteLocalAddress()` is used only for deprecated site-local addresses, and added an explicit `fc00::/7` prefix check for unique-local addresses as defined by RFC 4193.
- The classifier could also mislabel non-IPv6 inputs because the `isSiteLocalAddress()` check ran before verifying the address family. I changed the logic to confirm `Inet6Address` first, then apply IPv6-specific classification.
- The local-interface example labeled every non-loopback, non-link-local IPv6 address as `global`. I added separate checks for deprecated site-local addresses and ULA so local IPv6 addresses are categorized correctly.
- The conclusion implied `isSiteLocalAddress()` was sufficient for IPv6 local-address classification. I updated it to explain that ULA (`fc00::/7`) and documentation (`2001:db8::/32`) ranges require prefix checks.

## Review Notes
- `InetAddress.getLoopbackAddress()` may return either `127.0.0.1` or `::1`, depending on the runtime and address preferences. The post does not assert a fixed output for that line, so no edit was required.
- `InetAddress.getByName()` remains valid for parsing IPv6 literals. On modern Java, `InetAddress.ofLiteral(String)` and `Inet6Address.ofLiteral(String)` are parse-only, non-blocking alternatives, but the existing examples are still technically correct.
- A Java runtime was not available in this workspace, so snippet behavior was validated against the official JDK API documentation and relevant RFCs rather than by executing the examples locally.
