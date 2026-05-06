# Validation Summary: How to Build IPv6 Network Tools in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- IPv6
- DNS
- TCP sockets
- `ExecutorService`
- CLI network tools
- Reverse DNS
- CIDR subnet calculations

## Sources Consulted
- Oracle JDK `InetAddress` API docs: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/InetAddress.html
- Oracle JDK `Socket` API docs: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/Socket.html
- Oracle JDK `InetSocketAddress` API docs: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/InetSocketAddress.html
- Oracle JDK `BigInteger` API docs: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/math/BigInteger.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596

## Issues Found
- The `reverseLookup()` helper returned `NXDOMAIN` on `UnknownHostException`, but Oracle’s `InetAddress.getCanonicalHostName()` documentation says a failed reverse lookup returns the textual IP address, not `NXDOMAIN`. I changed the code to detect the no-PTR case explicitly and return `No PTR record found`, while invalid input now returns `Invalid IPv6 address`.
- The `buildPTRName()` helper assumed the parsed address was always 16 bytes long. Passing a non-IPv6 value could produce incorrect behavior or an indexing failure. I added an explicit `Inet6Address` check before building the `ip6.arpa` nibble-reversed name.
- The subnet calculator did not validate CIDR shape, prefix length, or address family. Inputs outside `address/prefix`, prefixes outside `0-128`, or non-IPv6 addresses could fail incorrectly. I added those validations.
- The subnet calculator used `BigInteger.TWO`, which Oracle documents as available since Java 9. Because the post does not declare a minimum Java version, I replaced it with `BigInteger.ONE.shiftLeft(...)`, which is equivalent for powers of two and avoids that hidden version dependency.

## Review Notes
- `InetAddress.isReachable()` is a best-effort reachability probe, not a guaranteed ICMP-only ping. Oracle documents that it may use ICMP when permitted or fall back to a TCP connection on port 7, so results can vary by platform, privileges, and firewall policy.
- A local compile pass was not possible in this environment because `java` and `javac` are not installed.
