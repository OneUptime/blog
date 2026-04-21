# Validation Summary: How to Build a TCP Client in Java Using java.net.Socket for IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- TCP client networking
- IPv4 addressing
- `java.net.Socket`
- `java.net.InetAddress` and `java.net.Inet4Address`
- Java stream I/O with `BufferedReader`, `PrintWriter`, `DataInputStream`, and `DataOutputStream`

## Sources Consulted
- Oracle Java SE 25 API documentation for `java.net.Socket`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Socket.html
- Oracle Java SE 25 API documentation for `java.net.InetAddress`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/InetAddress.html
- Oracle Java SE 25 API documentation for `java.net.Inet4Address`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Inet4Address.html
- Oracle Java SE 25 API documentation for `java.io.DataInput` and `java.io.DataInputStream`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/DataInput.html and https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/DataInputStream.html
- Oracle Java SE 25 API documentation for `java.io.DataOutputStream`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/DataOutputStream.html
- Oracle Java SE 25 API documentation for `java.io.PrintWriter`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/PrintWriter.html
- Java Language Specification, Java SE 25, section 7.3 Compilation Units: https://docs.oracle.com/javase/specs/jls/se25/html/jls-7.html#jls-7.3
- IANA-managed reserved example domains: https://www.iana.org/domains/reserved

## Issues Found
- The IPv4 helper code block used a top-level helper method and top-level usage statements instead of a complete Java source shape. I wrapped the helper and usage in an `IPv4TcpClient` class with a `main` method so the example is syntactically valid Java.
- The IPv4 example used `api.example.com`, which is not a reliable reserved documentation host. I changed it to `example.com`, an IANA-managed example domain.
- The reusable wrapper code block ended with a top-level `try` statement. I wrapped that usage in a `TcpClientWrapperExample.main` method so the example is syntactically valid Java.

## Review Notes
- The core networking claims are accurate: `Socket.connect(SocketAddress, int)` provides connection timeout control, `setSoTimeout(int)` controls blocking read timeout behavior, and closing a `Socket` closes its associated input and output streams.
- The IPv4 filtering approach using `InetAddress.getAllByName()` and `addr instanceof Inet4Address` is valid.
- The binary framing examples correctly use `DataOutputStream.writeInt()` for a four-byte big-endian length prefix and `DataInputStream.readFully()` to read the expected byte count.
- The text example relies on default character encoding through `InputStreamReader` and `PrintWriter`; for production protocols, specifying a charset explicitly would be preferable.
- The length-prefixed examples assume a trusted, protocol-compliant peer. Production clients should validate response lengths before allocating buffers.
