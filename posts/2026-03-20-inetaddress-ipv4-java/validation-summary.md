# Validation Summary: How to Use InetAddress to Work with IPv4 Addresses in Java

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- `java.net.InetAddress`
- `java.net.Inet4Address`
- DNS
- IPv4 networking
- `java.nio.ByteBuffer`

## Sources Consulted
- Oracle Java SE 25 Javadoc: `InetAddress` - https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/InetAddress.html
- Oracle Java SE 25 Javadoc: `Inet4Address` - https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Inet4Address.html
- Oracle Java SE 25 Javadoc: `ByteBuffer` - https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/ByteBuffer.html
- Oracle Java SE 25 Javadoc: `Integer` - https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Integer.html
- RFC 1918: Address Allocation for Private Internets - https://www.rfc-editor.org/rfc/rfc1918

## Issues Found
- The original IPv4 validation example used `InetAddress.getByName()` plus `instanceof Inet4Address`, which can resolve hostnames rather than strictly validating IPv4 literals. I changed it to `Inet4Address.ofLiteral()` and noted that this API is available in Java 22+.
- Three snippets were not valid standalone Java examples because they used top-level statements outside a class. I wrapped the octet, reverse-DNS, and numeric-conversion snippets in small example classes with `main` methods.
- The `IpClassifier.classify` example did not compile because `InetAddress.isReachable(int)` throws `IOException`, but the method only declared `UnknownHostException`. I updated the import and method signature to `throws IOException`.
- The reverse-DNS example implied a fixed PTR result by hard-coding `dns.google` in a comment. I changed the comment to reflect that reverse lookup results depend on DNS and resolver configuration.
- The multicast comment used `224.x.x.x`, which is incomplete. I corrected it to the full IPv4 multicast range `224.0.0.0/4`.
- The integer-conversion example used a signed `int`, which can display negative values for valid IPv4 addresses such as `192.168.1.1`. I changed the section to use an unsigned `long` via `Integer.toUnsignedLong(...)` and updated the reverse conversion accordingly.

## Review Notes
- `Inet4Address.ofLiteral()` is a current, non-deprecated API, but it is only available starting in Java 22.
- In the other literal-IP examples, `InetAddress.getByName()` remains acceptable because the Javadoc specifies that when a literal IP string is supplied, only the address format is checked.
- `isReachable(...)` is a best-effort check and may return `false` because ICMP or TCP Echo traffic is blocked, even when a host is otherwise reachable.
- A local Java runtime was not installed in this workspace on April 30, 2026, so this review was documentation-based rather than execution-based.
