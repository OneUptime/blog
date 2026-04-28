# Validation Summary: How to Implement Non-Blocking IPv4 Sockets in Java with Selectors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java NIO (`java.nio.channels`)
- `Selector`, `SelectionKey`
- `ServerSocketChannel`, `SocketChannel`
- `ByteBuffer`
- `StandardSocketOptions` (SO_REUSEADDR, TCP_NODELAY)
- `InetSocketAddress`

## Sources Consulted
- Java SE Selector API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/Selector.html
- Java SE SelectionKey API docs (constant values for OP_READ=1, OP_WRITE=4, OP_CONNECT=8, OP_ACCEPT=16): https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/SelectionKey.html
- Java SE ServerSocketChannel API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/ServerSocketChannel.html
- Java SE SocketChannel API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/SocketChannel.html
- Java SE StandardSocketOptions docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/StandardSocketOptions.html

## Issues Found
- **SO_REUSEADDR set after bind()**: The original code called `serverChannel.bind(...)` before `serverChannel.setOption(StandardSocketOptions.SO_REUSEADDR, true)`. SO_REUSEADDR must be set before binding for it to have its intended effect on TIME_WAIT-blocked addresses; setting it afterward is silently ineffective. Reordered the two lines so the option is set prior to `bind()`.

## Review Notes
- All `SelectionKey` interest-op constant values in the table (`OP_READ=1`, `OP_WRITE=4`, `OP_CONNECT=8`, `OP_ACCEPT=16`) match the JDK API documentation.
- The `Selector`, `SelectionKey`, `ServerSocketChannel`, `SocketChannel`, and `ByteBuffer` API usage is current and not deprecated as of Java 21.
- The `clientKey` local variable assigned in `handleAccept` is unused — this produces a compiler warning but is harmless. Left intact to preserve the author's style.
- The non-blocking client busy-loops on `finishConnect()` and `read(...) == 0` with `Thread.sleep(10)`. This works for an example but in production a `Selector` would be preferable. The post itself notes the tradeoff in the conclusion.
- `ArrayDeque` implements `Queue`, so the unchecked cast in the read/write handlers is consistent with the attachment registered in `handleAccept`.
