# Validation Summary: How to Create IPv6 Sockets in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- IPv6
- TCP sockets
- UDP sockets
- `java.net` (`InetAddress`, `Inet6Address`, `Socket`, `ServerSocket`, `DatagramSocket`, `DatagramPacket`, `NetworkInterface`)
- Java NIO (`ServerSocketChannel`, `SocketChannel`, `Selector`, `SelectionKey`)

## Sources Consulted
- Oracle Java SE 24 Networking Properties: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- Oracle Java SE 24 `Socket` API: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/Socket.html
- Oracle Java SE 24 `DatagramSocket` API: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/DatagramSocket.html
- Oracle Java SE 22 `DatagramPacket` API: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/net/DatagramPacket.html
- Oracle Java SE 24 `NetworkInterface` API: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/NetworkInterface.html
- Oracle Java SE 24 `ServerSocketChannel` API: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/nio/channels/ServerSocketChannel.html
- Oracle Java Networking IPv6 User Guide: https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/

## Issues Found
- The description said the post covered "asynchronous" IPv6 networking, but the NIO example uses selector-based non-blocking I/O rather than `AsynchronousSocketChannel` APIs. I changed the description to say "non-blocking" so it matches the code shown.
- The UDP server reused the same `DatagramPacket` for repeated receives without resetting its receive length. Per the `DatagramSocket.receive` and `DatagramPacket.setLength` documentation, that can cause later larger datagrams to be truncated to the prior packet length. I added `packet.setLength(buf.length);` after each iteration.
- The runtime check example called `System.setProperty("java.net.preferIPv6Addresses", "true")` inside `main`, but Oracle documents `java.net.preferIPv4Stack` and `java.net.preferIPv6Addresses` as properties checked only once at JVM startup. I removed that line and added a startup-only note in the system property section.
- The conclusion said binding to `InetAddress.getByName("::")` is required for IPv6 and described `java.net.preferIPv6Addresses` too broadly. I reworded it to say binding to `::` is an explicit IPv6 wildcard bind choice, and that the property affects address-family preference when hostnames resolve to both IPv4 and IPv6, at JVM startup.

## Review Notes
- The examples are otherwise consistent with current Java networking APIs and use non-deprecated constructors and classes for the behaviors shown.
- On dual-stack systems, binding to `::` may still accept IPv4 connections unless the platform/socket configuration enforces IPv6-only behavior; the Oracle IPv6 guide notes that Java does not expose an API to request IPv6-only accept behavior for classic sockets.
- Local compile/runtime verification was not possible in this workspace because `java` and `javac` are not installed.
