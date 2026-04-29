# Validation Summary: How to Use Java NIO Channels for IPv4 Socket Programming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Java NIO
- `ServerSocketChannel`
- `SocketChannel`
- `Selector`
- `ByteBuffer`
- IPv4
- TCP sockets

## Sources Consulted
- Oracle Java SE 26 API documentation: `java.nio.channels.SelectableChannel` https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/nio/channels/SelectableChannel.html
- Oracle Java SE 24 API documentation: `java.nio.channels.ServerSocketChannel` https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/nio/channels/ServerSocketChannel.html
- Oracle Java SE 22 API documentation: `java.nio.channels.SocketChannel` https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/nio/channels/SocketChannel.html
- Oracle Java SE 24 API documentation: `java.nio.channels.NetworkChannel` https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/nio/channels/NetworkChannel.html
- Oracle Java SE 25 API documentation: `java.net.StandardSocketOptions` https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/StandardSocketOptions.html
- Oracle Java Core Libraries Developer Guide: NIO non-blocking server example https://docs.oracle.com/en/java/javase/18/core/java-core-libraries-developer-guide.pdf

## Issues Found
- The introduction expanded NIO as "Non-blocking I/O" and stated that each `java.net` connection needs its own thread. I corrected this to "New I/O" and narrowed the threading claim to the common blocking-I/O model.
- The server example performed a single non-blocking `write()` after each read. Oracle documents that non-blocking selectable channels may write fewer bytes than requested or none at all, so the original echo path could truncate responses. I changed the example to switch interest to `OP_WRITE` and finish sending the attached buffer before returning to `OP_READ`.
- The server example reused one shared `ByteBuffer` for all clients and did not guard against `accept()` returning `null` in non-blocking mode. I changed it to attach a buffer per client registration and added the `null` check.
- The server example set `SO_REUSEADDR` after `bind()`. I moved the option assignment before `bind()` so the snippet reflects the usual documented socket-option setup order.
- The client example used blocking mode but still followed the non-blocking `connect()` / `finishConnect()` pattern. I simplified it to a blocking `connect()` call and changed the send/receive logic to loop until the request is fully written and the echoed line is fully read.
- The buffer helper methods were written as if they were generic channel helpers, but on non-blocking channels those loops can spin because reads and writes may make no progress. I clarified that the helpers are for blocking channels.
- The socket-options snippet called `accept()` on an unbound `ServerSocketChannel`, which Oracle documents will throw `NotYetBoundException`. I added `bind()` before `accept()`.
- The socket-options snippet assumed `SO_REUSEPORT` support unconditionally. `NetworkChannel.setOption()` may throw `UnsupportedOperationException` when an option is not supported, and `ServerSocketChannel` does not guarantee `SO_REUSEPORT`, so I guarded it with `supportedOptions()`.

## Review Notes
- The workspace did not have `java` or `javac` installed, so I could not run a local compile or runtime test. The review was validated against current Oracle API documentation instead.
- The client example decodes a newline-terminated ASCII message and is correct for the shown example. For arbitrary chunked UTF-8 text in production, a `CharsetDecoder` would be more robust than decoding each buffer independently.
