# Validation Summary: How to Set Socket Options for IPv4 Connections in Java

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- `java.net.Socket`
- `java.net.ServerSocket`
- IPv4
- TCP socket options

## Sources Consulted
- Oracle Java SE 25 API documentation: `java.net.Socket` https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Socket.html
- Oracle Java SE 25 API documentation: `java.net.ServerSocket` https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/ServerSocket.html
- RFC 1122: Requirements for Internet Hosts - Communication Layers https://www.rfc-editor.org/rfc/rfc1122
- RFC 1349: Type of Service in the Internet Protocol Suite https://datatracker.ietf.org/doc/html/rfc1349

## Issues Found
- The `SO_REUSEADDR` description was too broad. I changed it to match the JDK documentation: it enables rebinding when a previous connection is in `TIME_WAIT`, rather than generically “allowing port reuse after close.”
- The client example said some options needed an established connection. I corrected that comment because the referenced options in the snippet do not require that, while `SO_TIMEOUT` specifically affects blocking reads.
- The client-side `SO_REUSEADDR` comment implied it was generally useful for reconnects. I narrowed it to the documented case where you bind a specific local address/port and need to rebind while a prior connection is still in `TIME_WAIT`.
- The `IP_TOS` example lacked an important caveat from the JDK docs. I added that `setTrafficClass()` is treated as a hint and may be ignored or capped by the platform.
- The bandwidth-delay-product example used incorrect math. I corrected `100 Mbit/s * 10 ms` from `128 KB` to approximately `125,000 bytes (~122 KiB)` and marked the buffer sizes as hints.

## Review Notes
- The examples use current, non-deprecated `java.net.Socket` and `java.net.ServerSocket` APIs.
- `setReceiveBufferSize()` and `setSendBufferSize()` are hints; the actual values can differ by platform and should be verified with `getReceiveBufferSize()` / `getSendBufferSize()` if needed.
- `setTrafficClass()` is platform dependent and may not change the TOS field on every system, especially after a TCP connection is already established.
- No JDK was installed in the workspace, so syntax validation was done against the current Oracle API documentation rather than by local compilation.
