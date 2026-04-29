# Validation Summary: How to Configure java.net.preferIPv6Addresses

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Java
- JVM networking system properties
- IPv4 / IPv6 networking
- DNS / hostname resolution with `InetAddress`
- Spring Boot configuration

## Sources Consulted
- Oracle Java Networking Properties: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- Oracle Java `InetAddress` API: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/InetAddress.html
- Oracle Java Troubleshooting Guide (`JAVA_TOOL_OPTIONS`): https://docs.oracle.com/en/java/javase/22/troubleshoot/environment-variables-and-system-properties.html
- Spring Boot Common Application Properties: https://docs.spring.io/spring-boot/appendix/application-properties/

## Issues Found

1. **Runtime `System.setProperty(...)` examples were incorrect.** Oracle documents `java.net.preferIPv4Stack` and `java.net.preferIPv6Addresses` as startup-only properties that are checked once at JVM startup. Replaced the runtime mutation examples with inspection examples and updated the text to tell readers to set the properties with `-D...` at launch time.

2. **The `system` value was described too strongly.** The post said `system` uses OS address selection order and tied it directly to RFC 6724. Oracle's networking property documentation says `system` preserves the order returned by the operating system or system-wide resolver. Updated the wording to match the documented behavior and removed the RFC 6724 claim.

3. **`java.net.preferIPv4Stack=true` was overstated.** The original text said it "disables IPv6 entirely" at the JVM level. Oracle documents it as forcing IPv4-only sockets, which means the application cannot communicate with IPv6-only hosts. Updated the table, command comment, and conclusion to reflect that narrower and more accurate behavior.

4. **The Spring Boot section conflated bind address with JVM address preference.** `server.address` controls the network address the server binds to; it does not configure `java.net.preferIPv6Addresses`. Updated the section intro and the Spring Boot code sample so it reports the active JVM property instead of attempting to set it programmatically.

5. **The "Checking Effective Preference" example did not actually check address preference.** `InetAddress.getLoopbackAddress()` does not resolve `localhost`, and the `ServerSocket` bind example was more about socket binding than hostname resolution preference. Reworked the example to print `InetAddress.getAllByName(...)` results so it directly reflects the configured address ordering behavior.

## Review Notes
- The shell example using `JAVA_OPTS` is valid because the variable is expanded directly into the `java` command line, but `JAVA_OPTS` itself is a startup-script convention rather than a JVM-standard environment variable. `JAVA_TOOL_OPTIONS` is the standardized JVM-supported mechanism.
- The examples that resolve `example.com` assume the resolver returns both IPv4 and IPv6 addresses; the exact output can vary by network environment and current DNS records.
- Java was not installed in the review workspace, so the snippets were validated against official documentation rather than compiled locally.
