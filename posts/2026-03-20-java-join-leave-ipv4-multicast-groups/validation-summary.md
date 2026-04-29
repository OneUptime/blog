# Validation Summary: How to Join and Leave IPv4 Multicast Groups in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- IPv4 multicast
- UDP
- `java.net.MulticastSocket`
- `java.net.DatagramPacket`
- `java.net.NetworkInterface`
- IGMP

## Sources Consulted
- Oracle Java SE 25 API, `java.net.MulticastSocket`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/MulticastSocket.html
- Oracle Java SE 25 API, `java.net.DatagramPacket`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/DatagramPacket.html
- Oracle Java SE 25 API, `java.net.NetworkInterface`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/NetworkInterface.html
- RFC 2236, Internet Group Management Protocol, Version 2: https://www.rfc-editor.org/rfc/rfc2236
- RFC 3376, Internet Group Management Protocol, Version 3: https://datatracker.ietf.org/doc/rfc3376/

## Issues Found
- Deprecated multicast group APIs in the single-group, multi-group, and shutdown-hook examples: the post used `MulticastSocket.joinGroup(InetAddress)` and `leaveGroup(InetAddress)`, which are deprecated since Java 14. Replaced them with `joinGroup(SocketAddress, NetworkInterface)` and `leaveGroup(SocketAddress, NetworkInterface)`, and updated the examples to select or provide a `NetworkInterface`.
- Incorrect IGMP explanation in the introduction: the post described an "IGMP Join" and a guaranteed "IGMP Leave" on exit. Updated the wording to reflect current protocol behavior more accurately: hosts typically send membership reports when joining, and leaving may produce an IGMPv2 Leave or an IGMPv3 state-change report.
- Ambiguous receive output in the multiple-groups example: `DatagramPacket.getAddress()` returns the remote sender address, not the multicast group that matched. Updated the output to label the value as the sender address and port.
- Undefined symbol and outdated API in the shutdown-hook snippet: `PORT` was not defined in that code block, and the snippet used the deprecated join/leave methods. Added a concrete `port` variable and updated the snippet to use the current multicast membership APIs.
- Incorrect version note in the interface-specific example: the comment said the `InetSocketAddress` + `NetworkInterface` join method was a "Java 7+" API. Removed that claim because the current Oracle docs list `joinGroup(SocketAddress, NetworkInterface)` as available since Java 1.4.

## Review Notes
- `MulticastSocket` is still valid for IPv4 multicast, but the current Oracle API notes recommend considering `DatagramChannel` and `MulticastChannel` for newer multicast code, especially when source-specific multicast is relevant.
- In `joinGroup(SocketAddress, NetworkInterface)`, the `InetSocketAddress` port value is ignored for group membership; the socket's bound UDP port controls which multicast datagrams are received.
- Local compile/runtime verification was not possible in this workspace because `java` and `javac` are not installed, so validation was performed against the current Oracle JDK API documentation and multicast RFCs.
