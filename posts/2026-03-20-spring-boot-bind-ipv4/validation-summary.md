# Validation Summary: How to Configure Spring Boot to Bind to a Specific IPv4 Address

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Spring Boot embedded web server configuration
- Java system properties and executable JAR launch commands
- IPv4 bind addresses
- Spring profiles and externalized configuration
- Jakarta Servlet request APIs
- Reverse proxy client IP headers

## Sources Consulted
- Spring Boot Common Application Properties: https://docs.spring.io/spring-boot/appendix/application-properties/
- Spring Boot Externalized Configuration reference: https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Boot `SpringApplication` API documentation: https://docs.spring.io/spring-boot/api/java/org/springframework/boot/SpringApplication.html
- Spring Boot `WebApplicationType` API documentation: https://docs.spring.io/spring-boot/api/java/org/springframework/boot/WebApplicationType.html
- Oracle Java `java` command documentation: https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html
- Oracle Java networking properties documentation: https://docs.oracle.com/javase/8/docs/api/java/net/doc-files/net-properties.html
- Jakarta Servlet `HttpServletRequest` API documentation: https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservletrequest
- Jakarta Servlet `ServletRequest` API documentation: https://tomcat.apache.org/tomcat-11.0-doc/servletapi/jakarta/servlet/ServletRequest.html

## Issues Found
- The `application.properties` example described `server.address=0.0.0.0` as "all interfaces (default)". Changed the comment to "all IPv4 interfaces" because `0.0.0.0` is the IPv4 wildcard address, while Spring Boot's documented property is simply the network address to bind.
- The localhost example said it was for services behind a reverse proxy. Clarified that `127.0.0.1` is appropriate for a local reverse proxy, since remote load balancers or proxies cannot reach a process bound only to loopback.
- The controller example used `Map.of(...)` without importing `java.util.Map`. Added the missing import so the Java snippet is syntactically complete.
- The "Forcing IPv4 Stack" section incorrectly used `spring.main.web-application-type=servlet` as an IPv4 setting. Replaced it with a note that Spring Boot does not provide an application property for forcing the JVM IPv4 stack and kept the correct `-Djava.net.preferIPv4Stack=true` JVM property.
- The conclusion recommended always binding production services to `127.0.0.1` behind Nginx or a cloud load balancer. Reworded it to limit loopback binding to same-host reverse proxies and to use a reachable bind address plus network controls for cloud load balancers or other hosts/containers.

## Review Notes
The `jakarta.servlet` import is correct for current Spring Boot 3.x/4.x applications; Spring Boot 2.x applications would use the older `javax.servlet` package. When using `X-Forwarded-For`, only trust the header when it is set by a controlled proxy; Spring Boot also provides `server.forward-headers-strategy` for framework-level forwarded-header handling. Local `java --help` verification was unavailable because Java is not installed in this workspace, so Java launcher flags were checked against Oracle's official `java` command documentation.
