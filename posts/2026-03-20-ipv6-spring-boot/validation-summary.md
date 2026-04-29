# Validation Summary: How to Configure IPv6 in Spring Boot Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- IPv6
- Spring Boot
- Spring Security
- Spring WebClient
- RestTemplate
- Jakarta Servlet API
- HTTP/URI syntax

## Sources Consulted
- Spring Boot Common Application Properties: https://docs.spring.io/spring-boot/appendix/application-properties/
- Spring Boot `TomcatServletWebServerFactory` API: https://docs.spring.io/spring-boot/api/java/org/springframework/boot/web/embedded/tomcat/TomcatServletWebServerFactory.html
- Oracle Java Networking IPv6 User Guide: https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/
- Oracle `Inet6Address` API: https://docs.oracle.com/javase/8/docs/api/java/net/Inet6Address.html
- Jakarta Servlet `ServletRequest` API: https://jakarta.ee/specifications/servlet/5.0/apidocs/jakarta/servlet/servletrequest
- Spring Security `WebExpressionAuthorizationManager` API: https://docs.spring.io/spring-security/site/docs/6.0.4/api/org/springframework/security/web/access/expression/WebExpressionAuthorizationManager.html
- Spring Security `IpAddressMatcher` API: https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/util/matcher/IpAddressMatcher.html
- Spring Framework WebClient configuration reference: https://docs.spring.io/spring-framework/reference/web/webflux-webclient/client-builder.html
- Spring Framework `RestTemplate` API: https://docs.spring.io/spring-framework/docs/6.2.0/javadoc-api/org/springframework/web/client/RestTemplate.html
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986/
- Spring Boot reference documentation for forwarded headers behavior: https://docs.spring.io/spring-boot/docs/2.3.11.RELEASE/reference/htmlsingle/

## Issues Found
- The programmatic Tomcat binding example did not compile because `InetAddress.getByName("::")` throws `UnknownHostException` inside the lambda. I changed the example to resolve the address before returning the customizer and declared the checked exception on the `@Bean` method.
- The client IP example used reflection to call a non-public `Inet6Address` method and assumed Java would return IPv4-mapped IPv6 addresses. Oracle’s `Inet6Address` documentation says Java will not return IPv4-mapped addresses and converts them to `Inet4Address`. I removed that logic and kept the example to trusted proxy headers plus `request.getRemoteAddr()`.
- The proxy-header comment called `X-Forwarded-For` and `X-Real-IP` “standard” headers without any trust-boundary caveat. I changed the text to make it clear those headers should only be trusted when set by a proxy you control.
- The Spring Security example was not valid for the `authorizeHttpRequests` DSL. It attempted to pass a security expression root object to `.access(...)`, which is not what the API accepts, and it only matched IPv4 loopback for `/admin/**`. I replaced it with `WebExpressionAuthorizationManager` examples that correctly match an IPv6 subnet and both IPv4 and IPv6 loopback addresses.
- The `WebClient` example was missing the `@Service` import, so the snippet would not compile as written. I added the missing import.
- The request logging section was labeled as an interceptor but implemented a Servlet `Filter`. I corrected the heading to match the code.
- The conclusion claimed `request.getRemoteAddr()` returns IPv4-mapped addresses on dual-stack setups. That is inaccurate per the JDK documentation, so I rewrote the conclusion to describe container-reported remote addresses and trusted-proxy handling instead.

## Review Notes
- `RestTemplate` is still a valid synchronous client, but Spring Framework 6.1+ documents `RestClient` as the newer synchronous API. The post’s `RestTemplate` example remains technically correct.
- The `RestTemplateBuilder.connectTimeout(...)` and `readTimeout(...)` methods are current Spring Boot APIs, but they are the newer form introduced in recent Spring Boot 3.x releases. Older 3.x applications may still use `setConnectTimeout(...)` and `setReadTimeout(...)`.
- Binding to `::` uses the IPv6 any-local address. Whether that socket also accepts IPv4 traffic depends on dual-stack behavior, which is influenced by the JVM and OS networking configuration.
