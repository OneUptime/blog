# Validation Summary: How to Use IPv6 with Java ServerSocket

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Java
- Java networking (`java.net`)
- Java NIO (`java.nio.channels`)
- IPv6
- IPv4/IPv6 dual-stack TCP servers

## Sources Consulted
- Oracle Java SE 25 API, `ServerSocket`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/ServerSocket.html
- Oracle Java SE 25 API, `ServerSocketChannel`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/channels/ServerSocketChannel.html
- Oracle Java SE 25 API, `Inet6Address`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Inet6Address.html
- Oracle Java SE 25 Networking Properties: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/doc-files/net-properties.html
- Oracle Networking IPv6 User Guide: https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/
- RFC 3493, "Basic Socket Interface Extensions for IPv6": https://www.rfc-editor.org/rfc/rfc3493
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The post claimed Java can force IPv6-only wildcard server sockets by setting `IPV6_V6ONLY` from `ServerSocketChannel`, and the example used `StandardSocketOptions.IP_MULTICAST_IF` as if it were related. That is incorrect. Current Java SE does not expose `IPV6_V6ONLY` for `ServerSocket` or `ServerSocketChannel`. I replaced the section with a correct portable approach: bind to a specific IPv6 address instead of `::` when you need an IPv6-only endpoint in pure Java.
- The post claimed dual-stack IPv4 clients are presented to Java code as IPv4-mapped IPv6 addresses and included manual unwrapping logic. Oracle's `Inet6Address` documentation says Java will never return an IPv4-mapped address and converts mapped input to an IPv4 address. I replaced that section with the correct behavior and a small example showing `::ffff:192.168.1.1` becoming an `Inet4Address`.
- The conclusion repeated both incorrect claims above. I updated it to reflect actual Java behavior for dual-stack wildcard binds and client address normalization.
- The NIO section could be read as if binding `ServerSocketChannel` to `::` changes dual-stack behavior. I added a clarifying sentence that the same dual-stack caveat applies there too.

## Review Notes
- The basic `ServerSocket` example is valid, but its dual-stack behavior depends on the platform and the JVM's IPv4/IPv6 networking settings such as `java.net.preferIPv4Stack`.
- Java tooling was not installed in the workspace, so local compile/run verification was not possible. Validation was completed against Oracle API documentation and RFCs.
