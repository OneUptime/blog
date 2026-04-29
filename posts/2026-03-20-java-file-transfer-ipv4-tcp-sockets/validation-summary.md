# Validation Summary: How to Transfer Files over IPv4 TCP Sockets in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Java TCP sockets (`java.net.ServerSocket`, `java.net.Socket`)
- IPv4 address resolution (`java.net.InetAddress`, `java.net.Inet4Address`)
- Java binary I/O streams (`DataInputStream`, `DataOutputStream`, `BufferedInputStream`, `BufferedOutputStream`)
- Java NIO file APIs (`java.nio.file.Files`, `java.nio.file.Path`, `java.nio.file.Paths`)

## Sources Consulted
- Oracle Java API docs: `ServerSocket` - https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ServerSocket.html
- Oracle Java API docs: `Socket` - https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/Socket.html
- Oracle Java API docs: `InetAddress` - https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/InetAddress.html
- Oracle Java API docs: `DataInputStream` - https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/DataInputStream.html
- Oracle Java API docs: `DataOutputStream` - https://docs.oracle.com/javase/8/docs/api/java/io/DataOutputStream.html
- Oracle Java API docs: `InputStream` - https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/io/InputStream.html
- Oracle Java API docs: `Files` - https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/nio/file/Files.html
- Oracle JDK docs: `javac` command - https://docs.oracle.com/en/java/javase/17/docs/specs/man/javac.html
- Oracle JDK docs: `java` command - https://docs.oracle.com/en/java/javase/24/docs/specs/man/java.html

## Issues Found
- The client comment said `InetAddress.getByName(serverIp)` would "Force IPv4 connection", but Oracle's `InetAddress` docs show `getByName` resolves a host name to an IP address without guaranteeing that the chosen address is IPv4. I changed the client to resolve all addresses and select an `Inet4Address`, throwing `UnknownHostException` if no IPv4 address is available.
- The progress-reporting math could divide by zero for empty files. On the server, `fileSize / 20` becomes `0` for very small or empty files; on both sides, percentage calculation would also fail for a zero-byte transfer. I added guards so zero-byte files transfer cleanly without arithmetic errors.
- The server could previously save and acknowledge a truncated transfer as if it were complete because `InputStream.read(...)` returns `-1` at end-of-stream rather than automatically enforcing the declared file length. I added a file-size validation check, explicit EOF detection when fewer than `fileSize` bytes arrive, and cleanup of the partial file before the handler reports failure.
- The protocol description described the string fields as generic UTF strings and implied the server returns an error string. Oracle's `DataOutputStream.writeUTF`/`DataInputStream.readUTF` use Java's modified UTF-8 format, and the sample server only guarantees an acknowledgment on success. I corrected the protocol block and conclusion to match the actual API behavior.

## Review Notes
- The sample could not be compiled locally in this environment because `javac` was not installed, so validation was completed through code inspection and Oracle documentation review.
- `writeUTF` is appropriate for Java-to-Java filename headers here, but it uses Java-specific modified UTF-8 framing rather than a language-neutral text encoding.
