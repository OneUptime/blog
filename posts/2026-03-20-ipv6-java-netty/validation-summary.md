# Validation Summary: How to Use IPv6 with Java Netty

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- IPv6
- Netty
- Netty NIO transport
- Netty HTTP codec
- TCP networking

## Sources Consulted
- Netty `StringDecoder` API reference: https://netty.io/4.1/api/io/netty/handler/codec/string/StringDecoder.html
- Netty `StringEncoder` API reference: https://netty.io/4.1/api/io/netty/handler/codec/string/StringEncoder.html
- Netty `SimpleChannelInboundHandler` API reference: https://netty.io/4.1/api/io/netty/channel/SimpleChannelInboundHandler.html
- Java SE 24 networking properties: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- Java IPv6 user guide: https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/
- Java `InetAddress` API reference: https://docs.oracle.com/javase/9/docs/api/java/net/InetAddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/rfc3849/
- Netty 4.1.107.Final release notes: https://netty.io/news/2024/02/13/4-1-107-Final.html
- Maven Central listing for `io.netty:netty-all:4.1.107.Final`: https://repo1.maven.org/maven2/io/netty/netty-all/4.1.107.Final/

## Issues Found
- The TCP server and client used `StringDecoder` and `StringEncoder` directly on a TCP stream without a framing decoder. Netty's documentation explicitly requires a proper `ByteToMessageDecoder` such as `LineBasedFrameDecoder` for stream transports, so I added `LineBasedFrameDecoder(8192)` and explicit UTF-8 charset configuration to both examples.
- The TCP client used `2001:db8::1` as its live destination address. RFC 3849 reserves `2001:db8::/32` for documentation, so I changed the runnable example to `::1` and updated the comment to reflect that it connects to the local IPv6 server.
- The TCP client waited on `closeFuture()` even though the sample server never closed the connection, which would leave the example hanging after the echo. I updated the client handler to close the channel after receiving the response.
- `IPv6AwareHandler` extended `SimpleChannelInboundHandler<Object>` and wrote `msg` back out directly. Netty documents that `SimpleChannelInboundHandler` auto-releases handled messages by default, so I changed the write to `ReferenceCountUtil.retain(msg)` to keep the example safe for reference-counted payloads.
- The HTTP server example did not shut down its event loop groups. I wrapped the bootstrap in `try/finally` and added `shutdownGracefully()` calls so the example terminates cleanly.
- The conclusion incorrectly implied that `InetSocketAddress("::", port)` is appropriate for both `bind()` and `connect()`, and it attributed dual-stack behavior specifically to Linux. I corrected the text to distinguish wildcard bind from remote connect and tied dual-stack acceptance to Java's IPv6 socket behavior (`java.net.preferIPv4Stack=false`) instead of a Linux-only claim.

## Review Notes
- `io.netty:netty-all:4.1.107.Final` is a real Netty release published on February 13, 2024, and the APIs used in the post are still valid in the current Netty 4.1 documentation.
