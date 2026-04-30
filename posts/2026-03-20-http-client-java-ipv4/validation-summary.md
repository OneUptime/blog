# Validation Summary: How to Create an HTTP Client in Java That Connects via IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- `java.net.http.HttpClient`
- `java.net.InetAddress` / `Inet4Address`
- HTTP/1.1 and HTTP/2
- `CompletableFuture`
- IPv4 / IPv6 networking
- TLS / SNI

## Sources Consulted
- Oracle Java Networking Properties: https://docs.oracle.com/en/java/javase/18/docs/api/java.base/java/net/doc-files/net-properties.html
- Oracle Networking System Properties: https://docs.oracle.com/en/java/javase/16/core/networking-properties.html
- Oracle `HttpRequest.Builder` API: https://docs.oracle.com/en/java/javase/17/docs/api/java.net.http/java/net/http/HttpRequest.Builder.html
- Oracle `java.net.http` module summary: https://docs.oracle.com/en/java/javase/26/docs/api/java.net.http/module-summary.html
- Oracle `Stream` API (`toList()`): https://docs.oracle.com/en/java/javase/16/docs/api/java.base/java/util/stream/Stream.html
- Oracle `SNIHostName` API: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/javax/net/ssl/SNIHostName.html
- Oracle JSSE Reference Guide: https://docs.oracle.com/en/java/javase/13/security/java-secure-socket-extension-jsse-reference-guide.html
- RFC 6066, TLS Extensions: https://datatracker.ietf.org/doc/html/rfc6066

## Issues Found
- The post used `System.setProperty("java.net.preferIPv4Stack", "true")` inside the examples. Oracle documents that `java.net.preferIPv4Stack` is checked only once at JVM startup, so I replaced those runtime calls with comments telling readers to launch the JVM with `-Djava.net.preferIPv4Stack=true`.
- The custom DNS example replaced an HTTPS hostname with an IP address and then set a `Host` header with the claim that it was required for SNI. In JDK `HttpClient`, `Host` is a restricted header by default, and RFC 6066 defines SNI `host_name` as a DNS hostname rather than a literal IP address. I converted that example into a plain-HTTP IPv4-resolution example and updated the HTTPS caveat.
- The async example used `Stream.toList()`, which was added in Java 16, even though the post targets Java 11+. I changed it to `collect(Collectors.toList())`.
- The async example used `URI.create(...)` without importing `java.net.URI`. I added the missing import.

## Review Notes
- Oracle's networking documentation notes that `java.net.preferIPv4Stack=true` forces IPv4-only sockets for the whole JVM and is different from the default dual-stack behavior.
- `java.net.http.HttpClient` does not expose a per-request DNS resolver in Java 11. Newer Java releases add the `InetAddressResolverProvider` SPI starting in Java 18 for system-wide resolver customization.
- The workspace did not have `javac` or `jshell` installed, so validation relied on official documentation rather than local compilation.
