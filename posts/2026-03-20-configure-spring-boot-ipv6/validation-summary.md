# Validation Summary: How to Configure Spring Boot for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Spring Boot (3.x)
- Embedded Tomcat (`TomcatServletWebServerFactory`)
- Reactive Netty (`NettyReactiveWebServerFactory`, reactor-netty `HttpServer`)
- Jakarta Servlet API (`jakarta.servlet.http.HttpServletRequest`)
- Spring Web MVC CORS (`WebMvcConfigurer`, `CorsRegistry`)
- Java networking (`InetAddress`, `Inet6Address`)
- IPv6 addressing (wildcard `::`, IPv4-mapped `::ffff:0:0/96`)
- curl (`-6` flag), `ss` (Linux socket statistics)
- Maven Wrapper (`./mvnw`)

## Sources Consulted
- Spring Boot 3.x source: `org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory`
- Spring Boot 3.x source: `org.springframework.boot.web.embedded.netty.NettyReactiveWebServerFactory`
- Spring Boot `AbstractConfigurableWebServerFactory` (defines `setAddress(InetAddress)`)
- Spring Boot `ServerProperties` (defines `server.address` default as `null`)
- Spring Framework `org.springframework.web.cors.CorsConfiguration`
- Reactor Netty `reactor.netty.http.server.HttpServer` (`.host(String)`)
- Spring Boot 3.0 release notes (Jakarta EE 9 / `jakarta.*` namespace migration)
- IETF RFC 4291 (IPv6 addressing, IPv4-mapped IPv6 `::ffff:a.b.c.d`)
- IETF RFC 3986 (bracketed IPv6 host literals in URIs)

## Issues Found

1. **Wrong servlet API namespace for Spring Boot 3.x.**
   The controller imported `javax.servlet.http.HttpServletRequest`. Spring Boot 3.0+ migrated to Jakarta EE 9, so the correct package is `jakarta.servlet.http.HttpServletRequest`. `javax.servlet.*` will not resolve on a current Spring Boot 3.x application. Fixed in `posts/2026-03-20-configure-spring-boot-ipv6/README.md` (Step 4 import).

2. **Misleading claim that `server.address=0.0.0.0` is the default and includes IPv6.**
   `0.0.0.0` is the IPv4 wildcard only — it does not bind IPv6 sockets. Additionally, Spring Boot's actual default for `server.address` is `null` (unset); the embedded server then falls back to its own default (typically `0.0.0.0` on Tomcat). Updated the inline comment in the `application.properties` block and rewrote the conclusion to describe the actual default behavior and clarify that `::` is required to accept IPv6.

## Review Notes
- The `CorsRegistry.allowedOrigins("https://[2001:db8::1]")` example works because Spring's `CorsConfiguration.checkOrigin` does an exact-string `equalsIgnoreCase` match against the browser's `Origin` header, and browsers send IPv6 origins bracketed. This is correct for exact-match origins, but readers should note that for pattern matching (`allowedOriginPatterns`), the `:` characters in IPv6 addresses collide with the host:port pattern syntax — this is a Spring CORS limitation, not an error in the post.
- The `ip.startsWith("::ffff:")` + `substring(7)` normalization in Step 4 is functionally correct for the canonical lowercase form returned by Java's `InetAddress.getHostAddress()`, but could miss alternate representations. For production code, `InetAddress.getByName(ip)` followed by an `Inet6Address` check is more robust.
- The `try-with-Map.of` in `ipInfo` requires Java 9+ for `Map.of`; Spring Boot 3.x requires Java 17+, so this is fine.
- `./mvnw spring-boot:run`, `curl -6`, and `ss -lntp` are all current and correct.
- `factory.setAddress(InetAddress.getByName("::"))` correctly binds to the IPv6 wildcard via the inherited `AbstractConfigurableWebServerFactory.setAddress` method.
