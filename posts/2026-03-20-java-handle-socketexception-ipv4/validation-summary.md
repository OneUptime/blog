# Validation Summary: How to Handle SocketException for IPv4 Connections in Java

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- Java networking (`java.net`)
- TCP sockets
- IPv4 socket error handling
- Java I/O streams

## Sources Consulted
- Oracle Java SE API: `SocketException` https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/SocketException.html
- Oracle Java SE API: `ConnectException` https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ConnectException.html
- Oracle Java SE API: `NoRouteToHostException` https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/NoRouteToHostException.html
- Oracle Java SE API: `SocketTimeoutException` https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/SocketTimeoutException.html
- Oracle Java SE API: `Socket` https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Socket.html
- Oracle Java SE API: `ServerSocket` https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/ServerSocket.html
- Oracle Java SE API: `PortUnreachableException` https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/PortUnreachableException.html
- Oracle Java SE API: `PrintWriter` https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/PrintWriter.html
- Oracle networking technote: `New SocketExceptions in JDK 1.1` https://docs.oracle.com/javase/8/docs/technotes/guides/net/socketException.html

## Issues Found
- The post description and hierarchy treated `SocketTimeoutException` as part of the `SocketException` subclass chain. I corrected the wording and hierarchy because `SocketTimeoutException` extends `InterruptedIOException`, not `SocketException`.
- The hierarchy listed `PortUnreachableException` without context in a TCP-focused post. I clarified that it is datagram-specific and not used for TCP sockets.
- The client example labeled `2000 * attempt` as exponential backoff even though it was linear. I changed the retry delay to an actual exponential pattern.
- The client example conflated connect timeouts and post-connect read timeouts. I separated `Socket.connect(..., timeout)` timeout handling from `setSoTimeout()` read timeout handling so the log messages match the actual failure mode.
- Both code samples used `PrintWriter`, whose write methods suppress `IOException`. That makes write-side socket failures such as broken pipes invisible unless `checkError()` is used. I replaced `PrintWriter` with `BufferedWriter`/`OutputStreamWriter` so write failures propagate normally.
- The samples used platform-default character encodings for socket I/O. I made the encoding explicit with UTF-8 to avoid platform-dependent behavior in the examples.
- The generic `SocketException` handlers relied on parsing detail-message strings like `reset`, `broken pipe`, and `closed` for control flow. I changed the guidance and examples to treat message text as diagnostics only, because those messages are implementation- and OS-specific rather than API-stable.
- The error table described `Socket closed` as a logic bug in all cases. I corrected that to reflect that it can also happen during normal local shutdown.

## Review Notes
The examples use the standard `Socket` and `ServerSocket` APIs, so the exception-handling patterns also apply broadly beyond IPv4. Exact socket detail messages can still vary by operating system, JDK implementation, and whether the connection is interrupted, reset, or shut down cleanly.
