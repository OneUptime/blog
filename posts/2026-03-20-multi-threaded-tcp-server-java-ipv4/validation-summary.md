# Validation Summary: How to Build a Multi-Threaded TCP Server in Java for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java (SE 8+ for the first example, Java 21+ for virtual threads)
- `java.net.ServerSocket` / `java.net.Socket` (IPv4 TCP)
- `java.util.concurrent.ExecutorService` and `Executors`
- Virtual threads (`Executors.newVirtualThreadPerTaskExecutor()`, JEP 444 / Java 21)
- `java.util.concurrent.atomic` (`AtomicBoolean`, `AtomicInteger`)
- Try-with-resources (Java 7+, with the existing-variable form from Java 9+)

## Sources Consulted
- Java SE 21 API documentation: `ServerSocket` — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/ServerSocket.html
- Java SE 21 API documentation: `Socket` — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/Socket.html
- Java SE 21 API documentation: `Executors` — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Executors.html
- Java SE 21 API documentation: `ExecutorService` (now `AutoCloseable` since Java 19) — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html
- Java SE 21 API documentation: `SocketTimeoutException`, `SocketException`, `InterruptedIOException`
- JEP 444: Virtual Threads — https://openjdk.org/jeps/444

## Issues Found
1. **`setReuseAddress(true)` called after the `ServerSocket` was already bound** (both code blocks). The Oracle `ServerSocket` Javadoc explicitly states: *"The behaviour when SO_REUSEADDR is enabled or disabled after a socket is bound (See isBound()) is not defined."* The original code used the binding constructors `new ServerSocket(port, 100, addr)` and `new ServerSocket(9000)` and then called `setReuseAddress(true)` afterward, which is documented undefined behavior. Fixed both blocks to use the no-arg `new ServerSocket()` constructor, set the SO_REUSEADDR option while unbound, and then explicitly bind via `serverSocket.bind(new InetSocketAddress(...), backlog)` — the canonical pattern. `java.net.*` is already imported in both blocks, so no additional imports are required.

## Review Notes
- Catch ordering (`SocketTimeoutException` → `SocketException` → `IOException`) is valid: the first two are siblings (both ultimately extend `IOException`), and both correctly precede the `IOException` catch.
- `Socket` implements `Closeable`/`AutoCloseable`, so the try-with-resources block (using the Java 9+ existing-variable form) is correct. `ExecutorService` has been `AutoCloseable` since Java 19, so `try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor())` is valid in Java 21+.
- Minor code-quality observations (not fixed because they are not technical errors):
  - The local variable `String addr = socket.getRemoteSocketAddress().toString();` in `handleClient` is unused.
  - `connId` is derived from `activeConnections.incrementAndGet()`, which is the active-connection count rather than a monotonically increasing unique id — IDs may repeat across the server's lifetime as connections close and reopen. The name `activeConnections` makes the semantics consistent, but a reader might expect Client #N to be a unique identifier.
  - `socket.setSoTimeout(60_000)` is called inside the try-with-resources block after the streams are constructed; this still works because the timeout applies to subsequent reads on the underlying socket, but conventionally it is set before reading begins.
- Version claims are accurate: Java 21 (LTS) was released September 19, 2023, and virtual threads became a permanent feature in that release.
