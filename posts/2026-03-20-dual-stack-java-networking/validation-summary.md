# Validation Summary: How to Build Dual-Stack Applications in Java

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- IPv4
- IPv6
- Dual-stack TCP sockets
- Happy Eyeballs
- Java `HttpClient`
- Linux IPv6 socket behavior

## Sources Consulted
- Oracle Java SE `Inet6Address` API docs: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/Inet6Address.html
- Oracle Java SE `InetAddress` API docs: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/InetAddress.html
- Oracle Java networking properties docs: https://docs.oracle.com/en/java/javase/16/core/networking-properties.html
- Oracle Java SE `HttpClient` API docs: https://docs.oracle.com/en/java/javase/24/docs/api/java.net.http/java/net/http/HttpClient.html
- Oracle Java SE `URI` API docs: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/URI.html
- RFC 8305, Happy Eyeballs Version 2: https://datatracker.ietf.org/doc/html/rfc8305
- Linux `ipv6(7)` manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- RFC 2732, Format for Literal IPv6 Addresses in URLs: https://www.rfc-editor.org/rfc/rfc2732

## Issues Found
- The server example incorrectly tried to detect IPv4-mapped IPv6 client addresses. I removed that logic and updated the explanation because Oracle's `Inet6Address` documentation states that Java does not return IPv4-mapped addresses to application code; it converts them to IPv4 addresses.
- The Happy Eyeballs section described RFC 8305 behavior, but the original code was sequential IPv6-then-IPv4 failover. I replaced it with a simplified staggered race that starts IPv4 after 250 ms instead of waiting for IPv6 to fail, and I adjusted the prose to describe it accurately as a Happy Eyeballs-style implementation.
- The runtime detection section was actually probing reachability to two specific public DNS servers over TCP port 53, which is not the same as detecting which IP family a Java connection is using. I replaced it with runtime detection based on whether the connected socket's remote `InetAddress` is an `Inet4Address` or `Inet6Address`.
- The HTTP client example used the documentation-only IPv6 prefix `2001:db8::/32` as the live request target and overstated the implementation detail as "system DNS". I changed the sample to a hostname-based request and kept the accurate note that IPv6 literals in URIs must be bracketed.
- The conclusion repeated the IPv4-mapped-address claim and simplified JVM address preference too aggressively. I updated it to match Java's actual `InetAddress` behavior and documented both `java.net.preferIPv6Addresses=true` and `java.net.preferIPv6Addresses=system`.

## Review Notes
- Dual-stack socket behavior is still platform-dependent. The `[::]` server bind example is accurate for Linux dual-stack sockets, but it depends on the OS configuration and the JVM using IPv6 sockets.
- The Happy Eyeballs sample is intentionally simplified and is not a full RFC 8305 implementation with full address interleaving, historical RTT data, or robust cancellation of in-flight connects.
- `java`/`javac` were not installed in this environment, so I could not run a local compile check. The review was completed against official documentation and RFCs.
