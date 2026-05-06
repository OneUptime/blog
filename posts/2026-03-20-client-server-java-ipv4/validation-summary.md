# Validation Summary: How to Implement the Client-Server Pattern with IPv4 TCP in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- IPv4
- TCP
- `ServerSocket`
- `Socket`
- `DataInputStream`
- `DataOutputStream`
- `ExecutorService`
- Java virtual threads

## Sources Consulted
- Oracle JDK `ServerSocket` API docs: https://docs.oracle.com/javase/8/docs/api/java/net/ServerSocket.html
- Oracle JDK `Socket` API docs: https://docs.oracle.com/javase/8/docs/api/java/net/Socket.html
- Oracle JDK `InetAddress` API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/InetAddress.html
- Oracle JDK `DataInputStream` API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/DataInputStream.html
- Oracle JDK `DataOutputStream` API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/DataOutputStream.html
- Oracle JDK `String` API docs: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/lang/String.html
- Oracle JDK `ExecutorService` API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html
- Oracle JDK `Executors` API docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Executors.html
- Java Language Specification, `try`-with-resources: https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.20.3

## Issues Found
- The echo client hard-coded `192.168.1.10`, which made the sample environment-specific and not self-contained for local testing. I changed it to `127.0.0.1` so it works against the server example on the same machine.
- The echo client encoded and decoded text with the platform default charset via `String.getBytes()` and `new String(byte[], int, int)`. Oracle's `String` docs say those overloads use the default charset, so I changed the sample to `StandardCharsets.UTF_8` for predictable behavior.
- The echo client assumed `InputStream.read()` would always return data. Oracle's `InputStream` contract allows `-1` at EOF, so I added an EOF check before constructing the response string.
- The framed server trusted the signed `int` returned by `DataInputStream.readInt()` as an array length. I added a negative-length check so malformed input fails with `IOException` instead of an uncaught `NegativeArraySizeException`.
- The `readFully()` comment and conclusion implied that it simply "retries until all bytes arrive". Oracle's docs are more precise: it reads until the requested bytes are read or throws `EOFException`/`IOException`. I corrected that wording.
- The pooled server's shutdown hook called `shutdown()` but did not wait for queued work to finish, even though the post claimed graceful draining. Oracle's `ExecutorService` docs say `shutdown()` does not wait and `awaitTermination()` is required, so I updated the hook to wait and fall back to `shutdownNow()`.
- The pooled server could reject a just-accepted socket during shutdown. I added `RejectedExecutionException` handling to close the socket cleanly in that case.

## Review Notes
- The examples use `try (conn)` resource-variable syntax, which requires Java 9 or later.
- `Executors.newVirtualThreadPerTaskExecutor()` is correctly described as a Java 21+ API.
- A local compile pass was not possible in this environment because `java` and `javac` are not installed.
