# Validation Summary: How to Handle IPv6 Addresses in Java Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- IPv6
- `java.net.InetAddress`
- `java.net.Inet6Address`
- `java.net.ServerSocket`
- `java.net.Socket`
- `java.net.http.HttpClient`
- URI/URL formatting

## Sources Consulted
- Oracle Java SE 24 `InetAddress` Javadoc: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/InetAddress.html
- Oracle Java SE 24 networking properties docs: https://docs.oracle.com/en/java/javase/24/core/java-networking.html
- Oracle Networking IPv6 User Guide: https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/index.html
- Oracle JDK 5 IPv6 User Guide historical note on J2SE 1.4 IPv6 support: https://docs.oracle.com/javase/7/docs/technotes/guides/net/ipv6_guide/
- RFC 2732, Format for Literal IPv6 Addresses in URLs: https://www.rfc-editor.org/rfc/rfc2732.html
- RFC 6874, Representing IPv6 Zone Identifiers in Address Literals and Uniform Resource Identifiers: https://www.rfc-editor.org/rfc/rfc6874.html
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193.html

## Issues Found
- The introduction and description overstated IPv6 behavior by implying generic dual-stack configuration and platform-independent early support. I corrected the wording to match Oracle's documentation: IPv6 support has existed in `java.net` since J2SE 1.4, but effective support depends on the OS, and Java uses IPv6 sockets on IPv6-capable systems.
- The IPv6 validator stripped zone IDs before parsing, which could incorrectly accept invalid scoped forms such as global addresses with a scope suffix, and it could blur the distinction between hostname resolution and literal validation. I changed the example so it validates IPv6 literals, handles bracketed literals, preserves scoped-address semantics, and only permits zone IDs on scoped IPv6 addresses.
- The `Inet6Address` example computed `Is global` with incomplete negative checks. That logic could misclassify non-global addresses such as unique local addresses. I replaced it with `isAnyLocalAddress()`, which is a real Java API check and avoids implying Java has a built-in global-unicast test when it does not.
- The server and client socket examples leaked resources. I updated both examples to use try-with-resources for accepted sockets and the client stream handling.
- The client example used `2001:db8::1`, which is a documentation prefix and did not line up with the local server example. I changed the client example to `::1` so the paired socket examples can work together on a local machine.
- The JVM property section incorrectly said `java.net.preferIPv6Addresses` prefers the IPv6 stack and suggested changing it with `System.setProperty(...)`. I corrected the explanation to name-resolution preference and noted that Oracle documents this property as being read once at JVM startup.
- The URL-formatting helper did not encode scoped zone identifiers for URI use. I updated it to encode `%` as `%25` for IPv6 scoped literals per RFC 6874 while keeping bracket formatting per RFC 2732.

## Review Notes
- The HTTP client example is syntactically correct, but it still requires a reachable HTTP service at the target IPv6 address to run successfully.
- `2001:db8::/32` is the documentation prefix, so its continued use in non-connection examples is appropriate.
- `ipv6.google.com` resolved to AAAA records during review, but hostname-resolution examples remain environment-dependent.
- `java` and `javac` are not installed in this workspace, so the review was completed through documentation/RFC verification and local non-Java checks rather than compilation.
